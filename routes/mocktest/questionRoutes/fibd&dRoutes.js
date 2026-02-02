import express from "express";
import {
  createFIBD,
  getAllFIBD,
  getFIBDById,
  updateFIBD,
  deleteFIBD,
  submitFIBD,
  getUnusedFIBDragDropQuestions
} from "../../../controllers/mocktest/questionTests/fibd&dContorller.js";
import { authorize } from "../../../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", createFIBD);
router.post("/submit", authorize(), submitFIBD);
router.get("/", getAllFIBD);
router.get("/:id", getFIBDById);
router.put("/:id", updateFIBD);
router.delete("/:id", deleteFIBD);
router.get("/get/unused", getUnusedFIBDragDropQuestions);

export default router;
