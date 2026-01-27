import mongoose from "mongoose";

const ROSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    reorderQuestions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "ReadingReorder" },
    ],
  },
  { timestamps: true }
);

// 🔒 Max 5 questions
ROSchema.pre("save", function () {
  if (this.reorderQuestions.length > 5) {
    return next(new Error("Reorder section cannot exceed 5 questions"));
  }
 
});

export default mongoose.model("RO", ROSchema);
