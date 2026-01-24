import express from "express";
import {
  createReTell,
  getAllReTell,
  getReTellById,
  updateReTell,
  deleteReTell,
} from "../../../controllers/mocktest/questionTests/retellController.js";

const router = express.Router();

/* ===================== RETELL ROUTES ===================== */

// Create Re-tell Lecture section
router.post("/", createReTell);

// Get all Re-tell Lecture sections
router.get("/", getAllReTell);

// Get Re-tell Lecture by ID
router.get("/:id", getReTellById);

// Update Re-tell Lecture
router.put("/:id", updateReTell);

// Delete Re-tell Lecture
router.delete("/:id", deleteReTell);

export default router;
