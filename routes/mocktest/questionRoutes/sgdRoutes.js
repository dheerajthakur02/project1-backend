import express from "express";
import { createSGD,
     getAllSGD,
  getSGDById,
  updateSGD,
  deleteSGD,
  getUnusedSummarizeGroupDiscussionQuestions,
  submitSGD
 } from "../../../controllers/mocktest/questionTests/sgdController.js";
import { authorize } from "../../../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @route   POST /api/speaking/sgd
 * @desc    Create SGD section
 */
router.post("/", createSGD);

/**
 * @route   POST /api/speaking/sgd/submit
 * @desc    Submit SGD attempt
 */
router.post("/submit", authorize(), submitSGD);

/**
 * @route   GET /api/speaking/sgd
 * @desc    Get all SGD sections
 */
router.get("/", getAllSGD);

/**
 * @route   GET /api/speaking/sgd/:id
 * @desc    Get SGD by ID
 */
router.get("/:id", getSGDById);

/**
 * @route   PUT /api/speaking/sgd/:id
 * @desc    Update SGD
 */
router.put("/:id", updateSGD);

/**
 * @route   DELETE /api/speaking/sgd/:id
 * @desc    Delete SGD
 */
router.delete("/:id", deleteSGD);

router.get("/get/unused", getUnusedSummarizeGroupDiscussionQuestions)

export default router;
