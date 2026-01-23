import mongoose from "mongoose";

const ReadingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    summarizeWrittenText: [
      { type: mongoose.Schema.Types.ObjectId, ref: "SummarizeTextQuestion" }
    ],
    fillInTheBlanksDropdown: [
      { type: mongoose.Schema.Types.ObjectId, ref: "ReadingFIBDropdown" }
    ],
    multipleChoiceMultiple: [
      { type: mongoose.Schema.Types.ObjectId, ref: "ReadingMultiChoiceMultiAnswer" }
    ],
    reOrderParagraphs: [
      { type: mongoose.Schema.Types.ObjectId, ref: "ReadingReorder" }
    ],
    fillInTheBlanksWithDragDrop: [
      { type: mongoose.Schema.Types.ObjectId, ref: "ReadingFIBDragDrop" }
    ],
    multipleChoiceSingle: [
      { type: mongoose.Schema.Types.ObjectId, ref: "ReadingMultiChoiceSingleAnswer" }
    ],
    highLightCorrectSummary: [
      { type: mongoose.Schema.Types.ObjectId, ref: "HighlightSummaryQuestion" }
    ],
    highlightIncorrectWords: [
      { type: mongoose.Schema.Types.ObjectId, ref: "HIWQuestion" }
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Reading", ReadingSchema);

ReadingSchema.pre("save", function (next) {
  const totalQuestions =
    this.summarizeWrittenText.length +
    this.fillInTheBlanksDropdown.length +
    this.multipleChoiceMultiple.length +
    this.reOrderParagraphs.length +
    this.fillInTheBlanksWithDragDrop.length +
    this.multipleChoiceSingle.length +
    this.highLightCorrectSummary.length +
    this.highlightIncorrectWords.length

  if (totalQuestions > 20) {
    return next(
      new Error("Writing section cannot have more than 20 questions")
    );
  }

  next();
});


const ReadingResultSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  readingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reading' },
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

export const ReadingResult = mongoose.model("ReadingResult", ReadingResultSchema);