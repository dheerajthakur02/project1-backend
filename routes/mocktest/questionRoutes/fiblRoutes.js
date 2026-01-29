import express from "express";
import {
  createFIBL,
  getAllFIBL,
  getFIBLById,
  updateFIBL,
  deleteFIBL,
  submitFIBL
} from "../../../controllers/mocktest/questionTests/fiblController.js";

const router = express.Router();

router.post("/", createFIBL);
router.get("/", getAllFIBL);
router.get("/:id", getFIBLById);
router.put("/:id", updateFIBL);
router.delete("/:id", deleteFIBL);

router.post("/submit", submitFIBL);

export default router;
