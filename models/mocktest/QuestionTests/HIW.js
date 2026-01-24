import mongoose from "mongoose";

const HIWSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    highlightIncorrectWordsQuestions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "HIWQuestion" }
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

HIWSchema.pre("save", function () {
  const totalQuestions =
    this.highlightIncorrectWordsQuestions.length 
  if (totalQuestions > 3) {
    return next(
      new Error("Speaking section cannot have more than 40 questions")
    );
  }

});


const HIWResultSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  HIWId: { type: mongoose.Schema.Types.ObjectId, ref: 'HIW' },
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

export const HIW =  mongoose.model("HIW", HIWSchema);
