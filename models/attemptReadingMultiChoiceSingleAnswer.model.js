import mongoose from "mongoose";

const attemptReadingMultiChoiceSingleAnswerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReadingMultiChoiceSingleAnswer",
      required: true,
    },
    userAnswer: {
      type: String,
      required: true,
    },
    score: {
      type: Number,
      required: true,
    },
    maxScore: {
      type: Number,
      default: 1,
    },
    timeTaken: {
      type: Number, // duration in seconds
    },
  },
  { timestamps: true }
);

export const AttemptReadingMultiChoiceSingleAnswer = mongoose.model(
  "AttemptReadingMultiChoiceSingleAnswer",
  attemptReadingMultiChoiceSingleAnswerSchema
);
