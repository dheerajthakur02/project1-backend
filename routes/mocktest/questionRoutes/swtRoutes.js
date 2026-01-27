import express from "express";
import {
  createSWT,
  getAllSWT,
  getSWTById,
  updateSWT,
  deleteSWT,
} from "../../../controllers/mocktest/questionTests/swtController.js";

const router = express.Router();

router.post("/", createSWT);
router.get("/", getAllSWT);
router.get("/:id", getSWTById);
router.put("/:id", updateSWT);
router.delete("/:id", deleteSWT);

export default router;
