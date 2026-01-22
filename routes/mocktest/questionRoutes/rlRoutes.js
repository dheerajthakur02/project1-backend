import express from "express";
import { createRL, deleteRL, getAllRL, getRLById, updateRL } from "../../../controllers/mocktest/questionTests/rlControllers.js";

const router = express.Router();

router.post("/", createRL);
router.get("/", getAllRL);
router.get("/:id", getRLById);
router.put("/:id", updateRL);
router.delete("/:id", deleteRL);

export default router;
