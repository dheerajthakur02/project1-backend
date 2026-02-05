import mongoose from "mongoose";

const ListeningFIBQuestionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  audioUrl: { type: String, required: true },
  cloudinaryId: { type: String },
  transcript: { type: String, required: true }, // Text with placeholders if needed
  correctAnswers: [
    {
      index: { type: Number, required: true }, // 1-based index
      correctAnswer: { type: String, required: true },
    },
  ],
  difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], default: "Medium" },
  isPredictive: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const ListeningFIBAttemptSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: "ListeningFIBQuestion" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  userAnswers: [String], // Array of answers provided by user in order
  score: Number,
  maxScore: Number,
  timeTaken: Number,
  createdAt: { type: Date, default: Date.now }
});

export const ListeningFIBQuestion = mongoose.model("ListeningFIBQuestion", ListeningFIBQuestionSchema);
export const ListeningFIBAttempt = mongoose.model("ListeningFIBAttempt", ListeningFIBAttemptSchema);
