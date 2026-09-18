import Order from '../models/Order.js';

export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('items.product', 'title images');

    return res.status(200).json({ orders });
  } catch (err) {
    console.error(`getMyOrders error: ${err.message}`);
    return res.status(500).json({ message: 'Server error while fetching your orders' });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .populate('user', 'name email')
      .populate('items.product', 'title images');

    return res.status(200).json({ orders });
  } catch (err) {
    console.error(`getAllOrders error: ${err.message}`);
    return res.status(500).json({ message: 'Server error while fetching orders' });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid fulfillment status: ${status}` });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { fulfillmentStatus: status },
      { new: true, runValidators: true }
    )
      .populate('user', 'name email')
      .populate('items.product', 'title images');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    return res.status(200).json(order);
  } catch (err) {
    console.error(`updateOrderStatus error: ${err.message}`);

    if (err.name === 'CastError') {
      return res.status(404).json({ message: 'Order not found' });
    }

    return res.status(500).json({ message: 'Server error while updating order status' });
  }
};
