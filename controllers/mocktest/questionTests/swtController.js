import SWT from "../../../models/mocktest/QuestionTests/SWT.js";
import { SummarizeTextQuestion } from "../../../models/writing/SummarizeText.js";
import mongoose from "mongoose";

/* ===================== CREATE ===================== */
export const createSWT = async (req, res) => {
  try {
    const { title, SummarizeTextQuestions = [] } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    if (SummarizeTextQuestions.length > 2) {
      return res.status(400).json({
        success: false,
        message: "SWT cannot exceed 2 questions",
      });
    }

    const invalidIds = SummarizeTextQuestions.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );

    if (invalidIds.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid SummarizeTextQuestion IDs",
        invalidIds,
      });
    }

    const uniqueIds = [...new Set(SummarizeTextQuestions.map(String))];

    const existing = await SummarizeTextQuestion.find({
      _id: { $in: uniqueIds },
    }).select("_id");

    if (existing.length !== uniqueIds.length) {
      return res.status(400).json({
        success: false,
        message: "Some SWT questions do not exist",
      });
    }

    const alreadyUsed = await SWT.findOne({
      SummarizeTextQuestions: { $in: uniqueIds },
    });

    if (alreadyUsed) {
      return res.status(400).json({
        success: false,
        message: "One or more questions already used in another SWT",
        usedInTitle: alreadyUsed.title,
      });
    }

    const swt = new SWT({ title, SummarizeTextQuestions: uniqueIds });
    await swt.save();

    res.status(201).json({
      success: true,
      message: "SWT section created successfully",
      data: swt,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===================== GET ALL ===================== */
export const getAllSWT = async (req, res) => {
  try {
    const data = await SWT.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: data.length, data });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch SWT" });
  }
};

/* ===================== GET BY ID ===================== */
export const getSWTById = async (req, res) => {
  try {
    const swt = await SWT.findById(req.params.id).populate("SummarizeTextQuestions");

    if (!swt) {
      return res.status(404).json({ success: false, message: "SWT not found" });
    }

    res.status(200).json({ success: true, data: swt });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch SWT" });
  }
};

/* ===================== UPDATE ===================== */
export const updateSWT = async (req, res) => {
  try {
    const updated = await SWT.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "SWT not found" });
    }

    res.status(200).json({
      success: true,
      message: "SWT updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/* ===================== DELETE ===================== */
export const deleteSWT = async (req, res) => {
  try {
    const swt = await SWT.findByIdAndDelete(req.params.id);

    if (!swt) {
      return res.status(404).json({ success: false, message: "SWT not found" });
    }

    res.status(200).json({
      success: true,
      message: "SWT deleted successfully",
    });
  } catch {
    res.status(500).json({ success: false, message: "Failed to delete SWT" });
  }
};


export const getUnusedQuestionsForAllTypes = async (req, res) => {
  try {
    // --- Summarize Written Text Questions ---
    const allSummarizeTextQuestions = await SummarizeTextQuestion.find({});
    const existingSWTSections = await SWT.find({});

    const usedSummarizeTextQuestionIds = new Set();
    existingSWTSections.forEach(section => {
      section.SummarizeTextQuestions.forEach(id => usedSummarizeTextQuestionIds.add(id.toString()));
    });

    const unusedSummarizeTextQuestions = allSummarizeTextQuestions.filter(q =>
      !usedSummarizeTextQuestionIds.has(q._id.toString())
    );

   


    res.status(200).json({
      success: true,
      data: {
        summarizeText: unusedSummarizeTextQuestions,
      
      },
    });
  } catch (error) {
    console.error("Error fetching unused questions for all types:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unused questions for all types",
    });
  }
};