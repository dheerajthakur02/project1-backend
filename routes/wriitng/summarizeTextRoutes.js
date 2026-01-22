import express from "express";


import { createSummarizeTextQuestion, getSummarizeTextQuestionsWithAttempts, submitSummarizeWrittenAttempt } from "../../controllers/writing/summarizeTextControllers.js";

const router = express.Router();

import { checkPracticeLimit } from "../../middlewares/practiceLimitMiddleware.js";

router.post("/add",  createSummarizeTextQuestion);
router.post("/submit", checkPracticeLimit, submitSummarizeWrittenAttempt);
router.get("/get/:userId",  getSummarizeTextQuestionsWithAttempts);

export default router;
