import express from "express";
import { createAttempt, getAttempts, getAttemptsforCommunity } from "../controllers/attempt.controller.js";

import { authorize } from "../middlewares/authMiddleware.js";

import { checkPracticeLimit } from "../middlewares/practiceLimitMiddleware.js";

const router = express.Router();

router.post("/", authorize(), checkPracticeLimit, createAttempt);
router.get("/history/:paragraphId", authorize(), getAttempts);
router.get("/community/:paragraphId",  getAttemptsforCommunity);

export default router;
