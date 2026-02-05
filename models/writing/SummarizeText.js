import mongoose from "mongoose";

const summarizeTextQuestionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    paragraph: {
      type: String,
      required: true,
    },
    maxWords: {
      type: Number,
      default: 75,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "easy",
    },
    answerTime: {
      type: Number, // seconds
      required: true,
    },
    modelAnswer: {
      type: String,
      required: true,
    },
    isPredictive: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);




const summarizeWrittenAttemptSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SummarizeWrittenQuestion",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    summaryText: {
      type: String,
      required: true,
    },

    /* -------- TIMER & META -------- */
    timeTaken: { type: Number }, // seconds used
    wordCount: { type: Number },

    /* -------- SCORING -------- */
    score: { type: Number }, // total (0–9)

    content: { type: Number }, // /4
    grammar: { type: Number }, // /2
    vocabulary: { type: Number }, // /2
    form: { type: Number }, // /1

    readingScore: { type: Number }, // derived
    writingScore: { type: Number },

    /* -------- ANALYSIS -------- */
    misSpelled: { type: Number, default: 0 },
    structureErrors: { type: Number, default: 0 },
    styleIssues: { type: Number, default: 0 },

  },
  { timestamps: true }
);


export const SummarizeWrittenAttempt = mongoose.model(
  "SummarizeWrittenAttempt",
  summarizeWrittenAttemptSchema
);

export const SummarizeTextQuestion = mongoose.model(
  "SummarizeTextQuestion",
  summarizeTextQuestionSchema
);
