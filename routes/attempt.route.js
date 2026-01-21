import express from "express";
import { createAttempt, getAttempts } from "../controllers/attempt.controller.js";

import { authorize } from "../middlewares/authMiddleware.js";

import { checkPracticeLimit } from "../middlewares/practiceLimitMiddleware.js";

const router = express.Router();

router.post("/", authorize(), checkPracticeLimit, createAttempt);
router.get("/", authorize(), getAttempts);

export default router;
