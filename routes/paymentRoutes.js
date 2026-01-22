import express from "express";
import {
  createOrder,
  verifyPayment,
  getRazorpayKey,
} from "../controllers/payment.controller.js";
import { authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/create-order", authorize(), createOrder);
router.post("/verify-payment", authorize(), verifyPayment);
router.get("/get-key", authorize(), getRazorpayKey);

export default router;
