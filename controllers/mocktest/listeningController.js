
import Listening, { ListeningResult } from "../../models/mocktest/Listening.js";

import { SSTQuestion } from "../../models/listening/SSTQuestion.js";
import { ListeningFIBQuestion } from "../../models/listening/ListeningFIBQuestion.js";
import { HighlightSummaryQuestion } from "../../models/listening/HCSQuestion.js";
import { SelectMissingWordQuestion } from "../../models/listening/SelectMissingWord.js";
import { WriteFromDictationQuestion } from "../../models/listening/WriteFromDictation.js";
import { HIWQuestion } from "../../models/listening/HIW.js";


// Listening Controllers
import mongoose from "mongoose";
import { ListeningMultiChoiceMultiAnswer } from "../../models/listening/ListeningMultiChoiceMultiAnswer.js";
import { ChooseSingleAnswerQuestion } from "../../models/listening/ChooseSingleAnswer.js";

export const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedQuestion = await Listening.findByIdAndDelete(id);

    if (!deletedQuestion) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Question deleted successfully",
      data: deletedQuestion,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



export const createListening = async (req, res) => {
  try {
    const {
      title,
      summarizeSpokenTextQuestions = [],
      multipleChoiceMultiple = [],
      fillInTheBlanks = [],
      highlightIncorrectSummary = [],
      multipleChoiceSingle = [],
      selectMissingWord = [],
      highLightIncorrectWords = [],
      writeFromDictation = [],
    } = req.body;

    // Combine all question IDs for validation and uniqueness checks
    const allQuestionIds = [
      ...summarizeSpokenTextQuestions,
      ...multipleChoiceMultiple,
      ...fillInTheBlanks,
      ...highlightIncorrectSummary,
      ...multipleChoiceSingle,
      ...selectMissingWord,
      ...highLightIncorrectWords,
      ...writeFromDictation,
    ];

    // 1️⃣ Title check
    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    // 2️⃣ Total questions limit (adjust as needed for Listening section)
    const MAX_LISTENING_QUESTIONS = 20; // Example limit
    if (allQuestionIds.length > MAX_LISTENING_QUESTIONS) {
      return res.status(400).json({
        success: false,
        message: `Listening section cannot have more than ${MAX_LISTENING_QUESTIONS} questions in total`,
      });
    }

    // 3️⃣ Validate ObjectIds
    const invalidIds = allQuestionIds.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );

    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid Question IDs found",
        invalidIds,
      });
    }

    // 4️⃣ Remove duplicates within the combined list of all questions
    const uniqueQuestionIds = [...new Set(allQuestionIds.map(String))];

    // 5️⃣ Check if all provided question IDs exist in their respective collections
    const checkQuestionsExist = async (ids, Model) => {
      const existing = await Model.find({ _id: { $in: ids } }).select("_id");
      return existing.map((q) => q._id.toString());
    };

    const existingSummarizeSpokenText = await checkQuestionsExist(summarizeSpokenTextQuestions, SSTQuestion);
    const existingMultipleChoiceMultiple = await checkQuestionsExist(multipleChoiceMultiple, ListeningMultiChoiceMultiAnswer );
    const existingFillInTheBlanks = await checkQuestionsExist(fillInTheBlanks, ListeningFIBQuestion);
    const existingHighlightIncorrectSummary = await checkQuestionsExist(highlightIncorrectSummary, HighlightSummaryQuestion);
    const existingMultipleChoiceSingle = await checkQuestionsExist(multipleChoiceSingle, ChooseSingleAnswerQuestion);
    const existingSelectMissingWord = await checkQuestionsExist(selectMissingWord, SelectMissingWordQuestion);
    const existingHighlightIncorrectWords = await checkQuestionsExist(highLightIncorrectWords, HIWQuestion);
    const existingWriteFromDictation = await checkQuestionsExist(writeFromDictation, WriteFromDictationQuestion);


    const providedSummarizeSpokenText = summarizeSpokenTextQuestions.map(String);
    const providedMultipleChoiceMultiple = multipleChoiceMultiple.map(String);
    const providedFillInTheBlanks = fillInTheBlanks.map(String);
    const providedHighlightIncorrectSummary = highlightIncorrectSummary.map(String);
    const providedMultipleChoiceSingle = multipleChoiceSingle.map(String);
    const providedSelectMissingWord = selectMissingWord.map(String);
    const providedHighlightIncorrectWords = highLightIncorrectWords.map(String);
    const providedWriteFromDictation = writeFromDictation.map(String);

    const missingIds = [
      ...providedSummarizeSpokenText.filter(id => !existingSummarizeSpokenText.includes(id)),
      ...providedMultipleChoiceMultiple.filter(id => !existingMultipleChoiceMultiple.includes(id)),
      ...providedFillInTheBlanks.filter(id => !existingFillInTheBlanks.includes(id)),
      ...providedHighlightIncorrectSummary.filter(id => !existingHighlightIncorrectSummary.includes(id)),
      ...providedMultipleChoiceSingle.filter(id => !existingMultipleChoiceSingle.includes(id)),
      ...providedSelectMissingWord.filter(id => !existingSelectMissingWord.includes(id)),
      ...providedHighlightIncorrectWords.filter(id => !existingHighlightIncorrectWords.includes(id)),
      ...providedWriteFromDictation.filter(id => !existingWriteFromDictation.includes(id)),
    ];

    if (missingIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Some provided questions do not exist in their respective collections",
        missingIds,
      });
    }

    // 6️⃣ Ensure questions are not already used in another Listening section
    const alreadyUsedListening = await Listening.findOne({
      $or: [
        { summarizeSpokenTextQuestions: { $in: uniqueQuestionIds } },
        { multipleChoiceMultiple: { $in: uniqueQuestionIds } },
        { fillInTheBlanks: { $in: uniqueQuestionIds } },
        { highlightIncorrectSummary: { $in: uniqueQuestionIds } },
        { multipleChoiceSingle: { $in: uniqueQuestionIds } },
        { selectMissingWord: { $in: uniqueQuestionIds } },
        { highLightIncorrectWords: { $in: uniqueQuestionIds } },
        { writeFromDictation: { $in: uniqueQuestionIds } },
      ],
    }).select("title");

    if (alreadyUsedListening) {
      return res.status(400).json({
        success: false,
        message:
          "One or more questions are already used in another Listening section.",
        usedInListeningTitle: alreadyUsedListening.title,
      });
    }

    // 7️⃣ Create Listening section
    const listening = new Listening({
      title,
      summarizeSpokenTextQuestions: providedSummarizeSpokenText,
      multipleChoiceMultiple: providedMultipleChoiceMultiple,
      fillInTheBlanks: providedFillInTheBlanks,
      highlightIncorrectSummary: providedHighlightIncorrectSummary,
      multipleChoiceSingle: providedMultipleChoiceSingle,
      selectMissingWord: providedSelectMissingWord,
      highLightIncorrectWords: providedHighlightIncorrectWords,
      writeFromDictation: providedWriteFromDictation,
    });

    await listening.save();

    res.status(201).json({
      success: true,
      message: "Listening test created successfully",
      data: listening,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


export const getAllListenings = async (req, res) => {
  try {
    const listenings = await Listening.find()
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: listenings.length,
      data: listenings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===================== GET LISTENING BY ID ===================== */
export const getListeningById = async (req, res) => {
  try {
    const { id } = req.params;

    const listeningSection = await Listening.findById(id)
      // .populate("summarizeSpokenTextQuestions")
       .populate("multipleChoiceMultiple")
      // .populate("fillInTheBlanks")
      // .populate("highlightIncorrectSummary")
       .populate("multipleChoiceSingle")
      // .populate("selectMissingWord")
      // .populate("highLightIncorrectWords")
      // .populate("writeFromDictation");

    if (!listeningSection) {
      return res.status(404).json({
        success: false,
        message: "Listening section not found",
      });
    }

    res.status(200).json({
      success: true,
      data: listeningSection,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch Listening section",
    });
  }
};



export const updateListening = async (req, res) => {
  try {
    const listening = await Listening.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!listening) {
      return res.status(404).json({
        success: false,
        message: "Listening test not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Listening test updated successfully",
      data: listening,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


export const deleteListening = async (req, res) => {
  try {
    const listening = await Listening.findByIdAndDelete(req.params.id);

    if (!listening) {
      return res.status(404).json({
        success: false,
        message: "Listening test not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Listening test deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



export const submitListeningResult = async (req, res) => {
  try {
    const { listeningId, answers, userId } = req.body; // Expect answers array now
    // answers: [{ questionId, type, answer }]

    if (!answers || !Array.isArray(answers)) {
         // Fallback to old behavior if 'scores' passed? No, force new behavior.
         return res.status(400).json({ success: false, message: "Invalid answers format" });
    }

    const test = await Listening.findById(listeningId)
      .populate("summarizeSpokenTextQuestions")
      .populate("multipleChoiceMultiple")
      .populate("fillInTheBlanks")
      .populate("highlightIncorrectSummary")
      .populate("multipleChoiceSingle")
      .populate("selectMissingWord")
      .populate("highLightIncorrectWords")
      .populate("writeFromDictation");

    if (!test) return res.status(404).json({ success: false, message: "Test not found" });

    // Helper
    const allQ = [
        ...(test.summarizeSpokenTextQuestions || []),
        ...(test.multipleChoiceMultiple || []),
        ...(test.fillInTheBlanks || []),
        ...(test.highlightIncorrectSummary || []),
        ...(test.multipleChoiceSingle || []),
        ...(test.selectMissingWord || []),
        ...(test.highLightIncorrectWords || []),
        ...(test.writeFromDictation || [])
    ];
    const findQ = (id) => allQ.find(q => q._id.toString() === id);

    let totalScore = 0;
    const scores = [];

    for (const ans of answers) {
        const q = findQ(ans.questionId);
        let score = 0;
        let max = 1;

        if (q) {
            if (ans.type === "SST") { // Summarize Spoken Text
                // Form + Content + Grammar
                const words = (ans.answer || "").split(" ").length;
                if (words >= 40 && words <= 100) score = 10;
                else score = 0;
                max = 10;
            } else if (ans.type === "WFD") { // Write From Dictation
                const transcript = (q.transcript || "").toLowerCase().split(" ");
                const userWords = (ans.answer || "").toLowerCase().split(" ");
                let hits = 0;
                transcript.forEach(w => { if(userWords.includes(w)) hits++; });
                score = hits;
                max = transcript.length;
            } else if (ans.type === "FIB_L") { // Fill In The Blanks (Listening)
                 // Object { 0: "word", 1: "word" } - assuming `q.correctAnswers` is an array of correct words
                 if (ans.answer && typeof ans.answer === 'object' && Array.isArray(q.correctAnswers)) {
                    let hits = 0;
                    Object.values(ans.answer).forEach((userWord, index) => {
                        if (userWord && q.correctAnswers[index] && userWord.toLowerCase() === q.correctAnswers[index].toLowerCase()) {
                            hits++;
                        }
                    });
                    score = hits;
                    max = q.correctAnswers.length;
                 } else {
                     max = q.correctAnswers?.length || 1;
                 }
            } else if (ans.type === "HIW") { // Highlight Incorrect Words
                // +1 correct, -1 incorrect
                // q.incorrectWords should be an array of incorrect words
                const correctIncorrectWords = q.incorrectWords || [];
                let hits = 0;
                if (Array.isArray(ans.answer)) {
                    ans.answer.forEach(word => {
                        if (correctIncorrectWords.includes(word)) hits++;
                        else hits--; // Penalty for selecting correct words as incorrect
                    });
                }
                score = Math.max(0, hits); // Score cannot be negative
                max = correctIncorrectWords.length;
            } else if (ans.type === "MCM") { // Multiple Choice Multiple
                max = q.options?.length || 1; // Assuming max score is number of correct options
                if (Array.isArray(ans.answer) && Array.isArray(q.correctAnswer)) {
                    const correctSelected = ans.answer.filter(a => q.correctAnswer.includes(a));
                    const incorrectSelected = ans.answer.filter(a => !q.correctAnswer.includes(a));
                    score = correctSelected.length - incorrectSelected.length; // Correct - Incorrect
                    score = Math.max(0, score); // Score cannot be negative
                    max = q.correctAnswer.length;
                }
            } else if (ans.type === "MCS" || ans.type === "SMW") { // Multiple Choice Single / Select Missing Word
                max = 1;
                if (ans.answer === q.correctAnswer) score = 1;
            } else if (ans.type === "HIS") { // Highlight Incorrect Summary - assuming single correct option
                 max = 1;
                 if (ans.answer === q.correctAnswer) score = 1;
            }
        }

        scores.push({
            questionId: ans.questionId,
            questionType: ans.type,
            score: score,
            maxScore: max
        });
        totalScore += score;
    }

    const result = new ListeningResult({
      user: req.user?._id || userId,
      testId: listeningId, // Renamed
      testModel: 'Listening', // Default
      scores,
      overallScore: totalScore,
    });

    await result.save();

    res.status(201).json({
      success: true,
      message: "Listening result submitted successfully",
      data: result,
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMyListeningResults = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const results = await ListeningResult.find({ user: userId })
      .populate("testId", "title name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const getResultsByListeningId = async (req, res) => {
  try {
    const results = await ListeningResult.find({
      testId: req.params.listeningId, // Query by testId
    })
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const getListeningResultById = async (req, res) => {
  try {
    const result = await ListeningResult.findById(req.params.id)
      .populate("user", "name email")
      .populate("testId", "title");

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Result not found",
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * ✅ GET UNUSED QUESTIONS FOR LISTENING SECTION
 * This controller fetches questions of each type that are NOT currently used in any Listening section.
 */
export const getUnusedListeningQuestions = async (req, res) => {
  try {
    // Find all questions currently used in any Listening section
    const usedQuestionsInListening = await Listening.find({}, {
      summarizeSpokenTextQuestions: 1,
      multipleChoiceMultiple: 1,
      fillInTheBlanks: 1,
      highlightIncorrectSummary: 1,
      multipleChoiceSingle: 1,
      selectMissingWord: 1,
      highLightIncorrectWords: 1,
      writeFromDictation: 1,
      _id: 0
    });

    const usedSummarizeSpokenTextIds = new Set();
    const usedMultipleChoiceMultipleIds = new Set();
    const usedFillInTheBlanksIds = new Set();
    const usedHighlightIncorrectSummaryIds = new Set();
    const usedMultipleChoiceSingleIds = new Set();
    const usedSelectMissingWordIds = new Set();
    const usedHighlightIncorrectWordsIds = new Set();
    const usedWriteFromDictationIds = new Set();

    usedQuestionsInListening.forEach(listening => {
      listening.summarizeSpokenTextQuestions.forEach(id => usedSummarizeSpokenTextIds.add(id.toString()));
      listening.multipleChoiceMultiple.forEach(id => usedMultipleChoiceMultipleIds.add(id.toString()));
      listening.fillInTheBlanks.forEach(id => usedFillInTheBlanksIds.add(id.toString()));
      listening.highlightIncorrectSummary.forEach(id => usedHighlightIncorrectSummaryIds.add(id.toString()));
      listening.multipleChoiceSingle.forEach(id => usedMultipleChoiceSingleIds.add(id.toString()));
      listening.selectMissingWord.forEach(id => usedSelectMissingWordIds.add(id.toString()));
      listening.highLightIncorrectWords.forEach(id => usedHighlightIncorrectWordsIds.add(id.toString()));
      listening.writeFromDictation.forEach(id => usedWriteFromDictationIds.add(id.toString()));
    });

    // Fetch all questions of each type and filter out the used ones
    const unusedSummarizeSpokenText = await SSTQuestion.find({ _id: { $nin: Array.from(usedSummarizeSpokenTextIds) } });
    const unusedMultipleChoiceMultiple = await ListeningMultiChoiceMultiAnswer.find({ _id: { $nin: Array.from(usedMultipleChoiceMultipleIds) } });
    const unusedFillInTheBlanks = await ListeningFIBQuestion.find({ _id: { $nin: Array.from(usedFillInTheBlanksIds) } });
    const unusedHighlightIncorrectSummary = await HighlightSummaryQuestion.find({ _id: { $nin: Array.from(usedHighlightIncorrectSummaryIds) } });
    const unusedMultipleChoiceSingle = await ChooseSingleAnswerQuestion.find({ _id: { $nin: Array.from(usedMultipleChoiceSingleIds) } });
    const unusedSelectMissingWord = await SelectMissingWordQuestion.find({ _id: { $nin: Array.from(usedSelectMissingWordIds) } });
    const unusedHighlightIncorrectWords = await HIWQuestion.find({ _id: { $nin: Array.from(usedHighlightIncorrectWordsIds) } });
    const unusedWriteFromDictation = await WriteFromDictationQuestion.find({ _id: { $nin: Array.from(usedWriteFromDictationIds) } });

    res.status(200).json({
      success: true,
      data: {
        summarizeSpokenText: unusedSummarizeSpokenText,
        multipleChoiceMultiple: unusedMultipleChoiceMultiple,
        fillInTheBlanks: unusedFillInTheBlanks,
        highlightIncorrectSummary: unusedHighlightIncorrectSummary,
        multipleChoiceSingle: unusedMultipleChoiceSingle,
        selectMissingWord: unusedSelectMissingWord,
        highLightIncorrectWords: unusedHighlightIncorrectWords,
        writeFromDictation: unusedWriteFromDictation,
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};