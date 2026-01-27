import express from "express";
import { createBanner, getBanners, deleteBanner } from "../controllers/bannerController.js";
import multer from "multer";

import { authorizeAdmin } from "../middlewares/adminMiddleware.js";
import { authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Multer setup for temporary storage
const upload = multer({ dest: "uploads/" }); // Ensure 'uploads/' folder exists or handle memory storage

router.post("/create", authorize(), authorizeAdmin(), upload.single("image"), createBanner);
router.get("/list", getBanners);
router.delete("/:id", authorize(), authorizeAdmin(), deleteBanner);

export default router;
