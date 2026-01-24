import mongoose from "mongoose";

const sectionSchema = new mongoose.Schema({
  score: { type: Number, default: 0 },
  answers: [
    {
      questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
      type: { type: String, required: true },
      userAnswer: mongoose.Schema.Types.Mixed,
      correctAnswer: mongoose.Schema.Types.Mixed,
      score: { type: Number, default: 0 },
      maxScore: Number,
      audioUrl: String, 
      feedback: String
    }
  ]
});

const fullMockTestResultSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  fullMockTestId: { type: mongoose.Schema.Types.ObjectId, ref: "FullMockTest", required: true },
  
  overallScore: { type: Number, default: 0 },
  
  speaking: sectionSchema,
  writing: sectionSchema,
  reading: sectionSchema,
  listening: sectionSchema,
  
  status: { type: String, enum: ["pending", "completed"], default: "completed" },
  
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("FullMockTestResult", fullMockTestResultSchema);
