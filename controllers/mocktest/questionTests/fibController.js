

import mongoose from "mongoose";
import { ReadingFIBDropdown } from "../../../models/readingFIBDropdown.model.js";
import FIBRW from "../../../models/mocktest/QuestionTests/FIB.js";

/* ===================== CREATE FIB RW ===================== */
export const createFIBRW = async (req, res) => {
  try {
    const { title, fibQuestions = [] } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    if (fibQuestions.length > 5) {
      return res.status(400).json({
        success: false,
        message: "FIB RW cannot have more than 5 questions",
      });
    }

    const invalidIds = fibQuestions.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );

    if (invalidIds.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid ReadingFIBDropdown IDs",
        invalidIds,
      });
    }

    const uniqueIds = [...new Set(fibQuestions.map(String))];

    const existingQuestions = await ReadingFIBDropdown.find({
      _id: { $in: uniqueIds },
    }).select("_id");

    if (existingQuestions.length !== uniqueIds.length) {
      return res.status(400).json({
        success: false,
        message: "Some FIB RW questions do not exist",
      });
    }

    // 🔥 Prevent reuse
    const alreadyUsed = await FIBRW.findOne({
      fibQuestions: { $in: uniqueIds },
    });

    if (alreadyUsed) {
      return res.status(400).json({
        success: false,
        message: "One or more questions already used in another FIB RW section",
        usedInTitle: alreadyUsed.title,
      });
    }

    const fibRW = new FIBRW({ title, fibQuestions: uniqueIds });
    await fibRW.save();

    res.status(201).json({
      success: true,
      message: "FIB RW section created successfully",
      data: fibRW,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===================== GET ALL ===================== */
export const getAllFIBRW = async (req, res) => {
  try {
    const data = await FIBRW.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: data.length, data });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch FIB RW" });
  }
};

/* ===================== GET BY ID ===================== */
export const getFIBRWById = async (req, res) => {
  try {
    const section = await FIBRW.findById(req.params.id).populate("fibQuestions");

    if (!section) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.status(200).json({ success: true, data: section });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch" });
  }
};

/* ===================== UPDATE ===================== */
export const updateFIBRW = async (req, res) => {
  try {
    const updated = await FIBRW.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.status(200).json({
      success: true,
      message: "FIB RW updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/* ===================== DELETE ===================== */
export const deleteFIBRW = async (req, res) => {
  try {
    const deleted = await FIBRW.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.status(200).json({
      success: true,
      message: "FIB RW deleted successfully",
    });
  } catch {
    res.status(500).json({ success: false, message: "Delete failed" });
  }
};

  /* ===================== SUBMIT FIB RW ===================== */
import { ReadingResult } from "../../../models/mocktest/Reading.js";

export const submitFIBRW = async (req, res) => {
  try {
    console.log("submitFIBRW called with body:", req.body); // DEBUG
    const { testId, answers, userId } = req.body;
    
    // 1. Fetch the Test Section
    const fibSection = await FIBRW.findById(testId).populate("fibQuestions");
    if (!fibSection) {
        console.error("submitFIBRW: Test section not found for ID:", testId); // DEBUG
        return res.status(404).json({ success: false, message: "Test section not found" });
    }

    const { fibQuestions } = fibSection;
    let totalScore = 0;
    let totalMaxScore = 0;
    const results = [];

    // 2. Iterate Questions
    fibQuestions.forEach((question, qIdx) => {
        const userQAnswers = answers[qIdx] || {};
        let questionScore = 0;
        let questionMax = 0;
        const blankAnalysis = [];

        question.blanks.forEach(blank => {
            const blankId = blank.index; // 1-based index from schema
            const correct = blank.correctAnswer;
            const userVal = userQAnswers[blankId]; // strict match

            questionMax++;
            
            const isCorrect = userVal === correct;
            if (isCorrect) questionScore++;

            blankAnalysis.push({
                blankIndex: blankId,
                correctAnswer: correct,
                userAnswer: userVal || null,
                isCorrect
            });
        });

        totalScore += questionScore;
        totalMaxScore += questionMax;

        results.push({
            questionId: question._id,
            questionType: "FIBRW",
            score: questionScore,
            maxScore: questionMax,
            answers: blankAnalysis
        });
    });

    // 3. Save Result
    const readingResult = new ReadingResult({
        user: req.user?._id || req.user?.id || userId,
        testId: testId,
        testModel: 'FIBRW', // Must match model name "FIBRW"
        overallScore: totalScore,
        totalMaxScore: totalMaxScore,
        sectionScores: {
            reading: totalScore,
            writing: totalScore // RW contributes to both, simplifying here
        },
        scores: results
    });

    try {
        await readingResult.save();
        console.log("submitFIBRW: Successfully saved ReadingResult:", readingResult._id); // DEBUG
    } catch (saveError) {
        console.error("submitFIBRW: Failed to save ReadingResult:", saveError); // DEBUG
        throw saveError; // Re-throw to catch block
    }

    res.json({
        success: true,
        data: readingResult
    });

  } catch (error) {
    console.error("Submit FIB RW Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
/* ===================== GET UNUSED FIB RW QUESTIONS ===================== */
export const getUnusedFIBRWQuestions = async (req, res) => {
  try {
    const allFIBQuestions = await ReadingFIBDropdown.find({});
    const existingFIBRWSections = await FIBRW.find({});

    const usedFIBQuestionIds = new Set();
    existingFIBRWSections.forEach(section => {
      section.fibQuestions.forEach(id => usedFIBQuestionIds.add(id.toString()));
    });

    const unusedFIBQuestions = allFIBQuestions.filter(q =>
      !usedFIBQuestionIds.has(q._id.toString())
    );

    res.status(200).json({
      success: true,
      data: {
        fibQuestions: unusedFIBQuestions, // Key for frontend
      },
    });
  } catch (error) {
    console.error("Error fetching unused FIB RW questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unused FIB RW questions",
    });
  }
};
