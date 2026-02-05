import express from "express";
import multer from "multer";
import {
  addHighlightSummaryQuestion,
  getHighlightSummaryQuestions,
  addHighlightSummaryAttempt,
  getHighlightSummaryQuestionsWithAttempts ,
  updateQuestion,
  submitHCSAttempt,
  deleteQuestion,
  getHighlightSummaryCommunityAttempts
} from "../../controllers/listening/hcsControllers.js";


const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Question routes
router.post("/add", upload.single("audio"), addHighlightSummaryQuestion);
router.get("/", getHighlightSummaryQuestions);
router.get("/:questionId/community", getHighlightSummaryCommunityAttempts);

router.get("/questions/userId", getHighlightSummaryQuestions);
router.put("/questions/:id", upload.single("audio"), updateQuestion)
router.delete("/:id", deleteQuestion)
import { checkPracticeLimit } from "../../middlewares/practiceLimitMiddleware.js";

// Attempt routes
router.post("/attempts", addHighlightSummaryAttempt);
router.get("/attempts/:userId", getHighlightSummaryQuestionsWithAttempts);
router.post("/submit", upload.none(), checkPracticeLimit, submitHCSAttempt);

export default router;
