

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
