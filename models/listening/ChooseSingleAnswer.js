import mongoose from "mongoose";

// Choose Single Answer Question
const ChooseSingleAnswerQuestionSchema = new mongoose.Schema({
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
const ChooseSingleAnswerAttemptSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: "ChooseSingleAnswerQuestion" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  selectedOptionIndex: Number, // index of option chosen by user
  isCorrect: Boolean,
  timeTaken: Number,
  createdAt: { type: Date, default: Date.now }
});

export const ChooseSingleAnswerQuestion = mongoose.model(
  "ChooseSingleAnswerQuestion",
  ChooseSingleAnswerQuestionSchema
);
export const ChooseSingleAnswerAttempt = mongoose.model(
  "ChooseSingleAnswerAttempt",
  ChooseSingleAnswerAttemptSchema
);