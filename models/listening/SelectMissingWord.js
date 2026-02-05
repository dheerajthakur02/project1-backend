import mongoose from "mongoose";

// Select Missing Word Question
const SelectMissingWordQuestionSchema = new mongoose.Schema({
  title: String,
  audioUrl: String,
  cloudinaryId: String,
  transcript: String,
  options: [
    {
      text: String,
      isCorrect: Boolean // true for correct option, false for others
    }
  ],
  difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], default: "Medium" },
  isPredictive: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Attempt by user
const SelectMissingWordAttemptSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: "SelectMissingWordQuestion" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  selectedOptionIndex: Number, // index of option chosen by user
  isCorrect: Boolean,
  timeTaken: Number,
  createdAt: { type: Date, default: Date.now }
});

export const SelectMissingWordQuestion = mongoose.model(
  "SelectMissingWordQuestion",
  SelectMissingWordQuestionSchema
);
export const SelectMissingWordAttempt = mongoose.model(
  "SelectMissingWordAttempt",
  SelectMissingWordAttemptSchema
);