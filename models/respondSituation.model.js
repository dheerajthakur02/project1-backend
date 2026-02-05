import mongoose from 'mongoose';

/* ================================
   RESPOND SITUATION QUESTION MODEL
================================ */
const RespondSituationQuestionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },
    audioUrl: {
      type: String,
      required: true
    },
    transcript:{
        type: String,
    },
    cloudinaryId: {
      type: String
    },
    answer: {
      type: String,
      required: true
    },
    prepareTime: {
      type: Number,
      default: 10
    },
    answerTime: {
      type: Number,
      default: 40
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      default: 'Medium'
    },
    keywords: [String], // used for content scoring
    modelAnswer: {
      type: String // ideal retell summary
    },
    isPredictive:{
      type: Boolean,
      required: true,
    }
  },
  { timestamps: true }
);

/* ================================
   RESPOND SITUATION ATTEMPT MODEL
================================ */
const RespondSituationAttemptSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RespondSituationQuestion',
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    studentAudio: {
      url: {
        type: String,
        required: true
      },
      public_id: {
        type: String,
        required: true
      }
    },
    transcript: {
      type: String,
      required: true
    },

    /* ---------- SCORING ---------- */
    score: {
      type: Number,
      default: 0
    },
    content: {
      type: Number,
      default: 0
    },
    pronunciation: {
      type: Number,
      default: 0
    },
    fluency: {
      type: Number,
      default: 0
    },

    /* ---------- WORD ANALYSIS ---------- */
    wordAnalysis: [
      {
        word: String,
        status: {
          type: String,
          enum: ['correct', 'incorrect', 'missing']
        }
      }
    ]
  },
  { timestamps: true }
);

/* ================================
   EXPORT MODELS
================================ */
export const RespondSituationQuestion = mongoose.model(
  'RespondSituationQuestion',
  RespondSituationQuestionSchema
);

export const RespondSituationAttempt = mongoose.model(
  'RespondSituationAttempt',
  RespondSituationAttemptSchema
);
