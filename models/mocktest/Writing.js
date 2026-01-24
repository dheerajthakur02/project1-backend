import mongoose from "mongoose";

const writingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    summarizeWrittenText: [
      { type: mongoose.Schema.Types.ObjectId, ref: "SummarizeTextQuestion" }
    ],

    writeEssay: [
      { type: mongoose.Schema.Types.ObjectId, ref: "WriteEssayQuestion" }
    ],

    summarizeSpokenText: [
      { type: mongoose.Schema.Types.ObjectId, ref: "SSTQuestion" }
    ],

    writeFromDictation: [
      { type: mongoose.Schema.Types.ObjectId, ref: "WriteFromDictationQuestion" }
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Writing", writingSchema);

writingSchema.pre("save", function (next) {
  const totalQuestions =
    this.summarizeWrittenText.length +
    this.writeEssay.length +
    this.summarizeSpokenText.length +
    this.writeFromDictation.length 

  if (totalQuestions > 20) {
    return next(
      new Error("Writing section cannot have more than 20 questions")
    );
  }

  next();
});

const WritingResultSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  writingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Writing' },
  overallScore: Number, // The 0-90 PTE score
  scores: [
    {
      questionType: String,
      questionId: String,
      contentScore: Number,
      grammarScore: Number,
      vocabularyScore: Number,
      formScore: Number,
      spellingScore: Number,
      spellingScore: Number,
      answerText: String,
      score: Number,
      maxScore: Number 
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

export const WritingResult = mongoose.model("WritingResult", WritingResultSchema);