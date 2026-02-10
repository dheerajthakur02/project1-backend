import express from "express";
import {
  addQuestion,
  getQuestions,
  getQuestionById,
  submitAttempt,
  getAttempts,
  getAll,
  getCommunityAttempts,
  deleteQuestion,
} from "../controllers/readingFIBDragDrop.controller.js";
import { authorize } from "../middlewares/authMiddleware.js";

import { checkPracticeLimit } from "../middlewares/practiceLimitMiddleware.js";


const router = express.Router();

router.post("/add", addQuestion);
router.get("/", getQuestions);
router.get("/get/:userId", getQuestions);
router.get("/:id", getQuestionById);
router.post("/submit", authorize(), checkPracticeLimit, submitAttempt);
router.get("/attempts/all", getAll);
router.get("/attempts/:questionId", authorize(), getAttempts);
router.get("/:questionId/community", getCommunityAttempts)
router.delete("/:id", deleteQuestion)
export default router;
