import express from "express";
import {
  createSWT,
  getAllSWT,
  getSWTById,
  updateSWT,
  deleteSWT,
  getUnusedQuestionsForAllTypes,
} from "../../../controllers/mocktest/questionTests/swtController.js";

const router = express.Router();

router.post("/", createSWT);
router.get("/", getAllSWT);
router.get("/:id", getSWTById);
router.put("/:id", updateSWT);
router.delete("/:id", deleteSWT);
router.get("/get/unused", getUnusedQuestionsForAllTypes)

export default router;
