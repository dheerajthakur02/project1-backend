import express from 'express';
const router = express.Router();
import { submitSSTAttempt,
      createQuestion,
    getQuestionById,
    updateQuestion,
    getQuestionsWithAttempts,
 } from '../../controllers/listening/sstControllers.js';
import { upload } from '../../middlewares/upload.js';


import { checkPracticeLimit } from '../../middlewares/practiceLimitMiddleware.js';

// Question routes
router.post('/add', upload.single('audio'), createQuestion);
router.get('/questions/:userId', getQuestionsWithAttempts);
// router.get('/questions/:id', getQuestionById);
router.put('/questions/:id', upload.single('audio'), updateQuestion); // Partial update

// Submit attempt
router.post('/submit', upload.none(), checkPracticeLimit, submitSSTAttempt);

export default router;