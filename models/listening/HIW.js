import mongoose from "mongoose";
// models/HIWQuestion.js
const HIWQuestionSchema = new mongoose.Schema({
  title: String,
  audioUrl: String,
  cloudinaryId: String,
  // The full paragraph as it appears on screen (with mistakes)
  content: { type: String, required: true }, 
  // Mistakes list: which word index is wrong and what the spoken word was
  // Example: [{ index: 15, word: "dust", answer: "slime" }]
  mistakes: [
    {
      index: Number,
      word: String,
      answer: String,
    }
  ],
  transcript: String,
  difficulty: { type: String, enum: ["Easy", "Medium", "Hard"] },
  isPredictive: { type: Boolean, default: false },
});

// models/HIWAttempt.js
const HIWAttemptSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: "HIWQuestion" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  selectedIndices: [Number], // The word indices the user clicked
  score: Number,
  correctCount: Number,
  wrongCount: Number,
  missedCount: Number,
  timeTaken: Number,
  createdAt: { type: Date, default: Date.now }
});

export const HIWQuestion = mongoose.model("HIWQuestion", HIWQuestionSchema);
export const HIWAttempt = mongoose.model("HIWAttempt", HIWAttemptSchema);