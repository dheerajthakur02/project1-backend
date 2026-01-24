import mongoose from "mongoose";

const SGDSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    summarizeGroupDiscussionQuestions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "SummarizeGroupQuestion" }
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

SGDSchema.pre("save", function () {
  const totalQuestions =
    this.summarizeGroupDiscussionQuestions.length 
  if (totalQuestions > 3) {
    return next(
      new Error("Speaking section cannot have more than 40 questions")
    );
  }

});


const SGDResultSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  SGDId: { type: mongoose.Schema.Types.ObjectId, ref: 'SGD' },
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

export const SGD =  mongoose.model("SGD", SGDSchema);
