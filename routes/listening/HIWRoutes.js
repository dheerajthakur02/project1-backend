import express from 'express';
const router = express.Router();
import { upload } from '../../middlewares/upload.js';
import { addHighlightSummaryQuestion } from '../../controllers/listening/hcsControllers.js';
import { createHIWQuestion, deleteQuestion, getCommunityAttempts, getHIWQuestions, submitHIWAttempt, updateHIWQuestion } from '../../controllers/listening/HIWController.js';



import { checkPracticeLimit } from '../../middlewares/practiceLimitMiddleware.js';

router.post('/add', upload.single('audio'), createHIWQuestion);
router.get("/", getHIWQuestions);
router.get("/:questionId/community", getCommunityAttempts);
router.get('/:userId', getHIWQuestions);
router.delete("/:id", deleteQuestion)

router.put('/:id', upload.single('audio'), updateHIWQuestion); // Partial update
router.post('/submit', upload.none(), checkPracticeLimit, submitHIWAttempt);

export default router;