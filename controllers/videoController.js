import { VideoResource } from "../models/videoResource.model.js";

// Get all active videos
export const getVideos = async (req, res) => {
  try {
    const videos = await VideoResource.find({ isActive: true }).sort({
      createdAt: -1,
    });

    // Optional: Log if no videos found to help debugging (or seed initial data)
    if (videos.length === 0) {
      // We could return some hardcoded defaults here if DB is empty for demo purposes
      // But for now, let's return empty array.
    }

    res.status(200).json({ success: true, data: videos });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch videos" });
  }
};

// Add a video (Admin only, or seed helper)
export const addVideo = async (req, res) => {
  try {
    const { title, description, videoUrl, thumbnail, category, isFeatured } =
      req.body;
    const newVideo = await VideoResource.create({
      title,
      description,
      videoUrl,
      thumbnail,
      category,
      isFeatured,
    });
    res.status(201).json({ success: true, data: newVideo });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a video
export const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;
    await VideoResource.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Video deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete video" });
  }
};
