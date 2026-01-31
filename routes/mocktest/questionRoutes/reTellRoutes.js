import express from "express";
import {
  createReTell,
  getAllReTell,
  getReTellById,
  updateReTell,
  deleteReTell,
  getUnusedRetellLectureQuestions,
  submitReTell
} from "../../../controllers/mocktest/questionTests/retellController.js";
import { authorize } from "../../../middlewares/authMiddleware.js";

const router = express.Router();

/* ===================== RETELL ROUTES ===================== */

// Create Re-tell Lecture section
router.post("/", createReTell);

// Submit (New) - Protected
router.post("/submit", authorize(), submitReTell);

// Get all Re-tell Lecture sections
router.get("/", getAllReTell);

// Get Re-tell Lecture by ID
router.get("/:id", getReTellById);

// Update Re-tell Lecture
router.put("/:id", updateReTell);

// Delete Re-tell Lecture
router.delete("/:id", deleteReTell);

router.get("/get/unused", getUnusedRetellLectureQuestions)
export default router;
