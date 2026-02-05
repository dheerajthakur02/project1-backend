import express from 'express';
const router = express.Router();
import { upload } from '../../middlewares/upload.js';
import { addSelectMissingWordQuestion, deleteQuestion, getSelectMissingWordCommunityAttempts, getSelectMissingWordWithAttempts, submitSelectMissingWordAttempt, updateSelectMissingWordQuestion } from '../../controllers/listening/selectMissingWordController.js';



import { checkPracticeLimit } from '../../middlewares/practiceLimitMiddleware.js';

router.post('/add', upload.single('audio'), addSelectMissingWordQuestion);
router.get("/", getSelectMissingWordWithAttempts);
router.get("/:questionId/community", getSelectMissingWordCommunityAttempts);
router.get('/:userId', getSelectMissingWordWithAttempts);
router.put('/:id', upload.single('audio'), updateSelectMissingWordQuestion); // Partial update
router.delete('/:id', deleteQuestion)
router.post('/submit', upload.none(), checkPracticeLimit, submitSelectMissingWordAttempt);

export default router;