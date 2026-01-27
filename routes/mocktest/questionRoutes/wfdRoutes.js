import express from "express";
import {
  createWFD,
  getAllWFD,
  getWFDById,
  updateWFD,
  deleteWFD,
} from "../../../controllers/mocktest/questionTests/wfdController.js";

const router = express.Router();

router.post("/", createWFD);
router.get("/", getAllWFD);
router.get("/:id", getWFDById);
router.put("/:id", updateWFD);
router.delete("/:id", deleteWFD);

export default router;
