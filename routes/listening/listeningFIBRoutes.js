import express from "express";
import { upload } from "../../middlewares/upload.js";
import {
  addListeningFIBQuestion,
  getListeningFIBQuestionsWithAttempts,
  submitListeningFIBAttempt
} from "../../controllers/listening/listeningFIBController.js";
import { checkPracticeLimit } from "../../middlewares/practiceLimitMiddleware.js";

const router = express.Router();

// Question routes
router.post("/add", upload.single("audio"), addListeningFIBQuestion);
router.get("/questions/:userId", getListeningFIBQuestionsWithAttempts);

// Attempt routes
router.post("/submit", checkPracticeLimit, submitListeningFIBAttempt);

export default router;
