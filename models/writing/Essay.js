import mongoose from "mongoose";
const writeEssayQuestionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    minWords: {
      type: Number,
      default: 200,
    },
    maxWords: {
      type: Number,
      default: 300,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
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

export const WriteEssayQuestion = mongoose.model(
  "WriteEssayQuestion",
  writeEssayQuestionSchema
);



const EssayAttemptSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: "WriteEssayQuestion", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  essayText: { type: String, required: true },
  wordCount: { type: Number, required: true },
  timeTaken: { type: Number, required: true },

  /* Scores */
  score: Number,
  writingScore: Number,
  content: Number,
  grammar: Number,
  spelling: Number,
  vocabulary: Number,
  form: Number,
  structure: Number,
  general: Number,

  /* Errors */
  misspelled: Number,
  grammarErrors: Number,
  structureIssues: Number,
  styleIssues: Number,

  createdAt: { type: Date, default: Date.now }
});


export const EssayAttempt = mongoose.model(
  "EssayAttempt",
  EssayAttemptSchema
);
