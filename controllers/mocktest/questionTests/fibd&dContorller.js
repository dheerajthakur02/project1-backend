import FIBD from "../../../models/mocktest/QuestionTests/FIBD&D.js";
import mongoose from "mongoose";
import { ReadingFIBDragDrop } from "../../../models/readingFIBDragDrop.model.js";

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
