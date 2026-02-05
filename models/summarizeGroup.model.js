import mongoose from "mongoose";

const summarizeGroupQuestionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    audioUrl: {
      type: String,
    },
    answer: {
      type: String,
      required: true,
    },
    transcript: {
      type: String,
      required: true,
    },
    cloudinaryId: {
      type: String,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "easy",
    },
    prepareTime: {
      type: Number, // seconds
      required: true,
    },
    answerTime: {
      type: Number, // seconds
      required: true,
    },
    isPredictive: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);


const summarizeGroupAttemptSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SummarizeGroupQuestion",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    studentAudio: {
      public_id: { type: String, required: true },
      url: { type: String, required: true },
    },
    transcript: {
      type: String,
      required: true,
    },
    score: { type: Number, default: 0 },
    content: { type: Number, default: 0 },
    pronunciation: { type: Number, default: 0 },
    fluency: { type: Number, default: 0 },
    wordAnalysis: [
      {
        word: String,
        status: {
          type: String,
          enum: ['correct', 'incorrect','missing']
        }
      }
    ]
  },
  { timestamps: true }
);


export const SummarizeGroupQuestion  = mongoose.model('SummarizeGroupQuestion', summarizeGroupQuestionSchema)
export const SummarizeGroupAttempt = mongoose.model ('SummarizeGroupAttempt', summarizeGroupAttemptSchema)
