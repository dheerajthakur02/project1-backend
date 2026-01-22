import mongoose from "mongoose";

const ListeningSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    repeatSentenceQuestions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "RepeatQuestion" }
    ],

    reTellLectureQuestions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "RetellLectureQuestion" }
    ],

    answerShortQuestion: [
      { type: mongoose.Schema.Types.ObjectId, ref: "ShortAnswerQuestion" }
    ],

    summarizeGroupDiscussion: [
      { type: mongoose.Schema.Types.ObjectId, ref: "SummarizeGroupQuestion" }
    ],

    summarizeSpokenTextQuestions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "SSTQuestion" }
    ],

    multipleChoiceMultiple: [
      { type: mongoose.Schema.Types.ObjectId, ref: "ListeningMultiChoiceMultiAnswer" }
    ],

    fillInTheBlanks: [
      { type: mongoose.Schema.Types.ObjectId, ref: "ListeningFIBQuestion" }
    ],

    highlightIncorrectSummary: [
      { type: mongoose.Schema.Types.ObjectId, ref: "HighlightSummaryQuestion" }
    ],

    multipleChoiceSingle: [
      { type: mongoose.Schema.Types.ObjectId, ref: "ChooseSingleAnswerQuestion" }
    ],

     selectMissingWord: [
      { type: mongoose.Schema.Types.ObjectId, ref: "SelectMissingWordQuestion" }
    ],

    highLightIncorrectWords: [
      { type: mongoose.Schema.Types.ObjectId, ref: "HIWQuestion" }
    ],

    writeFromDictation: [
      { type: mongoose.Schema.Types.ObjectId, ref: "WriteFromDictationQuestion" }
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Listening", ListeningSchema);

ListeningSchema.pre("save", function (next) {
  const totalQuestions =
   this.repeatSentenceQuestions.length +
   this.reTellLectureQuestions.length +
   this.answerShortQuestion.length +
   this.summarizeGroupDiscussion.length +
   this.summarizeSpokenTextQuestions.length +
   this.multipleChoiceMultiple.length +
   this.fillInTheBlanks.length +
   this.highlightIncorrectSummary.length +
   this.multipleChoiceSingle.length +
   this.selectMissingWord.length +
   this.highLightIncorrectWords.length +
   this.writeFromDictation.length;

  if (totalQuestions > 40) {
    return next(
      new Error("Listening section cannot have more than 40 questions")
    );
  }

  next();
});


const ListeningResultSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  listeningId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listening' },
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

export const ListeningResult = mongoose.model("ListeningResult", ListeningResultSchema);