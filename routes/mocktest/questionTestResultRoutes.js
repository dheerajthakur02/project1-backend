import express from "express";
import { getUserQuestionTestResults, getQuestionTestResultById } from "../../controllers/mocktest/questionTestResultController.js";
import { authorize } from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/my", authorize(), getUserQuestionTestResults);
router.get("/:id", authorize(), getQuestionTestResultById);

export default router;
