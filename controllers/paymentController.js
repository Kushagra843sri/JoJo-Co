import crypto from 'crypto';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { sendNewOrderNotificationEmail } from '../utils/sendEmail.js';

const RAZORPAY_ORDERS_URL = 'https://api.razorpay.com/v1/orders';

// Placeholder business rules — replace with real tax-slab / shipping logic when defined.
const TAX_RATE = 0.05;
const SHIPPING_FEE = 0;

export const initializePayment = async (req, res) => {
  let createdOrder;

  try {
    const { items, customerPhone, shippingAddress } = req.body;

    // Real money and a real shipping commitment happen past this point — this
    // is the one place in the app where an unverified/throwaway email actually
    // matters, so it's the one place gated on it (login/browsing stay open).
    if (!req.user.emailVerified) {
      return res.status(403).json({
        message: 'Please verify your email before placing an order. Check your inbox, or resend the link from your account page.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }
    if (!customerPhone) {
      return res.status(400).json({ message: 'customerPhone is required to initialize payment' });
    }
    if (!shippingAddress?.fullName) {
      return res.status(400).json({ message: 'Shipping full name is required' });
    }

    const productIds = items.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return res.status(400).json({ message: `Product ${item.productId} not found` });
      }

      const variant = product.variants.find((v) => v.size === item.size && v.color === item.color);
      if (!variant) {
        return res.status(400).json({ message: `Variant not available for ${product.title}` });
      }

      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({ message: `Invalid quantity for ${product.title}` });
      }

      if (variant.stock < quantity) {
        return res.status(400).json({
          message: `Only ${variant.stock} left in stock for ${product.title} (${item.size}/${item.color})`,
        });
      }

      // Price always comes from the DB record we just fetched — the frontend's
      // cart payload is never trusted for money-affecting values.
      const unitPrice = product.salePrice != null ? product.salePrice : product.basePrice;
      subtotal += unitPrice * quantity;

      orderItems.push({
        product: product._id,
        variant: { size: variant.size, color: variant.color, sku: variant.sku },
        quantity,
        priceAtPurchase: unitPrice,
      });
    }

    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const shipping = SHIPPING_FEE;
    const totalAmount = Math.round((subtotal + tax + shipping) * 100) / 100;

    // Razorpay's Orders API assigns its own order id (unlike Cashfree, which
    // accepted a self-generated one) — so the gateway call has to happen
    // before the local Order document can be created with it. `receipt` is
    // just our own correlation reference on Razorpay's side, capped at 40 chars.
    const receipt = `rcpt_${crypto.randomUUID().replace(/-/g, '')}`.slice(0, 40);
    // Razorpay wants the amount as an integer in the smallest currency unit (paise).
    const amountInPaise = Math.round(totalAmount * 100);

    const razorpayResponse = await fetch(RAZORPAY_ORDERS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(
          `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
        ).toString('base64')}`,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt,
        notes: { userId: req.user._id.toString() },
      }),
    });

    const razorpayData = await razorpayResponse.json();

    if (!razorpayResponse.ok || !razorpayData.id) {
      console.error('Razorpay order creation failed:', razorpayData);
      return res.status(502).json({ message: 'Payment gateway initialization failed' });
    }

    createdOrder = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress: { ...shippingAddress, phone: customerPhone },
      financialSummary: { subtotal, shipping, tax, totalAmount },
      razorpayOrderId: razorpayData.id,
      paymentStatus: 'pending',
    });

    return res.status(201).json({
      razorpayOrderId: razorpayData.id,
      amount: amountInPaise,
      currency: 'INR',
      // The key ID is the public half of the credential pair (Razorpay's
      // equivalent of a publishable key) — safe to hand to the browser so it
      // can open the Checkout widget. The key SECRET never leaves the backend.
      keyId: process.env.RAZORPAY_KEY_ID,
      customer: {
        name: shippingAddress.fullName,
        email: req.user.email,
        phone: customerPhone,
      },
      order: {
        orderId: createdOrder.razorpayOrderId,
        subtotal,
        shipping,
        tax,
        totalAmount,
      },
    });
  } catch (err) {
    console.error(`initializePayment error: ${err.message}`);

    if (createdOrder) {
      await Order.deleteOne({ _id: createdOrder._id }).catch(() => {});
    }

    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }

    return res.status(500).json({ message: 'Server error while initializing payment' });
  }
};

export const handleRazorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.body;

    if (!signature || !rawBody) {
      return res.status(400).json({ message: 'Missing webhook signature or payload' });
    }

    const rawBodyString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);

    // Signed with the Webhook Secret set in Razorpay Dashboard > Settings >
    // Webhooks when the webhook was created — a different credential from
    // RAZORPAY_KEY_SECRET, and a plain hex HMAC of the raw body (no
    // timestamp prefix, unlike Cashfree's scheme).
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBodyString)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('Razorpay webhook signature verification failed');
      return res.status(401).json({ message: 'Invalid webhook signature' });
    }

    const payload = JSON.parse(rawBodyString);
    const eventType = payload?.event || 'UNKNOWN_EVENT';
    const paymentEntity = payload?.payload?.payment?.entity;
    const razorpayOrderId = paymentEntity?.order_id;

    if (!razorpayOrderId) {
      return res.status(400).json({ message: 'Malformed webhook payload' });
    }

    const order = await Order.findOne({ razorpayOrderId });

    if (!order) {
      console.error(`Razorpay webhook received for unknown order: ${razorpayOrderId}`);
      return res.status(404).json({ message: 'Order not found' });
    }

    // Stock is only ever decremented here, on confirmed payment — not at checkout
    // initiation — so an abandoned/failed payment never leaves stock reserved.
    // Known trade-off: under high concurrency two shoppers could both pass the
    // availability check in initializePayment before either one's webhook lands,
    // which can drive stock negative here. That's treated as a backorder signal
    // for the admin to act on rather than a reason to reject an already-captured payment.
    const isNewlyPaid = eventType === 'payment.captured' && order.paymentStatus !== 'paid';

    if (eventType === 'payment.captured') {
      if (isNewlyPaid) {
        for (const item of order.items) {
          const result = await Product.updateOne(
            { _id: item.product, variants: { $elemMatch: { size: item.variant.size, color: item.variant.color } } },
            { $inc: { 'variants.$[v].stock': -item.quantity } },
            { arrayFilters: [{ 'v.size': item.variant.size, 'v.color': item.variant.color }] }
          );
          if (result.matchedCount === 0) {
            console.error(
              `Stock decrement failed — no matching variant for product ${item.product} (${item.variant.size}/${item.variant.color}) on order ${razorpayOrderId}`
            );
          }
        }
      }
      order.paymentStatus = 'paid';
      order.razorpayPaymentId = paymentEntity.id;
    } else if (eventType === 'payment.failed') {
      order.paymentStatus = 'failed';
    }

    order.webhookLogs.push({ event: eventType, payload });
    await order.save();

    if (isNewlyPaid) {
      // Fire-and-forget, and deliberately re-fetched rather than populated in
      // place on `order` above — populating a ref path on a document you're
      // about to .save() risks Mongoose re-casting the populated subdocs back
      // through the ObjectId path. A fresh read has no such risk, and a failed
      // notification email should never affect webhook processing.
      Order.findById(order._id)
        .populate('items.product', 'title')
        .then((populatedOrder) => populatedOrder && sendNewOrderNotificationEmail(populatedOrder))
        .catch((err) => console.error(`Failed to load order for notification email: ${err.message}`));
    }

    return res.status(200).json({ message: 'Webhook processed' });
  } catch (err) {
    console.error(`handleRazorpayWebhook error: ${err.message}`);
    return res.status(500).json({ message: 'Webhook processing failed' });
  }
};
