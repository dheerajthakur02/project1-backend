import express from "express";
import { upload } from "../../middlewares/upload.js";
import {
  addListeningFIBQuestion,
  deleteQuestion,
  getListeningFIBCommunityAttempts,
  getListeningFIBQuestionsWithAttempts,
  submitListeningFIBAttempt,
  updateListeningFIBQuestion
} from "../../controllers/listening/listeningFIBController.js";
import { checkPracticeLimit } from "../../middlewares/practiceLimitMiddleware.js";

const router = express.Router();

// Question routes
router.post("/add", upload.single("audio"), addListeningFIBQuestion);
router.get("/", getListeningFIBQuestionsWithAttempts);
router.get("/questions/:userId", getListeningFIBQuestionsWithAttempts);
router.get("/:questionId/community", getListeningFIBCommunityAttempts);
router.put("/:id", upload.single("audio"),updateListeningFIBQuestion)
router.delete("/:id", deleteQuestion)

// Attempt routes
router.post("/submit", checkPracticeLimit, submitListeningFIBAttempt);

export default router;
