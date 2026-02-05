import mongoose from 'mongoose';

// --- IMAGE QUESTION MODEL ---
const ImageQuestionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    imageUrl: { type: String, required: true },
    cloudinaryId: { type: String }, // For image management
    prepareTime: { type: Number, default: 35 },
    answerTime: { type: Number, default: 40 },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      default: 'Medium'
    },
    isPredictive: {
      type: Boolean,
      default: false
    },
    keywords: [String], // Used for AI content matching
    modelAnswer: { type: String } // Ideal description
  },
  { timestamps: true }
);

// --- IMAGE ATTEMPT MODEL ---
const ImageAttemptSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ImageQuestion',
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    studentAudio: {
      url: String,
      public_id: String
    },
    transcript: String,
    score: { type: Number, default: 0 },
    content: { type: Number, default: 0 },
    pronunciation: { type: Number, default: 0 },
    fluency: { type: Number, default: 0 },
    wordAnalysis: [
      {
        word: String,
        status: {
          type: String,
          enum: ['correct', 'incorrect']
        }
      }
    ]
  },
  { timestamps: true }
);

export const ImageQuestion = mongoose.model(
  'ImageQuestion',
  ImageQuestionSchema
);

export const ImageAttempt = mongoose.model(
  'ImageAttempt',
  ImageAttemptSchema
);
