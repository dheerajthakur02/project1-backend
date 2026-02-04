import express from "express";
import {
  createReadAloud,
  getAllReadAloud,
  getReadAloudById,
  updateReadAloud,
  deleteReadAloud,
} from "../controllers/readAloud.controller.js";
import { submitRL } from "../controllers/mocktest/questionTests/rlControllers.js";
import { authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

import { checkPracticeLimit } from "../middlewares/practiceLimitMiddleware.js";

router.post("/submit", authorize(), checkPracticeLimit, submitRL);

router.post("/", createReadAloud);
router.get("/", getAllReadAloud);
router.get("/:id", getReadAloudById);
router.put("/:id", updateReadAloud);
router.delete("/:id", deleteReadAloud);

export default router;
