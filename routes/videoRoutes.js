import express from "express";
import { getVideos, addVideo } from "../controllers/videoController.js";
// import { authorizeAdmin } from "../middlewares/authMiddleware.js"; // If we have admin auth

const router = express.Router();

router.get("/list", getVideos);
router.post("/add", addVideo); // Public for now to easily seed data via Postman or frontend test

export default router;
