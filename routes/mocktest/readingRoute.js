import express from "express";
import {
  createReading,
  getAllReading,
  getReadingById,
  updateReading,
  calculateReadingResult,
  getUserReadingResults,
  getReadingResultById,
  getUnusedReadingQuestions,
  deleteQuestion
} from "../../controllers/mocktest/readingController.js"
import { authorize } from "../../middlewares/authMiddleware.js";



const router = express.Router();

/**
 * ===============================
 * 📘 READING SECTION ROUTES
 * ===============================
 */

// ➕ Create Reading Section
router.post("/", createReading);

// 📥 Get All Reading Sections
router.get("/", getAllReading);

// 📥 Get Reading Section By ID
router.get("/:id", getReadingById);

// ✏️ Update Reading Section
router.put("/:id", updateReading);

import { checkPracticeLimit } from "../../middlewares/practiceLimitMiddleware.js";

// 🧮 Calculate & Save Reading Result
router.post("/result/calculate", checkPracticeLimit, calculateReadingResult);

// 📜 Get User Reading Results
router.get("/results/my", authorize(), getUserReadingResults);

// 🔍 Get Specific Reading Result
router.get("/result/:id", getReadingResultById);

router.get("/get/unused", getUnusedReadingQuestions)

router.delete("/:id", deleteQuestion)

export default router;
