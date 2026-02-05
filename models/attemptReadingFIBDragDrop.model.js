import mongoose from "mongoose";

const attemptReadingFIBDragDropSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReadingFIBDragDrop",
      required: true,
    },
    userAnswers: [
      {
        index: { type: Number, required: true },
        answer: { type: String, required: true }, // The option dragged by the user
        isCorrect: { type: Boolean, default: false }
      },
    ],
    score: {
      type: Number,
      required: true,
    },
    maxScore: {
      type: Number,
      required: true,
    },
    timeTaken: {
      type: Number, // duration in seconds
    },
  },
  { timestamps: true }
);

export const AttemptReadingFIBDragDrop = mongoose.model(
  "AttemptReadingFIBDragDrop",
  attemptReadingFIBDragDropSchema
);
