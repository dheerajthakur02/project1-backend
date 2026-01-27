import mongoose from "mongoose";

const FIBRWSchema = new mongoose.Schema({
  title: { type: String, required: true },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: "FIBRWQuestion" }],
  createdAt: { type: Date, default: Date.now }
});

FIBRWSchema.pre("save", function (next) {
  if (this.questions.length > 5) return next(new Error("Max 5 questions"));
  next();
});

export default mongoose.model("FIBRW", FIBRWSchema);