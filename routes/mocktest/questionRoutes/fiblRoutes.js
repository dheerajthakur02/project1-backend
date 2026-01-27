import express from "express";
import {
  createFIBL,
  getAllFIBL,
  getFIBLById,
  updateFIBL,
  deleteFIBL,
} from "../../../controllers/mocktest/questionTests/fibl.controller.js";

const router = express.Router();

router.post("/", createFIBL);
router.get("/", getAllFIBL);
router.get("/:id", getFIBLById);
router.put("/:id", updateFIBL);
router.delete("/:id", deleteFIBL);

export default router;
