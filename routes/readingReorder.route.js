import express from "express";
import {
  addQuestion,
  getQuestions,
  getQuestionById,
  submitAttempt,
  getAttempts,
} from "../controllers/readingReorder.controller.js";
import { authorize } from "../middlewares/authMiddleware.js";

import { checkPracticeLimit } from "../middlewares/practiceLimitMiddleware.js";

const router = express.Router();

router.post("/add", addQuestion);
router.get("/get/:userId", getQuestions);
router.get("/:id", getQuestionById);
router.post("/submit", checkPracticeLimit, submitAttempt);
router.get("/attempts/:questionId", authorize(), getAttempts);

export default router;
