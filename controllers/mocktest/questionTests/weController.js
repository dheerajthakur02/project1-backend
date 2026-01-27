import { ImageQuestion } from "../../../models/image.model.js";
import DI from "../../../models/mocktest/QuestionTests/DI.js";
import mongoose from "mongoose";

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

    // 2️⃣ Max 5 questions
    if (essayQuestions.length > 5) {
      return res.status(400).json({
        success: false,
        message: "Write Essay section cannot have more than 5 questions",
      });
    }

    // 3️⃣ Validate ObjectIds
    const invalidIds = essayQuestions.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );

    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid ImageQuestion IDs found",
        invalidIds,
      });
    }

    // 4️⃣ Remove duplicates in request itself
    const uniqueQuestionIds = [
      ...new Set(essayQuestions.map(String)),
    ];

    // 5️⃣ Check ImageQuestions exist
    const existingQuestions = await WE.find({
      _id: { $in: uniqueQuestionIds },
    }).select("_id");

    if (existingQuestions.length !== uniqueQuestionIds.length) {
      const existingIds = existingQuestions.map((q) => q._id.toString());
      const missingIds = uniqueQuestionIds.filter(
        (id) => !existingIds.includes(id)
      );

      return res.status(400).json({
        success: false,
        message: "Some Write Essay do not exist",
        missingIds,
      });
    }

    // 🔥 6️⃣ IMPORTANT: Check if ImageQuestions already used in any DI
    const alreadyUsedDI = await DI.findOne({
      essayQuestions: { $in: uniqueQuestionIds },
    }).select("essayQuestions title");

    if (alreadyUsedDI) {
      const usedIds = alreadyUsedDI.essayQuestions.map(String);

      const conflictedIds = uniqueQuestionIds.filter((id) =>
        usedIds.includes(id)
      );

      return res.status(400).json({
        success: false,
        message:
          "One or more ImageQuestions are already used in another DI section",
        conflictedIds,
        usedInDITitle: alreadyUsedDI.title,
      });
    }

    // 7️⃣ Create DI
    const di = new DI({
      title,
      essayQuestions: uniqueQuestionIds,
    });

    await di.save();

    res.status(201).json({
      success: true,
      message: "Describe Image section created successfully",
      data: di,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/* ===================== GET ALL DI ===================== */
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
      message: "Failed to fetch Describe Image sections",
    });
  }
};

/* ===================== GET DI BY ID ===================== */
export const getDIById = async (req, res) => {
  try {
    const { id } = req.params;

    const DISection = await DI.findById(id)
      .populate("describeImageQuestions");

    if (!DISection) {
      return res.status(404).json({
        success: false,
        message: "Describe Image section not found",
      });
    }

    res.status(200).json({
      success: true,
      data: DISection,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch Describe Image section",
    });
  }
};

/* ===================== UPDATE DI ===================== */
export const updateDI = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedDI = await DI.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true,
        runValidators: true, // 🔒 important
      }
    );

    if (!updatedDI) {
      return res.status(404).json({
        success: false,
        message: "Describe Image section not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Describe Image section updated successfully",
      data: updatedDI,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===================== DELETE DI (OPTIONAL) ===================== */
export const deleteDI = async (req, res) => {
  try {
    const { id } = req.params;

    const di = await DI.findByIdAndDelete(id);

    if (!di) {
      return res.status(404).json({
        success: false,
        message: "Describe Image section not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Describe Image section deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete Describe Image section",
    });
  }
};
