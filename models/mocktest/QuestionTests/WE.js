// models/mocktest/QuestionTests/WE.js
import mongoose from "mongoose";

const WESchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    essayQuestions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "EssayQuestion" },
    ],
  },
  { timestamps: true }
);

WESchema.pre("save", function (next) {
  if (this.essayQuestions.length > 2) {
    return next(new Error("Write Essay cannot exceed 2 questions"));
  }
  next();
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

const WE = mongoose.model("WE", WESchema);
const WEResult =  mongoose.model("WEResult", WEResultSchema);
