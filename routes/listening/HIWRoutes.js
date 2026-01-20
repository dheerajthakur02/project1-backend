import express from 'express';
const router = express.Router();
import { upload } from '../../middlewares/upload.js';
import { addHighlightSummaryQuestion } from '../../controllers/listening/hcsControllers.js';
import { createHIWQuestion, getHIWQuestions, submitHIWAttempt, updateHIWQuestion } from '../../controllers/listening/HIWController.js';



router.post('/add', upload.single('audio'), createHIWQuestion);
router.get('/:userId', getHIWQuestions);
router.put('/:id', upload.single('audio'), updateHIWQuestion); // Partial update
router.post('/submit', upload.none(), submitHIWAttempt);

export default router;