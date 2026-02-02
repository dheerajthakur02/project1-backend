import express from "express";
import { upload } from "../middlewares/upload.js";
import {
  addQuestion,
  updateQuestion,
  deleteQuestion,
  getQuestionsWithAttempts,
  createShortAnswerAttempt,
  getAllQuestions,
  getCommunityShortAnswerAttemptsByQuestion,
} from "../controllers/shortAnswerController.js";
import { authorize } from "../middlewares/authMiddleware.js";
// import { createShortAnswerAttempt } from "../controllers/shortAnswerAttempt.controller.js";

const router = express.Router();

// router.use(authorize());

/* ================= QUESTION ROUTES ================= */

// Add short answer question
router.post("/add", upload.single("audio"), addQuestion);

// Get questions with user attempts
router.get("/all", getAllQuestions);
router.get("/get/:userId", getQuestionsWithAttempts);

// Update question
router.put("/:id", upload.single("audio"), updateQuestion);

// Delete question
router.delete("/:id", deleteQuestion);
router.get("/community/:questionId", getCommunityShortAnswerAttemptsByQuestion);

/* ================= ATTEMPT ROUTES ================= */

import { checkPracticeLimit } from "../middlewares/practiceLimitMiddleware.js";

// // Submit short answer attempt (student audio)
router.post("/submit", upload.single("audio"), checkPracticeLimit, createShortAnswerAttempt);

export default router;

