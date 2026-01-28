import express from "express";


import { createSummarizeTextQuestion, deleteSummarizeTextQuestion, getSummarizeTextQuestionsWithAttempts, submitSummarizeWrittenAttempt, updateSummarizeTextQuestion } from "../../controllers/writing/summarizeTextControllers.js";

const router = express.Router();

import { checkPracticeLimit } from "../../middlewares/practiceLimitMiddleware.js";

router.post("/add",  createSummarizeTextQuestion);
router.put("/:id", updateSummarizeTextQuestion)
router.delete("/:id", deleteSummarizeTextQuestion)
router.post("/submit", checkPracticeLimit, submitSummarizeWrittenAttempt);
router.get("/get/:userId",  getSummarizeTextQuestionsWithAttempts);

export default router;
