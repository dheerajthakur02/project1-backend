import express from "express";
import {
  createFIBRW,
  getAllFIBRW,
  getFIBRWById,
  updateFIBRW,
  deleteFIBRW,
  submitFIBRW,
  getUnusedFIBRWQuestions
} from "../../../controllers/mocktest/questionTests/fibController.js";
import { authorize } from "../../../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", createFIBRW);
router.post("/submit", authorize(), submitFIBRW);
router.get("/", getAllFIBRW);
router.get("/:id", getFIBRWById);
router.put("/:id", updateFIBRW);
router.delete("/:id", deleteFIBRW);
router.get("/get/unused", getUnusedFIBRWQuestions);

export default router;
