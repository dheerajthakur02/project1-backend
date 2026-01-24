import mongoose from "mongoose";
import { SSTQuestion } from "../../../models/listening/SSTQuestion.js";
import { SSTGroup } from "../../../models/mocktest/QuestionTests/SSTGroup.js";

export const createSSTGroup = async (req, res) => {
  try {
    const { title, summarizeSpokenTextQuestion = [] } = req.body;

    // ❌ Only ONE question allowed
    if (summarizeSpokenTextQuestion.length !== 1) {
      return res.status(400).json({
        success: false,
        message: "Exactly 1 SST question is required",
      });
    }

    const questionId = summarizeSpokenTextQuestion[0];

    // ✅ Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid SST Question ID",
      });
    }

    // ✅ Check question exists
    const questionExists = await SSTQuestion.findById(questionId);
    if (!questionExists) {
      return res.status(400).json({
        success: false,
        message: "SST Question not found",
      });
    }

    // ✅ Prevent reuse in another SSTGroup
    const alreadyUsed = await SSTGroup.findOne({
      summarizeSpokenTextQuestion: questionId,
    });

    if (alreadyUsed) {
      return res.status(400).json({
        success: false,
        message: "This SST question is already used in another group",
      });
    }

    const sstGroup = new SSTGroup({
      title,
      summarizeSpokenTextQuestion: [questionId],
    });

    await sstGroup.save();

    res.status(201).json({
      success: true,
      message: "SST Group created successfully",
      data: sstGroup,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= GET ALL ================= */
export const getAllSSTGroups = async (req, res) => {
  try {
    const groups = await SSTGroup.find()
      .populate("summarizeSpokenTextQuestion");

    res.json({
      success: true,
      count: groups.length,
      data: groups,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


/* ================= GET BY ID ================= */
export const getSSTGroupById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid SSTGroup ID" });
    }

    const group = await SSTGroup.findById(id)
      .populate("summarizeSpokenTextQuestion");

    if (!group) {
      return res.status(404).json({ success: false, message: "SST Group not found" });
    }

    res.json({ success: true, data: group });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= UPDATE ================= */
export const updateSSTGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, summarizeSpokenTextQuestion } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid SSTGroup ID" });
    }

    const group = await SSTGroup.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, message: "SST Group not found" });
    }

    if (title) group.title = title;

    if (summarizeSpokenTextQuestion) {
      if (!Array.isArray(summarizeSpokenTextQuestion) || summarizeSpokenTextQuestion.length !== 1) {
        return res.status(400).json({
          success: false,
          message: "Exactly 1 SST question is required",
        });
      }

      const questionId = summarizeSpokenTextQuestion[0];

      if (!mongoose.Types.ObjectId.isValid(questionId)) {
        return res.status(400).json({ success: false, message: "Invalid question ID" });
      }

      const questionExists = await SSTQuestion.findById(questionId);
      if (!questionExists) {
        return res.status(404).json({ success: false, message: "SST Question not found" });
      }

      const alreadyUsed = await SSTGroup.findOne({
        summarizeSpokenTextQuestion: questionId,
        _id: { $ne: id },
      });

      if (alreadyUsed) {
        return res.status(400).json({
          success: false,
          message: "This SST question is already used in another group",
        });
      }

      group.summarizeSpokenTextQuestion = [questionId];
    }

    await group.save();

    res.json({
      success: true,
      message: "SST Group updated successfully",
      data: group,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= DELETE ================= */
export const deleteSSTGroup = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid SSTGroup ID" });
    }

    const deleted = await SSTGroup.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "SST Group not found" });
    }

    res.json({
      success: true,
      message: "SST Group deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};