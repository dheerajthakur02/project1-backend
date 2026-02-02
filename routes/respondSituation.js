import express from "express";
import { upload } from "../middlewares/upload.js";
import { authorize } from "../middlewares/authMiddleware.js";
import { addRespondSituationQuestion, createRespondSituationAttempt, deleteRespondSituationQuestion, getCommunityRespondSituationAttemptsByQuestion, getRespondSituationQuestionsWithAttempts, updateRespondSituationQuestion } from "../controllers/respondSituationController.js";
const router = express.Router();

// router.use(authorize());
router.post("/add", upload.single("audio"), addRespondSituationQuestion);
router.get("/get/:userId", getRespondSituationQuestionsWithAttempts);
router.put("/:id", upload.single("audio"), updateRespondSituationQuestion);
 router.delete("/:id", deleteRespondSituationQuestion);
router.get("/community/:questionId", getCommunityRespondSituationAttemptsByQuestion)
import { checkPracticeLimit } from "../middlewares/practiceLimitMiddleware.js";

//attempt routes
router.post("/submit", upload.single("audio"), checkPracticeLimit, createRespondSituationAttempt);

export default router;



