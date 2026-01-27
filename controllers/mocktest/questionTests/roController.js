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
