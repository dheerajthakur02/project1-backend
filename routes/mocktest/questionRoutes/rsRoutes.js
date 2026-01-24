import express from "express";
import { createRS, deleteRS, getAllRS, updateRS,getRSById } from "../../../controllers/mocktest/questionTests/rsController.js";

const router = express.Router();

router.post("/", createRS);
router.get("/", getAllRS);
router.get("/:id", getRSById);
router.put("/:id", updateRS);
router.delete("/:id", deleteRS);

export default router;
