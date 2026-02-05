import mongoose from "mongoose";

const readingFIBDropdownSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    text: {
      type: String, // The full text including placeholders for blanks or the text segments
      required: true,
    },
    blanks: [
      {
        index: { type: Number, required: true }, // Order of the blank in the text
        options: [{ type: String, required: true }], // The 4 options
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

export const ReadingFIBDropdown = mongoose.model(
  "ReadingFIBDropdown",
  readingFIBDropdownSchema
);
