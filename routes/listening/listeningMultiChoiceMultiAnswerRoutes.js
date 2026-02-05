import express from "express";


import multer from "multer";
import { 
    addQuestion, 
    getQuestions, 
    getQuestionById, 
    submitAttempt, 
    deleteQuestion,
    updateQuestion,
    getListeningMCMCommunityAttempts
} from "../../controllers/listening/listeningMultiChoiceMultiAnswerController.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

import { checkPracticeLimit } from "../../middlewares/practiceLimitMiddleware.js";

router.post("/add", upload.single("audio"), addQuestion);
router.get("/", getQuestions);
router.get("/questions/:userId", getQuestions);
router.get("/question/:id", getQuestionById);
router.delete("/:id", deleteQuestion)
router.post("/submit", checkPracticeLimit, submitAttempt);
router.put("/:id",upload.single("audio"), updateQuestion)
router.get("/:questionId/community", getListeningMCMCommunityAttempts)

export default router;
