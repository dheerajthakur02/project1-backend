import mongoose from "mongoose";

const RTSSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    rtsQuestions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "RTSQuestion" },
    ],
  },
  { timestamps: true }
);

RTSSchema.pre("save", function (next) {
  if (this.rtsQuestions.length > 3) {
    return next(new Error("RTS cannot exceed 3 questions"));
  }
  next();
});

export default mongoose.model("RTS", RTSSchema);
