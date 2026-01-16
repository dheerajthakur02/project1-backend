import express from "express";
import { addQuestion, getQuestions, getQuestionById, submitAttempt } from "../controllers/readingFIBDropdown.controller.js";

const router = express.Router();

router.post("/add", addQuestion);
router.get("/get/:userId", getQuestions); // To get list with status
router.get("/:id", getQuestionById);
router.post("/submit", submitAttempt);

export default router;
