import express from "express";
import { upload } from "../../middlewares/upload.js";
import {
  addListeningFIBQuestion,
  getListeningFIBQuestionsWithAttempts,
  submitListeningFIBAttempt
} from "../../controllers/listening/listeningFIBController.js";

const router = express.Router();

// Question routes
router.post("/add", upload.single("audio"), addListeningFIBQuestion);
router.get("/questions/:userId", getListeningFIBQuestionsWithAttempts);

// Attempt routes
router.post("/submit", submitListeningFIBAttempt);

export default router;
