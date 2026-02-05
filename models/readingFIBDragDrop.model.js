import mongoose from "mongoose";

const readingFIBDragDropSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    text: {
      type: String, // The full text with placeholders for blanks e.g., "The cat sat on the [1]."
      required: true,
    },
    options: [
      {
        type: String,
        required: true,
      },
    ], // Pool of options available to drag
    correctAnswers: [
      {
        index: { type: Number, required: true }, // 1-based index corresponding to placeholders
        correctAnswer: { type: String, required: true },
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

export const ReadingFIBDragDrop = mongoose.model(
  "ReadingFIBDragDrop",
  readingFIBDragDropSchema
);
