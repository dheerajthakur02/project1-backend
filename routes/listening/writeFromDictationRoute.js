import express from "express";
import { upload } from "../../middlewares/upload.js";
import {
  createQuestion,
  getQuestions,
  submitAttempt,
  getAttempts
} from "../../controllers/listening/writeFromDictationController.js";

const router = express.Router();

router.post("/add", upload.single("audio"), createQuestion);
router.get("/questions/:userId", getQuestions);
router.post("/submit", submitAttempt);
router.get("/attempts/:questionId", getAttempts);

export default router;
