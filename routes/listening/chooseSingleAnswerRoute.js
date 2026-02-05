import express from 'express';
const router = express.Router();
import { upload } from '../../middlewares/upload.js';
import { addChooseSingleAnswerQuestion, deleteChooseSingleAnswerQuestion, getChooseSingleAnswerWithAttempts, getCommunityAttempts, submitChooseSingleAnswerAttempt, updateChooseSingleAnswerQuestion } from '../../controllers/listening/chooseSingleAnswerController.js';


import { checkPracticeLimit } from '../../middlewares/practiceLimitMiddleware.js';

router.post('/add', upload.single('audio'), addChooseSingleAnswerQuestion);
router.get("/", getChooseSingleAnswerWithAttempts);
router.get("/:questionId/community", getCommunityAttempts);
router.get('/:userId', getChooseSingleAnswerWithAttempts);
router.put('/:id', upload.single('audio'), updateChooseSingleAnswerQuestion); // Partial update
router.post('/submit', upload.none(), checkPracticeLimit, submitChooseSingleAnswerAttempt);
router.delete("/:id",deleteChooseSingleAnswerQuestion)

export default router;