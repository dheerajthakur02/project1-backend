import mongoose from "mongoose";

const RSSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    repeatSentenceQuestions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "RepeatQuestion" }
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("RS", RSSchema);

RSSchema.pre("save", function (next) {
  const totalQuestions =
    this.repeatSentenceQuestions.length 
  if (totalQuestions > 5) {
    return next(
      new Error("Speaking section cannot have more than 40 questions")
    );
  }

  next();
});


const RSResultSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  RSId: { type: mongoose.Schema.Types.ObjectId, ref: 'RS' },
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