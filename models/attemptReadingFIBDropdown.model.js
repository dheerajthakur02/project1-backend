import mongoose from "mongoose";

const attemptReadingFIBDropdownSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReadingFIBDropdown",
      required: true,
    },
    userAnswers: [
      {
        index: { type: Number, required: true },
        answer: { type: String, required: true },
        isCorrect: { type: Boolean, required: true },
      },
    ],
    score: {
      type: Number,
      required: true,
    },
    maxScore: {
        type: Number,
        required: true,
    }
  },
  { timestamps: true }
);

export const AttemptReadingFIBDropdown = mongoose.model("AttemptReadingFIBDropdown", attemptReadingFIBDropdownSchema);
