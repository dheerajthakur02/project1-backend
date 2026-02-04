import Razorpay from "razorpay";
import crypto from "crypto";
import User from "../models/user.model.js";

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createOrder = async (req, res) => {
  try {
    const { amount, currency = "INR" } = req.body;

    const options = {
      amount: amount * 100, // amount in smallest currency unit (paise)
      currency,
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong while creating order",
    });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planType, amount } = req.body;
    const userId = req.user.id; // Corrected from req.user.userId

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      // Payment verified
      let subscriptionDays = 0;
      if (planType === "7 Days") subscriptionDays = 7;
      else if (planType === "15 Days") subscriptionDays = 15;
      else if (planType === "30 Days") subscriptionDays = 30;
      else if (planType === "60 Days") subscriptionDays = 60;

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + subscriptionDays);

      await User.findByIdAndUpdate(userId, {
        isPremium: true,
        planType,
        subscriptionExpiry: expiryDate,
        paymentId: razorpay_payment_id,
      });

      res.status(200).json({
        success: true,
        message: "Payment verified and subscription activated",
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid signature",
      });
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong while verifying payment",
    });
  }
};

export const getRazorpayKey = async (req, res) => {
  res.status(200).json({ key: process.env.RAZORPAY_KEY_ID });
};
