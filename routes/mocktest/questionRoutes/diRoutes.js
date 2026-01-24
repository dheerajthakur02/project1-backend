import express from "express";
import { createDI, deleteDI, getAllDI, getDIById, updateDI } from "../../../controllers/mocktest/questionTests/diController.js";

const router = express.Router();

router.post("/", createDI);
router.get("/", getAllDI);
router.get("/:id", getDIById);
router.put("/:id", updateDI);
router.delete("/:id", deleteDI);

export default router;
