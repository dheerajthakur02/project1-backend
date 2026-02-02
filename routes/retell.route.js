import express from "express";
import { upload } from "../middlewares/upload.js";
import { addRetellQuestion, createRetellAttempt, deleteRetell, getRetellLectureById, getRetellQuestionsWithAttempts, updateRetellQuestion, getAllQuestions, getCommunityAttemptsByQuestion } from "../controllers/retellController.js";
import { authorize } from "../middlewares/authMiddleware.js";
import { createRepeatAttempt } from "../controllers/attemptRepeat.controller.js";

const router = express.Router();

// router.use(authorize());
router.post("/add", upload.single("audio"), addRetellQuestion);
router.get("/all", getAllQuestions);
router.get("/get/:userId", getRetellQuestionsWithAttempts);
router.put("/:id", upload.single("audio"), updateRetellQuestion);
router.get("/:id", getRetellLectureById)
 router.delete("/:id", deleteRetell);
 router.get("/community/:questionId", getCommunityAttemptsByQuestion);

import { checkPracticeLimit } from "../middlewares/practiceLimitMiddleware.js";

//attempt routes
router.post("/submit", upload.single("audio"), checkPracticeLimit, createRetellAttempt);

export default router;



