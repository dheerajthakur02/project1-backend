import express from "express";
import { upload } from "../../middlewares/upload.js";
import {
  createQuestion,
  getQuestions,
  submitAttempt,
  getAttempts
} from "../../controllers/listening/writeFromDictationController.js";

import { checkPracticeLimit } from "../../middlewares/practiceLimitMiddleware.js";

const router = express.Router();

// Admin creates question
router.post("/create", upload.single("audio"), createQuestion);

// Get all questions
router.get("/questions/:userId", getQuestions);

// Submit attempt
router.post("/submit", checkPracticeLimit, submitAttempt);

// Get attempts for a question
router.get("/attempts/:questionId", getAttempts);

export default router;
