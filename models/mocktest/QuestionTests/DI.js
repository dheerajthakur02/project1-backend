import mongoose from "mongoose";

const DISchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    describeImageQuestions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "ImageQuestion" }
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("DI", DISchema);

DISchema.pre("save", function (next) {
  const totalQuestions =
    this.describeImageQuestions.length 
  if (totalQuestions > 5) {
    return next(
      new Error("descibe image  section cannot have more than 5 questions")
    );
  }

  next();
});


const DIResultSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  DIId: { type: mongoose.Schema.Types.ObjectId, ref: 'DI' },
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