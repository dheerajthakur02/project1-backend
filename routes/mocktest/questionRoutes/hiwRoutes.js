

import express from "express";
import { 
     createHIW,
  getAllHIW,
  getHIWById,
  updateHIW,
  deleteHIW,
  submitHIW,
  getUnusedHIWQuestions
} from "../../../controllers/mocktest/questionTests/hiwController.js";
import { authorize } from "../../../middlewares/authMiddleware.js";


const router = express.Router();

/**
 * @route   POST /api/listening/hiw
 * @desc    Create HIW section
 */
router.post("/", createHIW);
router.post("/submit", authorize(), submitHIW);
router.get("/get/unused", getUnusedHIWQuestions);

/**
 * @route   GET /api/listening/hiw
 * @desc    Get all HIW sections
 */
router.get("/", getAllHIW);

/**
 * @route   GET /api/listening/hiw/:id
 * @desc    Get HIW by ID
 */
router.get("/:id", getHIWById);

/**
 * @route   PUT /api/listening/hiw/:id
 * @desc    Update HIW
 */
router.put("/:id", updateHIW);

/**
 * @route   DELETE /api/listening/hiw/:id
 * @desc    Delete HIW
 */
router.delete("/:id", deleteHIW);

export default router;
