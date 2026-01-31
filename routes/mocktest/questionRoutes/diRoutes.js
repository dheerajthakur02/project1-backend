import express from "express";
import { createDI, deleteDI, getAllDI, getDIById, updateDI, submitDI, getUnusedDescribeImageQuestions } from "../../../controllers/mocktest/questionTests/diController.js";

import { authorize } from "../../../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", createDI);
router.get("/", getAllDI);
router.get("/:id", getDIById);
router.put("/:id", updateDI);
router.delete("/:id", deleteDI);
router.post("/submit", authorize(), submitDI);
router.get("/get/unused", getUnusedDescribeImageQuestions)
export default router;
