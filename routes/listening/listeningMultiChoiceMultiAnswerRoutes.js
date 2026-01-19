import express from "express";


import multer from "multer";
import { 
    addQuestion, 
    getQuestions, 
    getQuestionById, 
    submitAttempt 
} from "../../controllers/listening/listeningMultiChoiceMultiAnswerController.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/add", upload.single("audio"), addQuestion);
router.get("/questions/:userId", getQuestions);
router.get("/question/:id", getQuestionById);
router.post("/submit", submitAttempt);

export default router;
