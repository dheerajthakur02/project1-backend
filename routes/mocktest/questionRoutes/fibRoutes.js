import express from "express";
import {
  createFIBRW,
  getAllFIBRW,
  getFIBRWById,
  updateFIBRW,
  deleteFIBRW,
} from "../../../controllers/mocktest/questionTests/fibController.js";

const router = express.Router();

router.post("/", createFIBRW);
router.get("/", getAllFIBRW);
router.get("/:id", getFIBRWById);
router.put("/:id", updateFIBRW);
router.delete("/:id", deleteFIBRW);

export default router;
