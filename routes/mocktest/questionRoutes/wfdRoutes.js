import express from "express";
// ... imports
import {
  createWFD,
  getAllWFD,
  getWFDById,
  updateWFD,
  deleteWFD,

  submitWFD,
  getUnusedWFDQuestions
} from "../../../controllers/mocktest/questionTests/wfdController.js";
import { authorize } from "../../../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", createWFD);
router.get("/", getAllWFD);
router.get("/:id", getWFDById);
router.put("/:id", updateWFD);
router.delete("/:id", deleteWFD);
router.post("/submit", authorize(), submitWFD);
router.get("/get/unused", getUnusedWFDQuestions);

export default router;
