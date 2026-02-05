import express from "express";
import { upload } from "../../middlewares/upload.js";
import {
  createQuestion,
  getQuestions,
  submitAttempt,
  getAttempts,
  deleteQuestion,
  updateQuestion,
  getWriteFromDictationCommunityAttempts
} from "../../controllers/listening/writeFromDictationController.js";

import { checkPracticeLimit } from "../../middlewares/practiceLimitMiddleware.js";

const router = express.Router();

// Admin creates question
router.post("/create", upload.single("audio"), createQuestion);

// Get all questions
router.get("/", getQuestions);
router.get("/:questionId/community", getWriteFromDictationCommunityAttempts);
router.get("/questions/:userId", getQuestions);

// Submit attempt
router.post("/submit", checkPracticeLimit, submitAttempt);

router.delete("/:id", deleteQuestion)

// Get attempts for a question
router.get("/attempts/:questionId", getAttempts);

router.put("/:id", upload.single("audio"), updateQuestion)

export default router;
