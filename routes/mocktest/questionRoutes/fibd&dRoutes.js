import express from "express";
import {
  createFIBD,
  getAllFIBD,
  getFIBDById,
  updateFIBD,
  deleteFIBD,
} from "../../../controllers/mocktest/questionTests/fibd&dContorller.js";

const router = express.Router();

router.post("/", createFIBD);
router.get("/", getAllFIBD);
router.get("/:id", getFIBDById);
router.put("/:id", updateFIBD);
router.delete("/:id", deleteFIBD);

export default router;
