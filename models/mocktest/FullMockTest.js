import mongoose from "mongoose";

const FullMockTestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      default: () => `Full Mock Test ${new Date().toLocaleDateString()}`
    },
    // Part 1: Speaking & Writing
    speaking: {
      readAloud: [{ type: mongoose.Schema.Types.ObjectId, ref: "readaloud" }],
      repeatSentence: [{ type: mongoose.Schema.Types.ObjectId, ref: "RepeatQuestion" }],
      describeImage: [{ type: mongoose.Schema.Types.ObjectId, ref: "ImageQuestion" }],
      reTellLecture: [{ type: mongoose.Schema.Types.ObjectId, ref: "RetellLectureQuestion" }],
      answerShortQuestion: [{ type: mongoose.Schema.Types.ObjectId, ref: "ShortAnswerQuestion" }],
    },
    writing: {
      summarizeWrittenText: [{ type: mongoose.Schema.Types.ObjectId, ref: "SummarizeTextQuestion" }],
      writeEssay: [{ type: mongoose.Schema.Types.ObjectId, ref: "WriteEssayQuestion" }],
    },
    // Part 2: Reading
    reading: {
      fillInTheBlanksDropdown: [{ type: mongoose.Schema.Types.ObjectId, ref: "ReadingFIBDropdown" }],
      multipleChoiceMultiple: [{ type: mongoose.Schema.Types.ObjectId, ref: "ReadingMultiChoiceMultiAnswer" }],
      reOrderParagraphs: [{ type: mongoose.Schema.Types.ObjectId, ref: "ReadingReorder" }],
      fillInTheBlanksDragDrop: [{ type: mongoose.Schema.Types.ObjectId, ref: "ReadingFIBDragDrop" }],
      multipleChoiceSingle: [{ type: mongoose.Schema.Types.ObjectId, ref: "ReadingMultiChoiceSingleAnswer" }],
    },
    // Part 3: Listening
    listening: {
      summarizeSpokenText: [{ type: mongoose.Schema.Types.ObjectId, ref: "SSTQuestion" }],
      multipleChoiceMultiple: [{ type: mongoose.Schema.Types.ObjectId, ref: "ListeningMultiChoiceMultiAnswer" }],
      fillInTheBlanks: [{ type: mongoose.Schema.Types.ObjectId, ref: "ListeningFIBQuestion" }],
      highlightCorrectSummary: [{ type: mongoose.Schema.Types.ObjectId, ref: "HighlightSummaryQuestion" }],
      multipleChoiceSingle: [{ type: mongoose.Schema.Types.ObjectId, ref: "ChooseSingleAnswerQuestion" }],
      selectMissingWord: [{ type: mongoose.Schema.Types.ObjectId, ref: "SelectMissingWordQuestion" }],
      highlightIncorrectWords: [{ type: mongoose.Schema.Types.ObjectId, ref: "HIWQuestion" }],
      writeFromDictation: [{ type: mongoose.Schema.Types.ObjectId, ref: "WriteFromDictationQuestion" }],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("FullMockTest", FullMockTestSchema);
