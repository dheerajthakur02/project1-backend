import express from "express";
import {
  createReading,
  getAllReading,
  getReadingById,
  updateReading,
  calculateReadingResult,
} from "../../controllers/mocktest/readingController.js"

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

// 🧮 Calculate & Save Reading Result
router.post("/result/calculate", calculateReadingResult);

export default router;
