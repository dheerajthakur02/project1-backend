import express from "express";
import {
  addQuestion,
  getQuestions,
  getQuestionById,
  submitAttempt,
  getAttempts,
  getAll,
} from "../controllers/readingFIBDropdown.controller.js";
import { authorize } from "../middlewares/authMiddleware.js"; // Assuming you have an auth middleware

import { checkPracticeLimit } from "../middlewares/practiceLimitMiddleware.js";

const router = express.Router();

router.post("/add", addQuestion);
router.get("/get/:userId", getQuestions); // To get list with status
router.get("/:id", getQuestionById);
router.post("/submit", checkPracticeLimit, submitAttempt);
router.get("/attempts/all", getAll);
router.get("/attempts/:questionId", authorize(), getAttempts); // New route for attempts history

export default router;
