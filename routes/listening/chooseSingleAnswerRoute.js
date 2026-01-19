import express from 'express';
const router = express.Router();
import { upload } from '../../middlewares/upload.js';
import { addChooseSingleAnswerQuestion, getChooseSingleAnswerWithAttempts, submitChooseSingleAnswerAttempt, updateChooseSingleAnswerQuestion } from '../../controllers/listening/chooseSingleAnswerController.js';


router.post('/add', upload.single('audio'), addChooseSingleAnswerQuestion);
router.get('/:userId', getChooseSingleAnswerWithAttempts);
router.put('/:id', upload.single('audio'), updateChooseSingleAnswerQuestion); // Partial update
router.post('/submit', upload.none(), submitChooseSingleAnswerAttempt);

export default router;