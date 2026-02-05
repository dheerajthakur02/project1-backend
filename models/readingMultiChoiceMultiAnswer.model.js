import mongoose from "mongoose";

const readingMultiChoiceMultiAnswerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    question: {
      type: String,
      required: true,
    },
    options: [
      {
        type: String,
        required: true,
      },
    ],
    correctOptions: [
      {
        type: String, 
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

export const ReadingMultiChoiceMultiAnswer = mongoose.model(
  "ReadingMultiChoiceMultiAnswer",
  readingMultiChoiceMultiAnswerSchema
);
