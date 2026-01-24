import mongoose from "mongoose";
import { HIWQuestion } from "../../../models/listening/HIW.js";
import { HIW } from "../../../models/mocktest/QuestionTests/HIW.js";


/* ===================== CREATE HIW ===================== */
export const createHIW = async (req, res) => {
  try {
    const { title, highlightIncorrectWordsQuestions = [] } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    if (highlightIncorrectWordsQuestions.length > 3) {
      return res.status(400).json({
        success: false,
        message: "HIW section cannot have more than 3 questions",
      });
    }

    const invalidIds = highlightIncorrectWordsQuestions.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );

    if (invalidIds.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid HIW Question IDs",
        invalidIds,
      });
    }

    const uniqueIds = [...new Set(highlightIncorrectWordsQuestions.map(String))];

    const existing = await HIWQuestion.find({
      _id: { $in: uniqueIds },
    }).select("_id");

    if (existing.length !== uniqueIds.length) {
      return res.status(400).json({
        success: false,
        message: "Some HIW questions do not exist",
      });
    }

    const alreadyUsed = await HIW.findOne({
      highlightIncorrectWordsQuestions: { $in: uniqueIds },
    }).select("title highlightIncorrectWordsQuestions");

    if (alreadyUsed) {
      return res.status(400).json({
        success: false,
        message: "One or more questions already used in another HIW",
        usedIn: alreadyUsed.title,
      });
    }

    const hiw = new HIW({
      title,
      highlightIncorrectWordsQuestions: uniqueIds,
    });

    await hiw.save();

    res.status(201).json({
      success: true,
      message: "HIW section created successfully",
      data: hiw,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===================== GET ALL HIW ===================== */
export const getAllHIW = async (req, res) => {
  try {
    const data = await HIW.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: data.length, data });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch HIW" });
  }
};

/* ===================== GET HIW BY ID ===================== */
export const getHIWById = async (req, res) => {
  try {
    const hiw = await HIW.findById(req.params.id)
      .populate("highlightIncorrectWordsQuestions");

    if (!hiw) {
      return res.status(404).json({ success: false, message: "HIW not found" });
    }

    res.status(200).json({ success: true, data: hiw });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch HIW" });
  }
};

/* ===================== UPDATE HIW ===================== */
export const updateHIW = async (req, res) => {
  try {
    const updated = await HIW.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "HIW not found" });
    }

    res.status(200).json({
      success: true,
      message: "HIW updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/* ===================== DELETE HIW ===================== */
export const deleteHIW = async (req, res) => {
  try {
    const deleted = await HIW.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "HIW not found" });
    }

    res.status(200).json({ success: true, message: "HIW deleted successfully" });
  } catch {
    res.status(500).json({ success: false, message: "Failed to delete HIW" });
  }
};
