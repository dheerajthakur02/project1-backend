import Razorpay from "razorpay";
import crypto from "crypto";
import VoucherOrder from "../models/voucherOrder.model.js";
import User from "../models/user.model.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ✅ Create Voucher Order (Email-Free)
export const createVoucherOrder = async (req, res) => {
  try {
    const { quantity } = req.body;
    const userId = req.user._id || req.user.id;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ success: false, message: "Invalid quantity" });
    }

    // Price Logic: 15999 INR per voucher (inclusive of tax)
    const UNIT_PRICE = 15999;
    const totalAmount = quantity * UNIT_PRICE;

    const options = {
      amount: totalAmount * 100, // Razorpay expects amount in paise
      currency: "INR",
      receipt: `voucher_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    // Create temporary record
    const newOrder = new VoucherOrder({
      user: userId,
      quantity,
      amount: totalAmount,
      razorpay_order_id: order.id,
      status: "pending"
    });

    await newOrder.save();

    res.status(200).json({
      success: true,
      order,
      key: process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {
    console.error("Error creating voucher order:", error);
    res.status(500).json({ success: false, message: "Failed to create order" });
  }
};

// ✅ Verify Voucher Payment (Email-Free)
export const verifyVoucherPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const userId = req.user._id || req.user.id;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      // 1. Update Order Status
      const order = await VoucherOrder.findOneAndUpdate(
        { razorpay_order_id },
        { 
          status: "completed",
          razorpay_payment_id
        },
        { new: true }
      );

      if (!order) {
          return res.status(404).json({ success: false, message: "Order not found" });
      }

      // 2. Add Vouchers to User Account
      await User.findByIdAndUpdate(userId, {
        $inc: { vouchersOwned: order.quantity }
      });
      
      // NOTE: No email is sent here as requested.

      res.status(200).json({
        success: true,
        message: "Payment successful. Vouchers added to your account."
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid signature"
      });
    }
  } catch (error) {
    console.error("Error verifying voucher payment:", error);
    res.status(500).json({
      success: false,
      message: "Payment verification failed"
    });
  }
};

// ✅ Get Voucher History
export const getVoucherHistory = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const history = await VoucherOrder.find({ user: userId }).sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error("Error fetching voucher history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch history"
    });
  }
};

// ✅ Get All Voucher Orders (Admin)
export const getAllVoucherOrders = async (req, res) => {
  try {
    const orders = await VoucherOrder.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch voucher orders" });
  }
};
