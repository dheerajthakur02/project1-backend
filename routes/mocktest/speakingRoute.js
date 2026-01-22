import express from "express";
import { calculateSpeakingResult, createSpeaking, getAllSpeaking, getSpeakingById, updateSpeaking } from "../../controllers/mocktest/speakingController.js";

const router = express.Router();
router.post("/", createSpeaking);
router.get("/", getAllSpeaking);
router.get("/:id", getSpeakingById);
router.put("/:id", updateSpeaking);

router.post("/calculate-result", calculateSpeakingResult);

export default router;
