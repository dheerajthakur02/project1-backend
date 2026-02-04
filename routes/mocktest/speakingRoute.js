import express from "express";
import { calculateSpeakingResult, createSpeaking, getAllSpeaking, getSpeakingById, updateSpeaking, getUserSpeakingResults, getSpeakingResultById, getUnusedSpeakingQuestions, deleteQuestion } from "../../controllers/mocktest/speakingController.js";
import { authorize } from "../../middlewares/authMiddleware.js";



const router = express.Router();
router.post("/", createSpeaking);
 router.get("/", getAllSpeaking);
router.get("/:id", getSpeakingById);
router.put("/:id", updateSpeaking);

import { checkPracticeLimit } from "../../middlewares/practiceLimitMiddleware.js";

router.post("/calculate-result", checkPracticeLimit, calculateSpeakingResult);
router.get("/results/my", authorize(), getUserSpeakingResults);
router.get("/result/:id", getSpeakingResultById);

router.get("/get/unused", getUnusedSpeakingQuestions)


router.delete("/:id", deleteQuestion)

export default router;
