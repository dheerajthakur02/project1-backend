import express from "express";
import { 
  createFullMockTest, 
  getAllFullMockTests, 
  getFullMockTestById,
  submitFullMockTest,
  getUserFullMockTestResults
} from "../../controllers/mocktest/fullMockTestController.js";


import { upload } from "../../middlewares/upload.js";
import { authorize } from "../../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @route   POST /api/mocktest/full
 * @desc    Generate a new Full Mock Test with unique questions
 * @access  Admin (or Protected)
 */
router.post("/create", createFullMockTest);

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
 * @route   GET /api/mocktest/full/results/my
 * @desc    Get current user's full mock test results
 * @access  Protected
 */
router.get("/results/my", authorize(), (req, res, next) => {
    // Import dynamically or ensure imported at top. 
    // Since we can't easily add import at top with this specific tool usage if not already there,
    // assuming we will fix imports in next step or use the existing imports if we exported it.
    // Actually, good practice: Add import in separate chunk or ensuring it's available.
    // For now, let's just add the route string and I will fix imports separately if needed.
    // Correction: I should add the import line too.
    next(); 
}, getUserFullMockTestResults);


/**
 * @route   POST /api/mocktest/full/:id/submit
 * @desc    Submit aggregated answers for a full mock test
 * @access  Public/User
 */
import { checkPracticeLimit } from "../../middlewares/practiceLimitMiddleware.js";

router.post("/:id/submit", authorize(), upload.any(), checkPracticeLimit, submitFullMockTest);

export default router;
