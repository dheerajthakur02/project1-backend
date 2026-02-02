import mongoose from "mongoose";

const QuestionTestResultSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  testId: { type: mongoose.Schema.Types.ObjectId, required: true }, // ID of the specific test (e.g., WFD ID, RS ID)
  testType: { type: String, required: true }, // e.g., 'WFD', 'RS', 'DI', 'SST', 'RO'
  testTitle: { type: String }, // Snapshot of title for easier display
  overallScore: { type: Number, default: 0 },
  maxScore: { type: Number, default: 0 },
  sectionScores: {
    speaking: Number,
    writing: Number,
    reading: Number,
    listening: Number
  },
  answers: [
    {
      questionId: { type: mongoose.Schema.Types.ObjectId },
      userAnswer: mongoose.Schema.Types.Mixed,
      score: Number,
      maxScore: Number,
      audioUrl: String,
      details: mongoose.Schema.Types.Mixed // Flexible field for specific breakdowns (fluency, pronunciation, etc.)
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("QuestionTestResult", QuestionTestResultSchema);
