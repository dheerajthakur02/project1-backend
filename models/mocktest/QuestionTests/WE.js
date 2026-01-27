// models/mocktest/QuestionTests/WE.js
import mongoose from "mongoose";

const WESchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    essayQuestions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "WriteEssayQuestion" },
    ],
  },
  { timestamps: true }
);

WESchema.pre("save", function () {
  if (this.essayQuestions.length > 1) {
    return next(new Error("Write Essay cannot exceed 2 questions"));
  }

});

const WEResultSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    WEId: { type: mongoose.Schema.Types.ObjectId, ref: "WE" },
    overallScore: Number,
    answers: [
      {
        questionId: mongoose.Schema.Types.ObjectId,
        answerText: String,
        contentScore: Number,
        grammarScore: Number,
        vocabScore: Number,
      },
    ],
  },
  { timestamps: true }
);

// ✅ NAMED EXPORTS
export const WE = mongoose.model("WE", WESchema);
export const WEResult = mongoose.model("WEResult", WEResultSchema);
