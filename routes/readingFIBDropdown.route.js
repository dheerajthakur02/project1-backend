import express from "express";
import {
  addQuestion,
  getQuestions,
  getQuestionById,
  submitAttempt,
  getAttempts,
  getAll,
  updateQuestion,
  deleteQuestion,
  getCommunityAttempts,
} from "../controllers/readingFIBDropdown.controller.js";
import { authorize } from "../middlewares/authMiddleware.js"; // Assuming you have an auth middleware

import { checkPracticeLimit } from "../middlewares/practiceLimitMiddleware.js";

const router = express.Router();

router.post("/add", addQuestion);
router.get("/", getQuestions);
router.get("/get/:userId", getQuestions); // To get list with status
router.get("/:id", getQuestionById);
router.post("/submit", checkPracticeLimit, submitAttempt);
router.get("/attempts/all", getAll);
router.put("/:id", updateQuestion)
router.get("/attempts/:questionId", authorize(), getAttempts); // New route for attempts history
router.delete("/:id", deleteQuestion)
router.get("/:questionId/community",getCommunityAttempts)

export default router;
