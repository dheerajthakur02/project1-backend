import express from "express";
import { createSSTGroup,
  getAllSSTGroups,
  getSSTGroupById,
  updateSSTGroup,
  deleteSSTGroup,
  submitSSTGroup,
  getUnusedSSTQuestions
} from "../../../controllers/mocktest/questionTests/sstGroupController.js";
import { authorize } from "../../../middlewares/authMiddleware.js";


const router = express.Router();

router.post("/", createSSTGroup);
router.post("/submit", authorize(), submitSSTGroup);
router.get("/", getAllSSTGroups);
router.get("/:id", getSSTGroupById);
router.put("/:id", updateSSTGroup);
router.delete("/:id", deleteSSTGroup);
router.get("/get/unused", getUnusedSSTQuestions);

export default router;
