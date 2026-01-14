import mongoose from "mongoose";

const repeatAttemptSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RepeatQuestion", // Make sure this matches your Question model name
    required: true,
  },
  userId: {
     type: mongoose.Schema.Types.ObjectId,
     ref: "User", // Assuming you have a User model
    required: true,
  },
  studentAudio: {
    public_id: { type: String, required: true },
    url: { type: String, required: true },
  },
  transcript: { type: String, required: true }, // What the student said (from STT)
  
  // Scores
  score: { type: Number, required: true },
  fluency: { type: Number, required: true },
  content: { type: Number, required: true },
  pronunciation: { type: Number, required: true },

  // For the "Red/Green/Yellow" highlighting on frontend
  wordAnalysis: [
    {
      word: String,
      status: { 
        type: String, 
        enum: ["correct", "incorrect", "missing", "extra"],
        default: "correct"
      }
    }
  ],

  date: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model("RepeatAttempt", repeatAttemptSchema);