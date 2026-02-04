import express from "express";
import { createListening, 
  getAllListenings,
  getListeningById,
  updateListening,
  deleteListening,
  submitListeningResult,
  getMyListeningResults,
  getResultsByListeningId,
  getListeningResultById,
  getUnusedListeningQuestions,
  deleteQuestion
} from "../../controllers/mocktest/listeningController.js";

import { authorize } from "../../middlewares/authMiddleware.js";

const router = express.Router();

/* Listening */
router.post("/",  createListening);
router.get("/", getAllListenings);
router.get("/:id", getListeningById);
router.put("/:id", updateListening);
router.delete("/:id", deleteListening); 
/* Results */
import { checkPracticeLimit } from "../../middlewares/practiceLimitMiddleware.js";

router.post("/result", checkPracticeLimit, submitListeningResult);
router.get("/result/my", authorize(), getMyListeningResults);
router.get("/result/test/:listeningId", getResultsByListeningId);
router.get("/result/:id", getListeningResultById);

router.get("/get/unused", getUnusedListeningQuestions)

router.delete("/:id", deleteQuestion)

export default router;
