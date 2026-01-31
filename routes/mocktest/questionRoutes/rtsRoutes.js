import express from "express";
import {
  createRTS,
  getAllRTS,
  getRTSById,
  updateRTS,
  deleteRTS,
  getUnusedRTSQuestions,
} from "../../../controllers/mocktest/questionTests/rtsController.js";

const router = express.Router();

router.post("/", createRTS);
router.get("/", getAllRTS);
router.get("/:id", getRTSById);
router.put("/:id", updateRTS);
router.delete("/:id", deleteRTS);
router.get("/get/unused", getUnusedRTSQuestions)

export default router;
