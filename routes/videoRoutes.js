import express from "express";
import { getVideos, addVideo, deleteVideo } from "../controllers/videoController.js";
import { authorizeAdmin } from "../middlewares/adminMiddleware.js";
import { authorize } from "../middlewares/authMiddleware.js"; // Standard auth needed before admin check usually, or admin check handles it

const router = express.Router();

router.get("/list", getVideos);
router.post("/add", authorize(), authorizeAdmin(), addVideo);
router.delete("/:id", authorize(), authorizeAdmin(), deleteVideo);

export default router;
