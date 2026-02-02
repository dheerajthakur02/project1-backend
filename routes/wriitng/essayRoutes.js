import express from "express";

import { createEssayQuestion, deleteEssayQuestion, getWriteEssayQuestionsWithAttempts, submitEssayAttempt, updateEssayQuestion, getAllQuestions, getWriteEssayQuestionsWithCommunityAttempts } from "../../controllers/writing/essayController.js";

const router = express.Router();

import { checkPracticeLimit } from "../../middlewares/practiceLimitMiddleware.js";

router.post("/add",  createEssayQuestion);
router.post("/submit", checkPracticeLimit, submitEssayAttempt);
router.get("/all", getAllQuestions);
router.get("/get/:userId",  getWriteEssayQuestionsWithAttempts);
router.put("/:id",updateEssayQuestion)
router.delete("/:id",deleteEssayQuestion)
router.get("/community/:questionId", getWriteEssayQuestionsWithCommunityAttempts)
export default router;
