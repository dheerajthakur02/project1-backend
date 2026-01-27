import mongoose from "mongoose";

const RTSSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    rtsQuestions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "RespondSituationQuestion" },
    ],
  },
  { timestamps: true }
);

RTSSchema.pre("save", function () {
  if (this.rtsQuestions.length > 3) {
    return next(new Error("RTS cannot exceed 3 questions"));
  }

});

export default mongoose.model("RTS", RTSSchema);
