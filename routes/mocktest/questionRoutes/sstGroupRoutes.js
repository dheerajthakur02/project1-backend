import express from "express";
import { createSSTGroup,
  getAllSSTGroups,
  getSSTGroupById,
  updateSSTGroup,
  deleteSSTGroup,
} from "../../../controllers/mocktest/questionTests/sstGroupController.js";


const router = express.Router();

router.post("/", createSSTGroup);
router.get("/", getAllSSTGroups);
router.get("/:id", getSSTGroupById);
router.put("/:id", updateSSTGroup);
router.delete("/:id", deleteSSTGroup);

export default router;
