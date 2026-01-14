import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  title: String,
  audioUrl: String,
  cloudinaryId: String,
  difficulty: String,
  prepareTime: Number,   // seconds
  answerTime: Number,    // seconds
}, { timestamps: true });

export default mongoose.model("RepeatQuestion", questionSchema);
