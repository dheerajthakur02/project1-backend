import RO from "../../../models/mocktest/QuestionTests/RO.js";
import { ReadingReorder } from "../../../models/readingReorder.model.js";

import mongoose from "mongoose";

/* ===================== CREATE RO ===================== */
export const createRO = async (req, res) => {
  try {
    const { title, reorderQuestions = [] } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    if (reorderQuestions.length > 5) {
      return res.status(400).json({
        success: false,
        message: "Reorder section cannot exceed 5 questions",
      });
    }

    const invalidIds = reorderQuestions.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );

    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid ReadingReorder IDs found",
        invalidIds,
      });
    }

    const uniqueIds = [...new Set(reorderQuestions.map(String))];

    const existingQuestions = await ReadingReorder.find({
      _id: { $in: uniqueIds },
    }).select("_id");

    if (existingQuestions.length !== uniqueIds.length) {
      return res.status(400).json({
        success: false,
        message: "Some RO questions do not exist",
      });
    }

    const alreadyUsed = await RO.findOne({
      reorderQuestions: { $in: uniqueIds },
    });

    if (alreadyUsed) {
      return res.status(400).json({
        success: false,
        message: "One or more RO questions already used in another section",
        usedInTitle: alreadyUsed.title,
      });
    }

    const ro = new RO({ title, reorderQuestions: uniqueIds });
    await ro.save();

    res.status(201).json({
      success: true,
      message: "Reorder section created successfully",
      data: ro,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===================== GET ALL RO ===================== */
export const getAllRO = async (req, res) => {
  try {
    const data = await RO.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: data.length, data });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch RO sections" });
  }
};

/* ===================== GET RO BY ID ===================== */
export const getROById = async (req, res) => {
  try {
    const ro = await RO.findById(req.params.id).populate("reorderQuestions");

    if (!ro) {
      return res.status(404).json({ success: false, message: "RO section not found" });
    }

    res.status(200).json({ success: true, data: ro });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch RO section" });
  }
};

/* ===================== UPDATE RO ===================== */
export const updateRO = async (req, res) => {
  try {
    const updated = await RO.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "RO section not found" });
    }

    res.status(200).json({
      success: true,
      message: "RO section updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/* ===================== DELETE RO ===================== */
export const deleteRO = async (req, res) => {
  try {
    const ro = await RO.findByIdAndDelete(req.params.id);

    if (!ro) {
      return res.status(404).json({ success: false, message: "RO section not found" });
    }

    res.status(200).json({
      success: true,
      message: "RO section deleted successfully",
    });
  } catch {
    res.status(500).json({ success: false, message: "Failed to delete RO section" });
  }
};

/* ===================== SUBMIT RO ===================== */
import { ReadingResult } from "../../../models/mocktest/Reading.js";

export const submitRO = async (req, res) => {
  try {
    const { testId, answers, userId } = req.body;
    // answers: { questionIdx: [id1, id2, id3] } representing user target order

    const section = await RO.findById(testId).populate("reorderQuestions");
    if (!section) {
        return res.status(404).json({ success: false, message: "Test section not found" });
    }

    const { reorderQuestions: questions } = section;
    let totalScore = 0;
    let totalMaxScore = 0;
    const results = [];

    questions.forEach((question, qIdx) => {
        const userOrder = answers[qIdx] || [];
        const correctOrder = question.correctOrder; // e.g. ['C', 'A', 'D', 'B']
        
        // Scoring: +1 for each correct adjacent pair
        // Max pairs = length - 1
        
        let questionScore = 0;
        let questionMax = Math.max(0, correctOrder.length - 1);
        
        // Identify correct pairs in correctOrder
        const correctPairs = new Set();
        for (let i = 0; i < correctOrder.length - 1; i++) {
            correctPairs.add(`${correctOrder[i]}-${correctOrder[i+1]}`);
        }

        // Check user pairs
        const userPairsFound = [];
        for (let i = 0; i < userOrder.length - 1; i++) {
             const pair = `${userOrder[i]}-${userOrder[i+1]}`;
             if (correctPairs.has(pair)) {
                 questionScore++;
                 userPairsFound.push(pair);
             }
        }

        totalScore += questionScore;
        totalMaxScore += questionMax;

        results.push({
            questionId: question._id,
            questionType: "RO",
            score: questionScore,
            maxScore: questionMax,
            userAnswer: userOrder,
            answers: {
                correctOrder,
                userPairsFound
            }
        });
    });

    const readingResult = new ReadingResult({
        user: req.user?._id || req.user?.id || userId,
        testId: testId,
        testModel: 'RO',
        overallScore: totalScore,
        totalMaxScore: totalMaxScore,
        sectionScores: {
            reading: totalScore,
            writing: 0 
        },
        scores: results
    });

    await readingResult.save();

    res.json({
        success: true,
        data: readingResult
    });

  } catch (error) {
    console.error("Submit RO Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
/* ===================== GET UNUSED RO QUESTIONS ===================== */
export const getUnusedROQuestions = async (req, res) => {
  try {
    const allROQuestions = await ReadingReorder.find({});
    const existingROSections = await RO.find({});

    const usedROQuestionIds = new Set();
    existingROSections.forEach(section => {
      section.reorderQuestions.forEach(id => usedROQuestionIds.add(id.toString()));
    });

    const unusedROQuestions = allROQuestions.filter(q =>
      !usedROQuestionIds.has(q._id.toString())
    );

    res.status(200).json({
      success: true,
      data: {
        reorderQuestions: unusedROQuestions, // Key for frontend
      },
    });
  } catch (error) {
    console.error("Error fetching unused RO questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unused RO questions",
    });
  }
};
