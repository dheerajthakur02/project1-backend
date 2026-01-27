import express from "express";
import {
  createRO,
  getAllRO,
  getROById,
  updateRO,
  deleteRO,
} from "../../../controllers/mocktest/questionTests/roController.js";

const router = express.Router();

router.post("/", createRO);
router.get("/", getAllRO);
router.get("/:id", getROById);
router.put("/:id", updateRO);
router.delete("/:id", deleteRO);

export default router;
