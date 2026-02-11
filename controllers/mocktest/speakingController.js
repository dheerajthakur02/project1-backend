import  Speaking, { SpeakingResult } from "../../models/mocktest/Speaking.js";
import mongoose from "mongoose";

import Question from "../../models/repeat.model.js";
import { ImageQuestion } from "../../models/image.model.js"
import {
  RetellLectureQuestion
} from "../../models/retell.model.js";
import { SSTQuestion } from "../../models/listening/SSTQuestion.js";
import { HIWQuestion } from "../../models/listening/HIW.js";
import ReadAloud from "../../models/readAloud.model.js"
/**
 * ✅ CREATE SPEAKING SECTION
 */
export const createSpeaking = async (req, res) => {
  try {
    const {
      title,
      readAloudQuestions = [],
      repeatSentenceQuestions = [],
      describeImageQuestions = [],
      reTellLectureQuestions = [],
      summarizeSpokenTextQuestions = [],
      highlightIncorrectWordsQuestions = [],
    } = req.body;

    const speaking = new Speaking({
      title,
      readAloudQuestions,
      repeatSentenceQuestions,
      describeImageQuestions,
      reTellLectureQuestions,
      summarizeSpokenTextQuestions,
      highlightIncorrectWordsQuestions,
    });

    await speaking.save(); // 🔒 total <= 40 validated by schema

    res.status(201).json({
      success: true,
      message: "Speaking section created successfully",
      data: speaking,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


export const getAllSpeaking = async (req, res) => {
  try {
    const speakingSections = await Speaking.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: speakingSections.length,
      data: speakingSections,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch speaking sections",
    });
  }
};
export const getSpeakingById = async (req, res) => {
  try {
    const { id } = req.params;
    const speakingSection = await Speaking.findById(id)
      .populate("readAloudQuestions")
      .populate("repeatSentenceQuestions")
      .populate("describeImageQuestions")
      .populate("reTellLectureQuestions")
      .populate("summarizeSpokenTextQuestions")
      .populate("highlightIncorrectWordsQuestions");

    if (!speakingSection) {
      return res.status(404).json({
        success: false,
        message: "Speaking section not found",
      });
    }

    res.status(200).json({
      success: true,
      data: speakingSection,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch speaking section",
    });
  }
}

export const updateSpeaking = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedSpeaking = await Speaking.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true,
        runValidators: true, // 🔒 important
      }
    );

    if (!updatedSpeaking) {
      return res.status(404).json({
        success: false,
        message: "Speaking section not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Speaking section updated successfully",
      data: updatedSpeaking,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


export const getUnusedSpeakingQuestions = async (req, res) => {
  try {
    // 1️⃣ Get all used question IDs from speaking sections
    const usedQuestionsInSpeaking = await Speaking.find(
      {},
      {
        readAloudQuestions: 1,
        repeatSentenceQuestions: 1,
        describeImageQuestions: 1,
        reTellLectureQuestions: 1,
        summarizeSpokenTextQuestions: 1,
        highlightIncorrectWordsQuestions: 1,
        _id: 0
      }
    );

    // 2️⃣ Sets to collect used IDs
    const usedReadAloudIds = new Set();
    const usedRepeatSentenceIds = new Set();
    const usedDescribeImageIds = new Set();
    const usedReTellLectureIds = new Set();
    const usedSummarizeSpokenTextIds = new Set();
    const usedHighlightIncorrectWordsIds = new Set();

    // 3️⃣ Safely extract IDs
    usedQuestionsInSpeaking.forEach(speaking => {
      (speaking.readAloudQuestions || []).forEach(id =>
        usedReadAloudIds.add(id.toString())
      );

      (speaking.repeatSentenceQuestions || []).forEach(id =>
        usedRepeatSentenceIds.add(id.toString())
      );

      (speaking.describeImageQuestions || []).forEach(id =>
        usedDescribeImageIds.add(id.toString())
      );

      (speaking.reTellLectureQuestions || []).forEach(id =>
        usedReTellLectureIds.add(id.toString())
      );

      (speaking.summarizeSpokenTextQuestions || []).forEach(id =>
        usedSummarizeSpokenTextIds.add(id.toString())
      );

      (speaking.highlightIncorrectWordsQuestions || []).forEach(id =>
        usedHighlightIncorrectWordsIds.add(id.toString())
      );
    });

    // 4️⃣ Helper to convert Set<string> → ObjectId[]
    const toObjectIds = (set) =>
      Array.from(set).map(id => new mongoose.Types.ObjectId(id));

    // 5️⃣ Fetch unused questions
    const [
      unusedReadAloud,
      unusedRepeatSentence,
      unusedDescribeImage,
      unusedReTellLecture,
      unusedSummarizeSpokenText,
      unusedHighlightIncorrectWords
    ] = await Promise.all([
      ReadAloud.find({ _id: { $nin: toObjectIds(usedReadAloudIds) } }),
      Question.find({ _id: { $nin: toObjectIds(usedRepeatSentenceIds) } }),
      ImageQuestion.find({ _id: { $nin: toObjectIds(usedDescribeImageIds) } }),
      RetellLectureQuestion.find({ _id: { $nin: toObjectIds(usedReTellLectureIds) } }),
      SSTQuestion.find({ _id: { $nin: toObjectIds(usedSummarizeSpokenTextIds) } }),
      HIWQuestion.find({ _id: { $nin: toObjectIds(usedHighlightIncorrectWordsIds) } }),
    ]);

    // 6️⃣ Response
    return res.status(200).json({
      success: true,
      data: {
        readAloud: unusedReadAloud,
        repeatSentence: unusedRepeatSentence,
        describeImage: unusedDescribeImage,
        reTellLecture: unusedReTellLecture,
        summarizeSpokenText: unusedSummarizeSpokenText,
        highlightIncorrectWords: unusedHighlightIncorrectWords,
      }
    });

  } catch (error) {
    console.error("Unused Speaking Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};




// utils/scoringHelper.js

/**
 * Compares user transcript with original text and returns a score 0-90
 */
export const compareStrings = (original, transcript) => {
  if (!transcript) return 10; // Minimum PTE score is 10
  
  const origWords = original.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").split(" ");
  const userWords = transcript.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").split(" ");

  let matches = 0;
  origWords.forEach(word => {
    if (userWords.includes(word)) matches++;
  });

  const percentage = (matches / origWords.length) * 100;
  
  // Map percentage to PTE 10-90 scale
  const pteScore = Math.round((percentage / 100) * 80) + 10;
  return pteScore > 90 ? 90 : pteScore;
};

export const calculateSpeakingResult = async (req, res) => {
  try {

    console.log("Calculating speaking result with data:", req.body);
    const { userId, speakingTestId, answers } = req.body; 

    const testData = await Speaking.findById(speakingTestId)
      .populate("readAloudQuestions")
      .populate("repeatSentenceQuestions")
      .populate("describeImageQuestions")
      .populate("reTellLectureQuestions")
      .populate("summarizeSpokenTextQuestions")
      .populate("highlightIncorrectWordsQuestions");

    if (!testData) {
        return res.status(404).json({ success: false, message: "Speaking Test not found" });
    }

    let totalContent = 0;
    let totalFluency = 0;
    let totalPronunciation = 0;
    let questionCount = Array.isArray(answers) ? answers.length : 0;

    const scores = Array.isArray(answers) ? answers.map((answer) => {
      // Find the original question text for comparison
      // Safe gathering of all questions
      const allQuestions = [
          ...(testData.readAloudQuestions || []),
          ...(testData.repeatSentenceQuestions || []),
          ...(testData.describeImageQuestions || []), // Added missing ones
          ...(testData.reTellLectureQuestions || []), // Added missing ones
          ...(testData.summarizeSpokenTextQuestions || []) // Added missing ones
      ];

      const question = allQuestions.find(q => q && q._id.toString() === answer.questionId);

      const originalText = question ? (question.text || question.content || "") : "";
      
      // Calculate Content Accuracy (0-90 scale)
      let contentScore = 0;
      try {
         contentScore = compareStrings(originalText, answer.transcript);
      } catch (e) {
         console.error("Scoring error:", e);
      }

      // AI Logic Simulation
      const fluencyScore = Math.floor(Math.random() * (90 - 60) + 60); 
      const pronunciationScore = Math.floor(Math.random() * (90 - 55) + 55);

       // 0-90 scale
      const itemScore = Math.round((contentScore + fluencyScore + pronunciationScore) / 3);
      
      totalContent += contentScore;
      totalFluency += fluencyScore;
      totalPronunciation += pronunciationScore;

      return {
        questionId: answer.questionId,
        questionType: answer.type,
        score: itemScore,
        maxScore: 90, // PTE items are roughly 90 max
        contentScore,
        fluencyScore,
        pronunciationScore,
        userTranscript: answer.transcript || "",
        audioUrl: answer.audioUrl
      };
    }) : [];

    // Avoid division by zero
    const safeCount = questionCount > 0 ? questionCount : 1; 

    const finalResult = new SpeakingResult({
      user: userId,
      testId: speakingTestId, // Renamed from speakingTestId
      testModel: 'Speaking', // Default to Speaking section
      overallScore: questionCount > 0 ? Math.round((totalContent + totalFluency + totalPronunciation) / (questionCount * 3)) : 0,
      sectionScores: {
        content: questionCount > 0 ? Math.round(totalContent / questionCount) : 0,
        fluency: questionCount > 0 ? Math.round(totalFluency / questionCount) : 0,
        pronunciation: questionCount > 0 ? Math.round(totalPronunciation / questionCount) : 0
      },
      scores: scores 
    });

    await finalResult.save();

    res.status(200).json({
      success: true,
      data: finalResult
    });
  } catch (error) {
    console.error("Speaking Calc Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserSpeakingResults = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const results = await SpeakingResult.find({ user: userId })
      .populate("testId", "title name") // Renamed from speakingTestId
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

/**
 * ✅ GET SPEAKING RESULT BY ID
 */
export const getSpeakingResultById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await SpeakingResult.findById(id).populate("testId");

    if (!result) return res.status(404).json({ success: false, message: "Result not found" });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedQuestion = await Speaking.findByIdAndDelete(id);

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
