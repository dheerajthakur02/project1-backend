import express from "express";
import { upload } from "../middlewares/upload.js";
import { addRetellQuestion, createRetellAttempt, getRetellQuestionsWithAttempts, updateRetellQuestion } from "../controllers/retellController.js";
import { authorize } from "../middlewares/authMiddleware.js";
import { createRepeatAttempt } from "../controllers/attemptRepeat.controller.js";

const router = express.Router();

// router.use(authorize());
router.post("/add", upload.single("audio"), addRetellQuestion);
router.get("/get/:userId", getRetellQuestionsWithAttempts);
router.put("/:id", upload.single("audio"), updateRetellQuestion);
// router.delete("/:id", deleteQuestion);

//attempt routes
router.post("/submit", upload.single("audio"), createRetellAttempt);

export default router;



