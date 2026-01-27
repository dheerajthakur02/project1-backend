import mongoose from "mongoose";

const FIBRWSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    fibQuestions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "ReadingFIBDropdown" },
    ],
  },
  { timestamps: true }
);

// 🔒 Max 5 questions
FIBRWSchema.pre("save", function () {
  if (this.fibQuestions.length > 5) {
    return next(new Error("FIB RW cannot exceed 5 questions"));
  }

});

export default mongoose.model("FIBRW", FIBRWSchema);
