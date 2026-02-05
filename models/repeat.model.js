import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  title: String,
  audioUrl: String,
  cloudinaryId: String,
  difficulty: String,
  transcript: String,
  prepareTime: Number,   // seconds
  answerTime: Number,
  isPrediction: {
      type: Boolean,
      default: false
    }    // seconds
}, { timestamps: true });

export default mongoose.model("RepeatQuestion", questionSchema);
