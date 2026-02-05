import express from "express";
import {
  createReadAloud,
  getAllReadAloud,
  getReadAloudById,
  updateReadAloud,
  deleteReadAloud,
  getReadAloudQuestionsWithAttempts
} from "../controllers/readAloud.controller.js";
import { submitRL } from "../controllers/mocktest/questionTests/rlControllers.js";
import { authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

import { checkPracticeLimit } from "../middlewares/practiceLimitMiddleware.js";
import { upload } from "../middlewares/upload.js";

router.post("/submit", authorize(), checkPracticeLimit, submitRL);

router.post("/",upload.single("audio"), createReadAloud);
router.get("/", getAllReadAloud);
router.get("/:id", getReadAloudById);
router.put("/:id",upload.single("audio"), updateReadAloud);
router.delete("/:id", deleteReadAloud);
router.get("/questions/:userId", getReadAloudQuestionsWithAttempts);

export default router;
