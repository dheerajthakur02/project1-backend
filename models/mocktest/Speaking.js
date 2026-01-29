import mongoose from "mongoose";

const SpeakingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    readAloudQuestions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "readaloud" }
    ],

    repeatSentenceQuestions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "RepeatQuestion" }
    ],

    describeImageQuestions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "ImageQuestion" }
    ],

    reTellLectureQuestions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "RetellLectureQuestion" }
    ],

    summarizeSpokenTextQuestions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "SSTQuestion" }
    ],

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

export default mongoose.model("Speaking", SpeakingSchema);

SpeakingSchema.pre("save", function (next) {
  const totalQuestions =
    this.readAloudQuestions.length +
    this.repeatSentenceQuestions.length +
    this.describeImageQuestions.length +
    this.reTellLectureQuestions.length +
    this.summarizeSpokenTextQuestions.length +
    this.highlightIncorrectWordsQuestions.length;

  if (totalQuestions > 40) {
    return next(
      new Error("Speaking section cannot have more than 40 questions")
    );
  }

  next();
});


const SpeakingResultSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Dynamic Reference to handle both Full Speaking Section and individual Question Tests (RS, DI, etc.)
  testId: { type: mongoose.Schema.Types.ObjectId, refPath: 'testModel' },
  testModel: { 
    type: String, 
    required: true, 
    enum: ['Speaking', 'RS', 'DI', 'RL', 'SST', 'HIW', 'readaloud'] // Add other speaking/listening models as needed
  },
  overallScore: Number,
  sectionScores: {
    content: Number,
    fluency: Number,
    pronunciation: Number
  },
  scores: [
    {
      questionId: { type: mongoose.Schema.Types.ObjectId },
      questionType: String,
      userTranscript: String,
      score: Number,
      maxScore: Number,
      contentScore: Number,
      fluencyScore: Number,
      pronunciationScore: Number,
      audioUrl: String,
      wordAnalysis: [
        {
          word: String,
          status: String // 'correct', 'incorrect', 'missing'
        }
      ]
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

export const SpeakingResult = mongoose.model("SpeakingResult", SpeakingResultSchema);