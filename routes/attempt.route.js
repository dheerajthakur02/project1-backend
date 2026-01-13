import express from "express";
import { createAttempt, getAttempts } from "../controllers/attempt.controller.js";

const router = express.Router();

router.post("/", createAttempt);
router.get("/", getAttempts);

export default router;
