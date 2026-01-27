// models/mocktest/QuestionTests/SWT.js
import mongoose from "mongoose";

const SWTSchema = new mongoose.Schema(
  {
    title: String,
    swtQuestions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "SWTQuestion" },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("SWT", SWTSchema);
