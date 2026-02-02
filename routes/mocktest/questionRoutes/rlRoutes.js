import express from "express";
import { createRL, deleteRL, getAllRL, getRLById, updateRL, submitRL, getUnusedQuestionsForAllTypes, getReadAloudHistory } from "../../../controllers/mocktest/questionTests/rlControllers.js";
import { authorize } from "../../../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", createRL);
router.post("/submit", authorize(), submitRL);
router.get("/", getAllRL);
router.get("/:id", getRLById);
router.put("/:id", updateRL);
router.delete("/:id", deleteRL);
router.get("/get/unused", getUnusedQuestionsForAllTypes)
router.get("/history/:questionId", authorize(), getReadAloudHistory);
export default router;
