import express from "express";
import { getDashboardData } from "../controllers/dashboardController.js";
import { authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/data", authorize(), getDashboardData);

export default router;
