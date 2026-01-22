import Writing, { WritingResult } from "../../models/mocktest/Writing.js";


/* ===================== CREATE WRITING ===================== */
export const createWriting = async (req, res) => {
  try {
    const {
      title,
      summarizeWrittenText = [],
      writeEssay = [],
      summarizeSpokenText = [],
      writeFromDictation = [],
    } = req.body;

    const writing = new Writing({
      title,
      summarizeWrittenText,
      writeEssay,
      summarizeSpokenText,
      writeFromDictation,
    });

    await writing.save(); // 🔒 max 20 validated by schema

    res.status(201).json({
      success: true,
      message: "Writing section created successfully",
      data: writing,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===================== GET ALL WRITING ===================== */
export const getAllWriting = async (req, res) => {
  try {
    const writingSections = await Writing.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: writingSections.length,
      data: writingSections,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch Writing sections",
    });
  }
};

/* ===================== GET WRITING BY ID ===================== */
export const getWritingById = async (req, res) => {
  try {
    const { id } = req.params;

    const writingSection = await Writing.findById(id)
      .populate("summarizeWrittenText")
      .populate("writeEssay")
      .populate("summarizeSpokenText")
      .populate("writeFromDictation");

    if (!writingSection) {
      return res.status(404).json({
        success: false,
        message: "Writing section not found",
      });
    }

    res.status(200).json({
      success: true,
      data: writingSection,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch Writing section",
    });
  }
};

/* ===================== UPDATE WRITING ===================== */
export const updateWriting = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedWriting = await Writing.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true,
        runValidators: true, // 🔒 important
      }
    );

    if (!updatedWriting) {
      return res.status(404).json({
        success: false,
        message: "Writing section not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Writing section updated successfully",
      data: updatedWriting,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===================== DELETE WRITING (OPTIONAL) ===================== */
export const deleteWriting = async (req, res) => {
  try {
    const { id } = req.params;

    const writing = await Writing.findByIdAndDelete(id);

    if (!writing) {
      return res.status(404).json({
        success: false,
        message: "Writing section not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Writing section deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete Writing section",
    });
  }
};


export const submitWritingResult = async (req, res) => {
  try {
    const {
      user,
      writingId,
      overallScore,
      scores,
    } = req.body;

    const result = new WritingResult({
      user,
      writingId,
      overallScore,
      scores,
    });

    await result.save();

    res.status(201).json({
      success: true,
      message: "Writing result submitted successfully",
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===================== GET USER WRITING RESULTS ===================== */
export const getUserWritingResults = async (req, res) => {
  try {
    const { userId } = req.params;

    const results = await WritingResult.find({ user: userId })
      .populate("writingId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch Writing results",
    });
  }
};