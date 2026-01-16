import express from "express";


import { createSummarizeTextQuestion, getSummarizeTextQuestionsWithAttempts, submitSummarizeWrittenAttempt } from "../../controllers/writing/summarizeTextControllers.js";

const router = express.Router();

router.post("/add",  createSummarizeTextQuestion);
router.post("/submit",  submitSummarizeWrittenAttempt);
router.get("/get/:userId",  getSummarizeTextQuestionsWithAttempts);

export default router;
