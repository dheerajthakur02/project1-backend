import mongoose from "mongoose";

const attemptReadingReorderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReadingReorder",
      required: true,
    },
    userOrder: [
      {
        type: String, // Array of IDs in user's order
        required: true,
      },
    ],
    pairResults: [
        {
            pair: { type: String }, // e.g. "A-B"
            isCorrect: { type: Boolean }
        }
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

export const AttemptReadingReorder = mongoose.model(
  "AttemptReadingReorder",
  attemptReadingReorderSchema
);
