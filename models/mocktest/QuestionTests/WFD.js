import mongoose from "mongoose";

const WFDSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    WriteFromDictationQuestions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "WriteFromDictationQuestion" },
    ],
  },
  { timestamps: true }
);

WFDSchema.pre("save", function () {
  if (this.WriteFromDictationQuestions.length > 3) {
    return next(new Error("WFD cannot exceed 3 questions"));
  }
 
});

export default mongoose.model("WFD", WFDSchema);
