import express from "express";
import {
  addQuestion,
  getQuestions,
  getQuestionById,
  submitAttempt,
  getAttempts,
  getAll,
} from "../controllers/readingFIBDragDrop.controller.js";
import { authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/add", addQuestion);
router.get("/get/:userId", getQuestions);
router.get("/:id", getQuestionById);
router.post("/submit", submitAttempt);
router.get("/attempts/all", getAll);
router.get("/attempts/:questionId", authorize(), getAttempts);

export default router;
