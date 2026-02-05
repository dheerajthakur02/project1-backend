import mongoose from "mongoose";

const shortAnswerQuestionSchema = new mongoose.Schema(
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
      enum: ["Easy", "Medium", "Hard"],
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


const shortAnswerAttemptSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShortAnswerQuestion",
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
    score: {
      type: Number, // 🔥 1 or 0
      enum: [0, 1],
      required: true,
    },
  },
  { timestamps: true }
);


export const ShortAnswerQuestion  = mongoose.model('ShortAnswerQuestion', shortAnswerQuestionSchema)
export const ShortAnswerAttempt = mongoose.model ('ShortAnswerAttempt', shortAnswerAttemptSchema)



