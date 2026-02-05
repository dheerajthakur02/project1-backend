import mongoose from "mongoose";

const ListeningMultiChoiceMultiAnswerSchema = new mongoose.Schema({
  title: { type: String, required: true },
  audioUrl: { type: String, required: true },
  cloudinaryId: { type: String },
  transcript: { type: String, required: true },
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctOptions: [{ type: String, required: true }],
  difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], default: "Medium" },
  isPredictive: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const ListeningMultiChoiceMultiAnswerAttemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: "ListeningMultiChoiceMultiAnswer", required: true },
  userAnswers: [{ type: String, required: true }], // Array of selected options
  score: { type: Number, required: true },
  maxScore: { type: Number, required: true },
  timeTaken: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export const ListeningMultiChoiceMultiAnswer = mongoose.model("ListeningMultiChoiceMultiAnswer", ListeningMultiChoiceMultiAnswerSchema);
export const ListeningMultiChoiceMultiAnswerAttempt = mongoose.model("ListeningMultiChoiceMultiAnswerAttempt", ListeningMultiChoiceMultiAnswerAttemptSchema);
