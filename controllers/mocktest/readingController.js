import Reading, { ReadingResult } from "../../models/mocktest/Reading.js";

import { SummarizeTextQuestion } from "../../models/writing/SummarizeText.js";
import { ReadingFIBDragDrop } from "../../models/readingFIBDragDrop.model.js";
import { ReadingFIBDropdown } from "../../models/readingFIBDropdown.model.js";
import { ReadingMultiChoiceMultiAnswer } from "../../models/readingMultiChoiceMultiAnswer.model.js";
import { ReadingMultiChoiceSingleAnswer } from "../../models/readingMultiChoiceSingleAnswer.model.js";
import { ReadingReorder } from "../../models/readingReorder.model.js";
import { HighlightSummaryQuestion } from "../../models/listening/HCSQuestion.js";
import { HIWQuestion } from "../../models/listening/HIW.js";


import mongoose from "mongoose";

/**
 * ✅ CREATE READING SECTION
 */
export const createReading = async (req, res) => {
  try {
    const {
      title,
      summarizeWrittenText = [],
      fillInTheBlanksDropdown = [],
      multipleChoiceMultiple = [],
      reOrderParagraphs = [],
      fillInTheBlanksWithDragDrop = [],
      multipleChoiceSingle = [],
      highLightCorrectSummary = [],
      highlightIncorrectWords = [],
    } = req.body;

    // Combine all question IDs for validation and uniqueness checks
    const allQuestionIds = [
      ...summarizeWrittenText,
      ...fillInTheBlanksDropdown,
      ...multipleChoiceMultiple,
      ...reOrderParagraphs,
      ...fillInTheBlanksWithDragDrop,
      ...multipleChoiceSingle,
      ...highLightCorrectSummary,
      ...highlightIncorrectWords,
    ];

    // 1️⃣ Title check
    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    // 2️⃣ Total questions limit (adjust as needed for Reading section)
    const MAX_READING_QUESTIONS = 20; // Example limit from comment
    if (allQuestionIds.length > MAX_READING_QUESTIONS) {
      return res.status(400).json({
        success: false,
        message: `Reading section cannot have more than ${MAX_READING_QUESTIONS} questions in total`,
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

    const existingSummarizeWrittenText = await checkQuestionsExist(summarizeWrittenText, SummarizeTextQuestion);
    const existingFillInTheBlanksDropdown = await checkQuestionsExist(fillInTheBlanksDropdown, ReadingFIBDropdown);
    const existingMultipleChoiceMultiple = await checkQuestionsExist(multipleChoiceMultiple, ReadingMultiChoiceMultiAnswer);
    const existingReorderParagraphs = await checkQuestionsExist(reOrderParagraphs, ReadingReorder);
    const existingFillInTheBlanksWithDragDrop = await checkQuestionsExist(fillInTheBlanksWithDragDrop, ReadingFIBDragDrop);
    const existingMultipleChoiceSingle = await checkQuestionsExist(multipleChoiceSingle, ReadingMultiChoiceSingleAnswer);
    const existingHighlightCorrectSummary = await checkQuestionsExist(highLightCorrectSummary, HighlightSummaryQuestion);
    const existingHighlightIncorrectWords = await checkQuestionsExist(highlightIncorrectWords, HIWQuestion);


    const providedSummarizeWrittenText = summarizeWrittenText.map(String);
    const providedFillInTheBlanksDropdown = fillInTheBlanksDropdown.map(String);
    const providedMultipleChoiceMultiple = multipleChoiceMultiple.map(String);
    const providedReorderParagraphs = reOrderParagraphs.map(String);
    const providedFillInTheBlanksWithDragDrop = fillInTheBlanksWithDragDrop.map(String);
    const providedMultipleChoiceSingle = multipleChoiceSingle.map(String);
    const providedHighlightCorrectSummary = highLightCorrectSummary.map(String);
    const providedHighlightIncorrectWords = highlightIncorrectWords.map(String);

    const missingIds = [
      ...providedSummarizeWrittenText.filter(id => !existingSummarizeWrittenText.includes(id)),
      ...providedFillInTheBlanksDropdown.filter(id => !existingFillInTheBlanksDropdown.includes(id)),
      ...providedMultipleChoiceMultiple.filter(id => !existingMultipleChoiceMultiple.includes(id)),
      ...providedReorderParagraphs.filter(id => !existingReorderParagraphs.includes(id)),
      ...providedFillInTheBlanksWithDragDrop.filter(id => !existingFillInTheBlanksWithDragDrop.includes(id)),
      ...providedMultipleChoiceSingle.filter(id => !existingMultipleChoiceSingle.includes(id)),
      ...providedHighlightCorrectSummary.filter(id => !existingHighlightCorrectSummary.includes(id)),
      ...providedHighlightIncorrectWords.filter(id => !existingHighlightIncorrectWords.includes(id)),
    ];

    if (missingIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Some provided questions do not exist in their respective collections",
        missingIds,
      });
    }

    // 6️⃣ Ensure questions are not already used in another Reading section
    const alreadyUsedReading = await Reading.findOne({
      $or: [
        { summarizeWrittenText: { $in: uniqueQuestionIds } },
        { fillInTheBlanksDropdown: { $in: uniqueQuestionIds } },
        { multipleChoiceMultiple: { $in: uniqueQuestionIds } },
        { reOrderParagraphs: { $in: uniqueQuestionIds } },
        { fillInTheBlanksWithDragDrop: { $in: uniqueQuestionIds } },
        { multipleChoiceSingle: { $in: uniqueQuestionIds } },
        { highLightCorrectSummary: { $in: uniqueQuestionIds } },
        { highlightIncorrectWords: { $in: uniqueQuestionIds } },
      ],
    }).select("title");

    if (alreadyUsedReading) {
      return res.status(400).json({
        success: false,
        message:
          "One or more questions are already used in another Reading section.",
        usedInReadingTitle: alreadyUsedReading.title,
      });
    }

    // 7️⃣ Create Reading section
    const reading = new Reading({
      title,
      summarizeWrittenText: providedSummarizeWrittenText,
      fillInTheBlanksDropdown: providedFillInTheBlanksDropdown,
      multipleChoiceMultiple: providedMultipleChoiceMultiple,
      reOrderParagraphs: providedReorderParagraphs,
      fillInTheBlanksWithDragDrop: providedFillInTheBlanksWithDragDrop,
      multipleChoiceSingle: providedMultipleChoiceSingle,
      highLightCorrectSummary: providedHighlightCorrectSummary,
      highlightIncorrectWords: providedHighlightIncorrectWords,
    });

    await reading.save(); // 🔒 max 20 questions validated in schema (if schema has this validation)

    res.status(201).json({
      success: true,
      message: "Reading section created successfully",
      data: reading,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * ✅ GET ALL READING SECTIONS
 */
export const getAllReading = async (req, res) => {
  try {
    const readingSections = await Reading.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: readingSections.length,
      data: readingSections,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch reading sections",
    });
  }
};

/**
 * ✅ GET READING BY ID (WITH QUESTIONS)
 */
export const getReadingById = async (req, res) => {
  try {
    const { id } = req.params;

    const readingSection = await Reading.findById(id)
       .populate("summarizeWrittenText")
       .populate("fillInTheBlanksDropdown")
       .populate("multipleChoiceMultiple")
       .populate("reOrderParagraphs")
       .populate("fillInTheBlanksWithDragDrop")
       .populate("multipleChoiceSingle")
       .populate("highLightCorrectSummary")
       .populate("highlightIncorrectWords");

    if (!readingSection) {
      return res.status(404).json({
        success: false,
        message: "Reading section not found",
      });
    }

    res.status(200).json({
      success: true,
      data: readingSection,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch reading section",
    });
  }
};

/**
 * ✅ UPDATE READING SECTION
 */
export const updateReading = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedReading = await Reading.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true,
        runValidators: true, // 🔒 important for question limit
      }
    );

    if (!updatedReading) {
      return res.status(404).json({
        success: false,
        message: "Reading section not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Reading section updated successfully",
      data: updatedReading,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * ✅ CALCULATE READING RESULT
 */

/**
 * ✅ CALCULATE READING RESULT (Server-Side Scoring)
 */
export const calculateReadingResult = async (req, res) => {
  try {
    const { userId, readingId, answers } = req.body;
    // answers = [{ questionId, type, answer }]

    const readingTest = await Reading.findById(readingId)
       .populate("summarizeWrittenText")
       .populate("fillInTheBlanksDropdown")
       .populate("multipleChoiceMultiple")
       .populate("reOrderParagraphs")
       .populate("fillInTheBlanksWithDragDrop")
       .populate("multipleChoiceSingle")
       .populate("highLightCorrectSummary")
       .populate("highlightIncorrectWords");

    if (!readingTest) return res.status(404).json({ success: false, message: "Reading Test not found" });

    // Helper to find question (Filtered for safety)
    const allQuestions = [
        ...(readingTest.summarizeWrittenText || []),
        ...(readingTest.fillInTheBlanksDropdown || []),
        ...(readingTest.multipleChoiceMultiple || []),
        ...(readingTest.reOrderParagraphs || []),
        ...(readingTest.fillInTheBlanksWithDragDrop || []),
        ...(readingTest.multipleChoiceSingle || []),
        ...(readingTest.highLightCorrectSummary || []),
        ...(readingTest.highlightIncorrectWords || [])
    ].filter(q => q && q._id);

    const findQuestion = (id) => allQuestions.find(q => q._id.toString() === id);

    let totalScore = 0;
    const detailedScores = [];

    if (Array.isArray(answers)) {
      for (const ans of answers) {
          const question = findQuestion(ans.questionId);
          let score = 0;
          let maxScore = 0;

          if (question) {
              // SCORING LOGIC
              try {
                if (["FIB_R", "FIB_RW", "FIB_DD", "ReadingFIBDropdown", "ReadingFIBDragDrop"].includes(ans.type)) {
                    // FIB Logic
                    maxScore = question.blanks?.length || 5;
                    if (ans.answer && typeof ans.answer === 'object') {
                        question.blanks.forEach(b => {
                            if (ans.answer[b.index] === b.correctAnswer) score += 1;
                        });
                    }
                } else if (["MCM", "MCMA", "ReadingMultiChoiceMultiAnswer"].includes(ans.type)) {
                    // Multi Choice Multi
                    maxScore = question.options?.length || 1;
                    if (Array.isArray(ans.answer)) {
                         const correct = question.correctAnswer || [];
                         ans.answer.forEach(a => {
                             if (correct.includes(a)) score += 1;
                         });
                    }
                } else if (["MCS", "ReadingMultiChoiceSingleAnswer", "HCS", "SMW"].includes(ans.type)) {
                    // Single Choice
                    maxScore = 1;
                    if (ans.answer === question.correctAnswer || ans.answer === question.answer) score = 1;
                } else if (["RO", "ReadingReorder"].includes(ans.type)) {
                    // Reorder
                    maxScore = (question.sentences?.length || 1) - 1;
                    if (Array.isArray(ans.answer) && ans.answer.length > 1) {
                         ans.answer.forEach((item, idx) => {
                            if (item.id === question.sentences[idx]?._id?.toString() || item.text === question.sentences[idx]?.text) score += 1;
                         });
                         if (score > maxScore) score = maxScore;
                    }
                } else if (["SWT", "SummarizeWrittenText"].includes(ans.type)) {
                     // Simple logic
                     maxScore = 7;
                     const answerText = typeof ans.answer === 'string' ? ans.answer : "";
                     const words = answerText.split(" ").length;
                     if (words >= 5 && words <= 75) score = 7;
                     else score = 0;
                }
              } catch (e) {
                console.error("Error scoring question:", ans.questionId, e);
              }
          }

          detailedScores.push({
              questionId: ans.questionId,
              questionType: ans.type,
              userAnswer: ans.answer,
              score: score,
              maxScore: maxScore
          });
          totalScore += score;
      }
    }

    const overallScore = Math.round(totalScore); // Raw sum for now

    const readingResult = new ReadingResult({
      user: userId,
      testId: readingId, // Fixed: Schema uses testId
      overallScore,
      scores: detailedScores, 
    });

    await readingResult.save();

    res.status(200).json({
      success: true,
      data: readingResult,
    });
  } catch (error) {
    console.error("Reading Calc Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * ✅ GET USER READING RESULTS
 */
export const getUserReadingResults = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    console.log(`getUserReadingResults: Querying for userId: ${userId}`); // DEBUG
    const results = await ReadingResult.find({ user: userId })
      .populate("testId", "title name") // Fixed: Schema uses testId
      .sort({ createdAt: -1 });

    console.log(`getUserReadingResults for ${userId}: Found ${results.length} results.`); // DEBUG
    results.forEach(r => console.log(` - ID: ${r._id}, Model: ${r.testModel}, Score: ${r.overallScore}`)); // DEBUG

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

/**
 * ✅ GET READING RESULT BY ID
 */
export const getReadingResultById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await ReadingResult.findById(id).populate("readingId");

    if (!result) return res.status(404).json({ success: false, message: "Result not found" });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ✅ GET UNUSED QUESTIONS FOR READING SECTION
 * This controller fetches questions of each type that are NOT currently used in any Reading section.
 */
export const getUnusedReadingQuestions = async (req, res) => {
  try {
    // Find all questions currently used in any Reading section
    const usedQuestionsInReading = await Reading.find({}, {
      summarizeWrittenText: 1,
      fillInTheBlanksDropdown: 1,
      multipleChoiceMultiple: 1,
      reOrderParagraphs: 1,
      fillInTheBlanksWithDragDrop: 1,
      multipleChoiceSingle: 1,
      highLightCorrectSummary: 1,
      highlightIncorrectWords: 1,
      _id: 0
    });

    const usedSummarizeWrittenTextIds = new Set();
    const usedFillInTheBlanksDropdownIds = new Set();
    const usedMultipleChoiceMultipleIds = new Set();
    const usedReorderParagraphsIds = new Set();
    const usedFillInTheBlanksWithDragDropIds = new Set();
    const usedMultipleChoiceSingleIds = new Set();
    const usedHighlightCorrectSummaryIds = new Set();
    const usedHighlightIncorrectWordsIds = new Set();


    usedQuestionsInReading.forEach(reading => {
      reading.summarizeWrittenText.forEach(id => usedSummarizeWrittenTextIds.add(id.toString()));
      reading.fillInTheBlanksDropdown.forEach(id => usedFillInTheBlanksDropdownIds.add(id.toString()));
      reading.multipleChoiceMultiple.forEach(id => usedMultipleChoiceMultipleIds.add(id.toString()));
      reading.reOrderParagraphs.forEach(id => usedReorderParagraphsIds.add(id.toString()));
      reading.fillInTheBlanksWithDragDrop.forEach(id => usedFillInTheBlanksWithDragDropIds.add(id.toString()));
      reading.multipleChoiceSingle.forEach(id => usedMultipleChoiceSingleIds.add(id.toString()));
      reading.highLightCorrectSummary.forEach(id => usedHighlightCorrectSummaryIds.add(id.toString()));
      reading.highlightIncorrectWords.forEach(id => usedHighlightIncorrectWordsIds.add(id.toString()));
    });

    // Fetch all questions of each type and filter out the used ones
    const unusedSummarizeWrittenText = await SummarizeTextQuestion.find({ _id: { $nin: Array.from(usedSummarizeWrittenTextIds) } });
    const unusedFillInTheBlanksDropdown = await ReadingFIBDropdown.find({ _id: { $nin: Array.from(usedFillInTheBlanksDropdownIds) } });
    const unusedMultipleChoiceMultiple = await ReadingMultiChoiceMultiAnswer.find({ _id: { $nin: Array.from(usedMultipleChoiceMultipleIds) } });
    const unusedReorderParagraphs = await ReadingReorder.find({ _id: { $nin: Array.from(usedReorderParagraphsIds) } });
    const unusedFillInTheBlanksWithDragDrop = await ReadingFIBDragDrop.find({ _id: { $nin: Array.from(usedFillInTheBlanksWithDragDropIds) } });
    const unusedMultipleChoiceSingle = await ReadingMultiChoiceSingleAnswer.find({ _id: { $nin: Array.from(usedMultipleChoiceSingleIds) } });
    const unusedHighlightCorrectSummary = await HighlightSummaryQuestion.find({ _id: { $nin: Array.from(usedHighlightCorrectSummaryIds) } });
    const unusedHighlightIncorrectWords = await HIWQuestion.find({ _id: { $nin: Array.from(usedHighlightIncorrectWordsIds) } });

    res.status(200).json({
      success: true,
      data: {
        summarizeWrittenText: unusedSummarizeWrittenText,
        fillInTheBlanksDropdown: unusedFillInTheBlanksDropdown,
        multipleChoiceMultiple: unusedMultipleChoiceMultiple,
        reOrderParagraphs: unusedReorderParagraphs,
        fillInTheBlanksWithDragDrop: unusedFillInTheBlanksWithDragDrop,
        multipleChoiceSingle: unusedMultipleChoiceSingle,
        highLightCorrectSummary: unusedHighlightCorrectSummary,
        highlightIncorrectWords: unusedHighlightIncorrectWords,
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedQuestion = await Reading.findByIdAndDelete(id);

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
