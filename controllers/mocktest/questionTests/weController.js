import { WriteEssayQuestion } from "../../../models/writing/Essay.js";
import { WE} from "../../../models/mocktest/QuestionTests/WE.js"
import mongoose from "mongoose";

/* ===================== CREATE WE ===================== */
export const createWE = async (req, res) => {
  try {
    const { title, essayQuestions = [] } = req.body;

    // 1️⃣ Basic validation
    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    // 2️⃣ Max 2 questions
    if (essayQuestions.length > 2) {
      return res.status(400).json({
        success: false,
        message: "Write Essay section cannot have more than 2 questions",
      });
    }

    // 3️⃣ Validate ObjectIds
    const invalidIds = essayQuestions.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );

    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid EssayQuestion IDs found",
        invalidIds,
      });
    }

    // 4️⃣ Remove duplicates
    const uniqueQuestionIds = [...new Set(essayQuestions.map(String))];

    // 5️⃣ Check EssayQuestions exist
    const existingQuestions = await WriteEssayQuestion.find({
      _id: { $in: uniqueQuestionIds },
    }).select("_id");

    if (existingQuestions.length !== uniqueQuestionIds.length) {
      const existingIds = existingQuestions.map((q) => q._id.toString());
      const missingIds = uniqueQuestionIds.filter(
        (id) => !existingIds.includes(id)
      );

      return res.status(400).json({
        success: false,
        message: "Some EssayQuestions do not exist",
        missingIds,
      });
    }

    // 6️⃣ Check if EssayQuestions already used in another WE
    const alreadyUsedWE = await WE.findOne({
      essayQuestions: { $in: uniqueQuestionIds },
    }).select("essayQuestions title");

    if (alreadyUsedWE) {
      const usedIds = alreadyUsedWE.essayQuestions.map(String);

      const conflictedIds = uniqueQuestionIds.filter((id) =>
        usedIds.includes(id)
      );

      return res.status(400).json({
        success: false,
        message:
          "One or more EssayQuestions are already used in another Write Essay section",
        conflictedIds,
        usedInWETitle: alreadyUsedWE.title,
      });
    }

    // 7️⃣ Create WE
    const we = new WE({
      title,
      essayQuestions: uniqueQuestionIds,
    });

    await we.save();

    res.status(201).json({
      success: true,
      message: "Write Essay section created successfully",
      data: we,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===================== GET ALL WE ===================== */
export const getAllWE = async (req, res) => {
  try {
    const WESections = await WE.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: WESections.length,
      data: WESections,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch Write Essay sections",
    });
  }
};

/* ===================== GET WE BY ID ===================== */
export const getWEById = async (req, res) => {
  try {
    const { id } = req.params;

    const WESection = await WE.findById(id).populate("essayQuestions");

    if (!WESection) {
      return res.status(404).json({
        success: false,
        message: "Write Essay section not found",
      });
    }

    res.status(200).json({
      success: true,
      data: WESection,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch Write Essay section",
    });
  }
};

/* ===================== UPDATE WE ===================== */
export const updateWE = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedWE = await WE.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedWE) {
      return res.status(404).json({
        success: false,
        message: "Write Essay section not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Write Essay section updated successfully",
      data: updatedWE,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===================== DELETE WE ===================== */
export const deleteWE = async (req, res) => {
  try {
    const { id } = req.params;

    const we = await WE.findByIdAndDelete(id);

    if (!we) {
      return res.status(404).json({
        success: false,
        message: "Write Essay section not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Write Essay section deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete Write Essay section",
    });
  }
};


export const getUnusedWriteEssayQuestions = async (req, res) => {
  try {
    const allEssayQuestions = await WriteEssayQuestion.find({});
    const existingWESections = await WE.find({});

    const usedEssayQuestionIds = new Set();
    existingWESections.forEach(section => {
      section.essayQuestions.forEach(id => usedEssayQuestionIds.add(id.toString()));
    });

    const unusedEssayQuestions = allEssayQuestions.filter(q =>
      !usedEssayQuestionIds.has(q._id.toString())
    );

    res.status(200).json({
      success: true,
      data: {
        writeEssay: unusedEssayQuestions, // Key for frontend
      },
    });
  } catch (error) {
    console.error("Error fetching unused Write Essay questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unused Write Essay questions",
    });
  }
};