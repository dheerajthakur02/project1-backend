import mongoose from "mongoose";

const RETellSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    reTellQuestions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "RetellLectureQuestion" }
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);


RETellSchema.pre("save", function () {
  if (this.reTellQuestions.length > 5) {
    throw new Error("Speaking section cannot have more than 5 questions");
  }
});



export default mongoose.model("RETELL", RETellSchema);



const ReTellResultSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ReTellId: { type: mongoose.Schema.Types.ObjectId, ref: 'RETELL' },
  overallScore: Number,
  scores: [
    {
      questionType: String,
      contentScore: Number,
      fluencyScore: Number,
      pronunciationScore: Number,
      audioUrl: String // Path to their recorded answer
    }
  ],
  createdAt: { type: Date, default: Date.now }
});