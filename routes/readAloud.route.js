import express from "express";
import {
  createReadAloud,
  getAllReadAloud,
  getReadAloudById,
  updateReadAloud,
  deleteReadAloud,
} from "../controllers/readAloud.controller.js";

const router = express.Router();

router.post("/", createReadAloud);
router.get("/", getAllReadAloud);
router.get("/:id", getReadAloudById);
router.put("/:id", updateReadAloud);
router.delete("/:id", deleteReadAloud);

export default router;
