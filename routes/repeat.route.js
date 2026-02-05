import express from "express";
import { upload } from "../middlewares/upload.js";
import {
  addQuestion,
  getAllQuestions,
  updateQuestion,
  deleteQuestion,
  getQuestionsWithAttempts,
  getCommunityAttempts,
} from "../controllers/repeatSentence.controller.js";
import { authorize } from "../middlewares/authMiddleware.js";
import { createRepeatAttempt } from "../controllers/attemptRepeat.controller.js";

const router = express.Router();

// router.use(authorize());
router.post("/add", upload.single("audio"), addQuestion);
router.get("/all", getAllQuestions);
router.get("/get/:userId", getQuestionsWithAttempts);
router.put("/:id", upload.single("audio"), updateQuestion);
router.delete("/:id", deleteQuestion);
router.get("/community/:questionId", getCommunityAttempts)

import { checkPracticeLimit } from "../middlewares/practiceLimitMiddleware.js";

//attempt routes
router.post("/submit", upload.single("audio"), checkPracticeLimit, createRepeatAttempt);

export default router;



