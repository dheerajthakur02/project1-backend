import express from "express";

import { createEssayQuestion, getWriteEssayQuestionsWithAttempts, submitEssayAttempt } from "../../controllers/writing/essayController.js";

const router = express.Router();

router.post("/add",  createEssayQuestion);
router.post("/submit",  submitEssayAttempt);
router.get("/get/:userId",  getWriteEssayQuestionsWithAttempts);

export default router;
