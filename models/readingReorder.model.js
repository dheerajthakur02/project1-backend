import mongoose from "mongoose";

const readingReorderSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    sentences: [
      {
        id: { type: String, required: true }, // Simple ID like 'A', 'B', 'C'
        text: { type: String, required: true },
      },
    ],
    correctOrder: [
      {
        type: String, // Array of IDs in correct order e.g. ['C', 'A', 'D', 'B']
        required: true,
      },
    ],
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },
    isPredictive: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const ReadingReorder = mongoose.model(
  "ReadingReorder",
  readingReorderSchema
);
