import express from "express";
import { createRL, deleteRL, getAllRL, getRLById, updateRL, submitRL } from "../../../controllers/mocktest/questionTests/rlControllers.js";
import { authorize } from "../../../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", createRL);
router.post("/submit", authorize(), submitRL);
router.get("/", getAllRL);
router.get("/:id", getRLById);
router.put("/:id", updateRL);
router.delete("/:id", deleteRL);

export default router;
