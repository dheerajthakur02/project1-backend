import mongoose from "mongoose";

const FIBLSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    fiblQuestions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "FIBLQuestion" },
    ],
  },
  { timestamps: true }
);

FIBLSchema.pre("save", function (next) {
  if (this.fiblQuestions.length > 2) {
    return next(new Error("FIB-L cannot exceed 2 questions"));
  }
  next();
});

export default mongoose.model("FIBL", FIBLSchema);
