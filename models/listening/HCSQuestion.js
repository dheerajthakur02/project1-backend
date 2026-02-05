import mongoose from "mongoose";

// Highlight Correct Summary Question
const HighlightSummaryQuestionSchema = new mongoose.Schema({
  title: String,
  audioUrl: String,
  cloudinaryId: String,
  transcript: String,
  summaries: [
    {
      text: String,
      isCorrect: Boolean // true for correct summary, false for others
    }
  ],
  difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], default: "Medium" },
  isPredictive: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Attempt by user
const HighlightSummaryAttemptSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: "HighlightSummaryQuestion" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  selectedSummaryIndex: Number, // index of summary chosen by user
  isCorrect: Boolean,
  timeTaken: Number,
  createdAt: { type: Date, default: Date.now }
});

export const HighlightSummaryQuestion = mongoose.model(
  "HighlightSummaryQuestion",
  HighlightSummaryQuestionSchema
);
export const HighlightSummaryAttempt = mongoose.model(
  "HighlightSummaryAttempt",
  HighlightSummaryAttemptSchema
);
