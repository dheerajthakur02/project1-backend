import express from "express";
import { createVoucherOrder, verifyVoucherPayment, getVoucherHistory, getAllVoucherOrders } from "../controllers/voucherController.js";
import { authorize } from "../middlewares/authMiddleware.js";
import { authorizeAdmin } from "../middlewares/adminMiddleware.js";

const router = express.Router();

router.post("/create-order", authorize(), createVoucherOrder);
router.post("/verify-payment", authorize(), verifyVoucherPayment);
router.get("/history", authorize(), getVoucherHistory);
router.get("/all-orders", authorize(), authorizeAdmin(), getAllVoucherOrders);

export default router;
