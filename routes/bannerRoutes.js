import express from "express";
import { createBanner, getBanners, deleteBanner } from "../controllers/bannerController.js";
import multer from "multer";

const router = express.Router();

// Multer setup for temporary storage
const upload = multer({ dest: "uploads/" }); // Ensure 'uploads/' folder exists or handle memory storage

router.post("/create", upload.single("image"), createBanner);
router.get("/list", getBanners);
router.delete("/:id", deleteBanner);

export default router;
