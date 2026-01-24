import mongoose from "mongoose";

const SSTGroupSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    summarizeSpokenTextQuestion: [
      { type: mongoose.Schema.Types.ObjectId, ref: "SSTQuestion" }
    ],
  },
  { timestamps: true }
);

// ✅ MAX ONE QUESTION ONLY
SSTGroupSchema.pre("save", function () {
  if (this.summarizeSpokenTextQuestion.length > 1) {
    return next(
      new Error("SST section can contain only 1 question")
    );
  }
});





const SSTGroupResultSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  sstGroupId: { type: mongoose.Schema.Types.ObjectId, ref: "SSTGroup" },
  overallScore: Number,
  scores: [
    {
      questionType: String,
      contentScore: Number,
      fluencyScore: Number,
      pronunciationScore: Number,
      audioUrl: String
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

export const SSTGroup = mongoose.model("SSTGroup", SSTGroupSchema)
export const SSTGroupResult = mongoose.model("SSTGroupResult", SSTGroupResultSchema);


