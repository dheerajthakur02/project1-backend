import mongoose from "mongoose";

const attemptReadingMultiChoiceMultiAnswerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReadingMultiChoiceMultiAnswer",
      required: true,
    },
    userSelectedOptions: [
      {
        type: String,
        required: true,
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

export const AttemptReadingMultiChoiceMultiAnswer = mongoose.model(
  "AttemptReadingMultiChoiceMultiAnswer",
  attemptReadingMultiChoiceMultiAnswerSchema
);
