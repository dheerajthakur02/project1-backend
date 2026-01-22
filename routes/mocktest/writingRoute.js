import express from "express";
import { createWriting, deleteWriting, getAllWriting, getWritingById, updateWriting } from "../../controllers/mocktest/writingController.js";

const router = express.Router();

router.post("/", createWriting);
router.get("/", getAllWriting);
router.get("/:id", getWritingById);
router.put("/:id", updateWriting);
router.delete("/:id", deleteWriting);

export default router;
