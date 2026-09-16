import User from '../models/User.js';
import Product from '../models/Product.js';

export const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist');
    return res.status(200).json({ wishlist: user.wishlist });
  } catch (err) {
    console.error(`getWishlist error: ${err.message}`);
    return res.status(500).json({ message: 'Server error while fetching wishlist' });
  }
};

export const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await User.updateOne({ _id: req.user._id }, { $addToSet: { wishlist: productId } });

    const user = await User.findById(req.user._id).populate('wishlist');
    return res.status(200).json({ wishlist: user.wishlist });
  } catch (err) {
    console.error(`addToWishlist error: ${err.message}`);

    if (err.name === 'CastError') {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.status(500).json({ message: 'Server error while updating wishlist' });
  }
};

export const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    await User.updateOne({ _id: req.user._id }, { $pull: { wishlist: productId } });

    const user = await User.findById(req.user._id).populate('wishlist');
    return res.status(200).json({ wishlist: user.wishlist });
  } catch (err) {
    console.error(`removeFromWishlist error: ${err.message}`);
    return res.status(500).json({ message: 'Server error while updating wishlist' });
  }
};
