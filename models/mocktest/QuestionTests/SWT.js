import mongoose from "mongoose";

const SWTSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    SummarizeTextQuestions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "SummarizeTextQuestion" },
    ],
  },
  { timestamps: true }
);

SWTSchema.pre("save", function () {
  if (this.SummarizeTextQuestions.length > 2) {
    return next(new Error("SWT cannot exceed 2 questions"));
  }
 
});

export default mongoose.model("SWT", SWTSchema);
