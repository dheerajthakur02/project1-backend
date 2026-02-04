import express from "express";
import { createWriting, deleteWriting, getAllWriting, getWritingById, getWritingResultById, submitFullWritingMockTest, updateWriting, getUserWritingResults, getUnusedWritingQuestions } from "../../controllers/mocktest/writingController.js";
import { authorize } from "../../middlewares/authMiddleware.js";


const router = express.Router();

router.post("/", createWriting);
router.get("/", getAllWriting);
router.get("/:id", getWritingById);
router.put("/:id", updateWriting);
router.delete("/:id", deleteWriting);
import { checkPracticeLimit } from "../../middlewares/practiceLimitMiddleware.js";

router.post("/attempt", checkPracticeLimit, submitFullWritingMockTest);

// In your routes/writingRoutes.js
router.get("/result/:resultId", getWritingResultById);
router.get("/results/my", authorize(), getUserWritingResults);


router.get("/get/unused", getUnusedWritingQuestions)

export default router;
