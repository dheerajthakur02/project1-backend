import express from "express";


import { createSummarizeTextQuestion, deleteSummarizeTextQuestion, getSummarizeTextQuestionsWithAttempts, submitSummarizeWrittenAttempt, updateSummarizeTextQuestion, getAllQuestions, getSummarizeTextQuestionsWithCommunityAttempts } from "../../controllers/writing/summarizeTextControllers.js";

const router = express.Router();

import { checkPracticeLimit } from "../../middlewares/practiceLimitMiddleware.js";

router.post("/add",  createSummarizeTextQuestion);
router.put("/:id", updateSummarizeTextQuestion)
router.delete("/:id", deleteSummarizeTextQuestion)
router.post("/submit", checkPracticeLimit, submitSummarizeWrittenAttempt);
router.get("/all", getAllQuestions);
router.get("/get/:userId",  getSummarizeTextQuestionsWithAttempts);
router.get("/community/:questionId", getSummarizeTextQuestionsWithCommunityAttempts)

export default router;
