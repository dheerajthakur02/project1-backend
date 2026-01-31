import express from "express";
import { createRS, deleteRS, getAllRS, updateRS,getRSById, submitRS, getUnusedRepeatSentenceQuestions } from "../../../controllers/mocktest/questionTests/rsController.js";

const router = express.Router();

router.post("/", createRS);
router.get("/", getAllRS);
router.get("/:id", getRSById);
router.put("/:id", updateRS);
router.delete("/:id", deleteRS);
router.post("/submit", submitRS);
router.get("/get/unused", getUnusedRepeatSentenceQuestions)

export default router;
