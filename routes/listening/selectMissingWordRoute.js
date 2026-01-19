import express from 'express';
const router = express.Router();
import { upload } from '../../middlewares/upload.js';
import { addSelectMissingWordQuestion, getSelectMissingWordWithAttempts, submitSelectMissingWordAttempt, updateSelectMissingWordQuestion } from '../../controllers/listening/selectMissingWordController.js';



router.post('/add', upload.single('audio'), addSelectMissingWordQuestion);
router.get('/:userId', getSelectMissingWordWithAttempts);
router.put('/:id', upload.single('audio'), updateSelectMissingWordQuestion); // Partial update
router.post('/submit', upload.none(), submitSelectMissingWordAttempt);

export default router;