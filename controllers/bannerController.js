import Banner from "../models/banner.model.js";
import { cloudinary } from "../config/cloudinary.js";
import fs from "fs";

// Create a new banner
export const createBanner = async (req, res) => {
    try {
        const { title, order, isActive } = req.body;
        const imageFile = req.file; // From multer

        if (!title || !imageFile) {
            return res.status(400).json({ success: false, message: "Title and Image are required" });
        }

        // Upload image to Cloudinary
        const result = await cloudinary.uploader.upload(imageFile.path, {
            folder: "pte_banners",
            resource_type: "image"
        });

        // Create Banner in DB
        const banner = new Banner({
            title,
            image: result.secure_url,
            order: order || 0,
            isActive: isActive !== undefined ? isActive : true
        });

        await banner.save();

        // Clean up local file (optional depending on multer setup, but good practice if using diskStorage)
        // If you are using memoryStorage, this isn't needed, but typically we assume diskStorage for temp files.
        try {
            if (fs.existsSync(imageFile.path)) {
               // fs.unlinkSync(imageFile.path); // Uncomment if using diskStorage and want to clean up
            }
        } catch (err) {
            console.error("Error deleting temp file", err);
        }

        res.status(201).json({ success: true, message: "Banner created successfully", data: banner });

    } catch (error) {
        console.error("Error creating banner:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// Get all active banners
export const getBanners = async (req, res) => {
    try {
        const banners = await Banner.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
        res.status(200).json({ success: true, data: banners });
    } catch (error) {
        console.error("Error fetching banners:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// Delete a banner
export const deleteBanner = async (req, res) => {
    try {
        const { id } = req.params;
        await Banner.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "Banner deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
}
