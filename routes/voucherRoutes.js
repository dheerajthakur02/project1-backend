import express from "express";
import { createVoucherOrder, verifyVoucherPayment, getVoucherHistory } from "../controllers/voucherController.js";
import { authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/create-order", authorize(), createVoucherOrder);
router.post("/verify-payment", authorize(), verifyVoucherPayment);
router.get("/history", authorize(), getVoucherHistory);

export default router;
