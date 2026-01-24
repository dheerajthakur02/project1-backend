import express from "express";
import { 
  createFullMockTest, 
  getAllFullMockTests, 
  getFullMockTestById,
  submitFullMockTest
} from "../../controllers/mocktest/fullMockTestController.js";
import { upload } from "../../middlewares/upload.js";
import { authorize } from "../../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @route   POST /api/mocktest/full
 * @desc    Generate a new Full Mock Test with unique questions
 * @access  Admin (or Protected)
 */
router.post("/", createFullMockTest);

/**
 * @route   GET /api/mocktest/full
 * @desc    Get list of all full mock tests
 * @access  Public/User
 */
router.get("/", getAllFullMockTests);

/**
 * @route   GET /api/mocktest/full/:id
 * @desc    Get a specific test with all populated questions
 * @access  Public/User
 */
router.get("/:id", getFullMockTestById);

/**
 * @route   POST /api/mocktest/full/:id/submit
 * @desc    Submit aggregated answers for a full mock test
 * @access  Public/User
 */
router.post("/:id/submit", authorize(), upload.any(), submitFullMockTest);

export default router;
