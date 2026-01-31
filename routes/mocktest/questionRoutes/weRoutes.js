// routes/mocktest/questionTests/we.routes.js
import express from "express";
import {
  createWE,
  getAllWE,
  getWEById,
  updateWE,
  deleteWE,
  getUnusedWriteEssayQuestions,
} from "../../../controllers/mocktest/questionTests/weController.js";

const router = express.Router();

router.post("/", createWE);
router.get("/", getAllWE);
router.get("/:id", getWEById);
router.put("/:id", updateWE);
router.delete("/:id", deleteWE);
router.get("/get/unused", getUnusedWriteEssayQuestions)

export default router;
