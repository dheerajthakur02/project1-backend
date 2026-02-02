import express from "express";
import {
  createRO,
  getAllRO,
  getROById,
  updateRO,
  deleteRO,
  submitRO,
  getUnusedROQuestions
} from "../../../controllers/mocktest/questionTests/roController.js";
import { authorize } from "../../../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", createRO);
router.post("/submit", authorize(), submitRO);
router.get("/", getAllRO);
router.get("/:id", getROById);
router.put("/:id", updateRO);
router.delete("/:id", deleteRO);
router.get("/get/unused", getUnusedROQuestions);

export default router;
