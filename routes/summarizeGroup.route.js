import express from "express";
import { upload } from "../middlewares/upload.js";
import {
  addQuestion,
  updateQuestion,
  deleteQuestion,
  getQuestionsWithAttempts,
  createSummarizeGroupAttempt,

} from "../controllers/summarizeGroupController.js";
import { authorize } from "../middlewares/authMiddleware.js";
// import { createShortAnswerAttempt } from "../controllers/shortAnswerAttempt.controller.js";

const router = express.Router();

// router.use(authorize());

/* ================= QUESTION ROUTES ================= */

// Add short answer question
router.post("/add", upload.single("audio"), addQuestion);

// Get questions with user attempts
router.get("/get/:userId", getQuestionsWithAttempts);

// Update question
router.put("/:id", upload.single("audio"), updateQuestion);

// Delete question
router.delete("/:id", deleteQuestion);

/* ================= ATTEMPT ROUTES ================= */

// // Submit short answer attempt (student audio)
 router.post("/submit", upload.single("audio"), createSummarizeGroupAttempt);

export default router;

