import express from "express";

import { createEssayQuestion, getWriteEssayQuestionsWithAttempts, submitEssayAttempt } from "../../controllers/writing/essayController.js";

const router = express.Router();

import { checkPracticeLimit } from "../../middlewares/practiceLimitMiddleware.js";

router.post("/add",  createEssayQuestion);
router.post("/submit", checkPracticeLimit, submitEssayAttempt);
router.get("/get/:userId",  getWriteEssayQuestionsWithAttempts);

export default router;
