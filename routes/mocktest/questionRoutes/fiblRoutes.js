import express from "express";
import {
  createFIBL,
  getAllFIBL,
  getFIBLById,
  updateFIBL,
  deleteFIBL,
  submitFIBL,
  getUnusedFIBLQuestions
} from "../../../controllers/mocktest/questionTests/fiblController.js";
import { authorize } from "../../../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", createFIBL);
router.get("/", getAllFIBL);
router.get("/:id", getFIBLById);
router.put("/:id", updateFIBL);
router.delete("/:id", deleteFIBL);

router.post("/submit", authorize(), submitFIBL);
router.get("/get/unused", getUnusedFIBLQuestions);

export default router;
