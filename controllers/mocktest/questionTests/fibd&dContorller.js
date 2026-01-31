import FIBD from "../../../models/mocktest/QuestionTests/FIBD&D.js";
import mongoose from "mongoose";
import { ReadingFIBDragDrop } from "../../../models/readingFIBDragDrop.model.js";
import { ReadingResult } from "../../../models/mocktest/Reading.js"; // Fixed: Added Import

/* ===================== CREATE ===================== */
export const createFIBD = async (req, res) => {
  try {
    const { title, ReadingFIBDragDrops = [] } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    if (ReadingFIBDragDrops.length > 5) {
      return res.status(400).json({
        success: false,
        message: "FIBD cannot exceed 5 questions",
      });
    }

    const invalidIds = ReadingFIBDragDrops.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );

    if (invalidIds.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid ReadingFIBDragDrop IDs",
        invalidIds,
      });
    }

    const uniqueIds = [...new Set(ReadingFIBDragDrops.map(String))];

    const existing = await ReadingFIBDragDrop.find({
      _id: { $in: uniqueIds },
    }).select("_id");

    if (existing.length !== uniqueIds.length) {
      return res.status(400).json({
        success: false,
        message: "Some FIBD questions do not exist",
      });
    }

    const alreadyUsed = await FIBD.findOne({
      ReadingFIBDragDrops: { $in: uniqueIds },
    });

    if (alreadyUsed) {
      return res.status(400).json({
        success: false,
        message: "One or more questions already used in another FIBD",
        usedInTitle: alreadyUsed.title,
      });
    }

    const fibd = new FIBD({ title, ReadingFIBDragDrops: uniqueIds });
    await fibd.save();

    res.status(201).json({
      success: true,
      message: "FIBD section created successfully",
      data: fibd,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===================== GET ALL ===================== */
export const getAllFIBD = async (req, res) => {
  try {
    const data = await FIBD.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: data.length, data });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch FIBD" });
  }
};

/* ===================== GET BY ID ===================== */
export const getFIBDById = async (req, res) => {
  try {
    const fibd = await FIBD.findById(req.params.id).populate("ReadingFIBDragDrops");

    if (!fibd) {
      return res.status(404).json({ success: false, message: "FIBD not found" });
    }

    res.status(200).json({ success: true, data: fibd });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch FIBD" });
  }
};

/* ===================== UPDATE ===================== */
export const updateFIBD = async (req, res) => {
  try {
    const updated = await FIBD.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "FIBD not found" });
    }

    res.status(200).json({
      success: true,
      message: "FIBD updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/* ===================== DELETE ===================== */
export const deleteFIBD = async (req, res) => {
  try {
    const fibd = await FIBD.findByIdAndDelete(req.params.id);

    if (!fibd) {
      return res.status(404).json({ success: false, message: "FIBD not found" });
    }

    res.status(200).json({
      success: true,
      message: "FIBD deleted successfully",
    });
  } catch {
    res.status(500).json({ success: false, message: "Failed to delete FIBD" });
  }
};

/* ===================== SUBMIT FIBD ===================== */
// ReadingResult is already imported at the top

export const submitFIBD = async (req, res) => {
  try {
    console.log("submitFIBD: payload", req.body); // DEBUG
    console.log("submitFIBD: req.user", req.user); // DEBUG
    const { testId, answers, userId } = req.body;
    // answers: { questionIdx: { blankIndex: "value" } }

    const section = await FIBD.findById(testId).populate("ReadingFIBDragDrops");
    if (!section) {
        console.error("submitFIBD: Section not found", testId); // DEBUG
        return res.status(404).json({ success: false, message: "Test section not found" });
    }

    const { ReadingFIBDragDrops: questions } = section;
    let totalScore = 0;
    let totalMaxScore = 0;
    const results = [];

    questions.forEach((question, qIdx) => {
        const userQAnswers = answers[qIdx] || {};
        let questionScore = 0;
        let questionMax = 0;
        const blankAnalysis = [];

        question.correctAnswers.forEach(ans => {
            const blankId = ans.index;
            const correct = ans.correctAnswer;
            const userVal = userQAnswers[blankId];

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
            questionType: "FIBD",
            score: questionScore,
            maxScore: questionMax,
            answers: blankAnalysis
        });
    });

    const readingResult = new ReadingResult({
        user: req.user?._id || req.user?.id || userId,
        testId: testId,
        testModel: 'FIBD',
        overallScore: totalScore,
        totalMaxScore: totalMaxScore,
        sectionScores: {
            reading: totalScore,
             writing: 0 
        },
        scores: results
    });

    try {
        await readingResult.save();
        console.log("submitFIBD: Result Saved!", readingResult._id); // DEBUG
    } catch (saveError) {
        console.error("submitFIBD: Save Failed", saveError); // DEBUG
        throw saveError;
    }

    res.json({
        success: true,
        data: readingResult
    });

  } catch (error) {
    console.error("Submit FIBD Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
/* ===================== GET UNUSED FIB DRAG DROP QUESTIONS ===================== */
export const getUnusedFIBDragDropQuestions = async (req, res) => {
  try {
    const allFIBDQuestions = await ReadingFIBDragDrop.find({});
    const existingFIBDSections = await FIBD.find({});

    const usedFIBDQuestionIds = new Set();
    existingFIBDSections.forEach(section => {
      section.ReadingFIBDragDrops.forEach(id => usedFIBDQuestionIds.add(id.toString()));
    });

    const unusedFIBDQuestions = allFIBDQuestions.filter(q =>
      !usedFIBDQuestionIds.has(q._id.toString())
    );

    res.status(200).json({
      success: true,
      data: {
        fibdQuestions: unusedFIBDQuestions, // Key for frontend
      },
    });
  } catch (error) {
    console.error("Error fetching unused FIB Drag Drop questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unused FIB Drag Drop questions",
    });
  }
};
