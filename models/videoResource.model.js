import mongoose from "mongoose";

const videoResourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    videoUrl: {
      type: String, // YouTube URL or similar
      required: true,
    },
    thumbnail: {
      type: String, // Cloudinary URL or external link
      // required: false - generated on frontend if missing
    },
    category: {
      type: String,
      enum: ["Speaking", "Writing", "Reading", "Listening", "General", "Latest Update", "Guide", "Tip", "Other"],
      default: "General",
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export const VideoResource = mongoose.model(
  "VideoResource",
  videoResourceSchema,
);
