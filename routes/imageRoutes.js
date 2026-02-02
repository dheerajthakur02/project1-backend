import express from 'express';

import { upload } from '../middlewares/upload.js';
import { createImageAttempt, createQuestion, getImageQuestionsWithAttempts, getAllQuestions, getQuestionById, updateQuestion, deleteQuestion, getCommunityImageAttemptsByQuestion } from '../controllers/imageController.js';


const router = express.Router();

// Question Management
router.post('/questions',upload.single('image'), createQuestion);
router.get('/all', getAllQuestions);
router.get('/questions/:userId', getImageQuestionsWithAttempts);
router.get('/questions/:id', getQuestionById);
router.put('/questions/:id',upload.single('image'), updateQuestion);
router.delete('/questions/:id', deleteQuestion);
router.get("/community/:questionId", getCommunityImageAttemptsByQuestion)

import { checkPracticeLimit } from '../middlewares/practiceLimitMiddleware.js';

// Attempt Submission (Handling Audio Upload)
router.post('/attempts', upload.single('audio'), checkPracticeLimit, createImageAttempt);

export default router;
