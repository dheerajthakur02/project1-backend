import mongoose from "mongoose";

const attemptSchema = new mongoose.Schema({
  paragraphId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "readaloud",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  transcript: {
    type: String
  },
  score: {
    type: Number,
    required: true,
  },
  fluency: {
    type: Number,
    required: true,
  },
  content: {
    type: Number,
    required: true,
  },
  pronunciation: {
    type: Number,
    required: true,
  },
  analysis: {
    type: mongoose.Schema.Types.Mixed,
  },
  aiFeedback: {
    type: String, 
  },
  wordAnalysis: {
    type: [
      {
        word: String,
        status: String, 
      }
    ]
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Attempt", attemptSchema);
