import express from "express";
import { getDashboardData, getPracticeStats } from "../controllers/dashboardController.js";
import { authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/data", authorize(), getDashboardData);
router.get("/stats", authorize(), getPracticeStats);

export default router;
