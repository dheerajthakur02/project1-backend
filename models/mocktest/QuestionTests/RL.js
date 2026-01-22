import mongoose from "mongoose";

const RLSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    readAloudQuestions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "readaloud" }
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("RL", RLSchema);

RLSchema.pre("save", function (next) {
  const totalQuestions =
    this.readAloudQuestions.length 
  if (totalQuestions > 5) {
    return next(
      new Error("Speaking section cannot have more than 40 questions")
    );
  }

  next();
});


const RLResultSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  RLId: { type: mongoose.Schema.Types.ObjectId, ref: 'RL' },
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