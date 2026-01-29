import { ImageQuestion } from "../../../models/image.model.js";
import DI from "../../../models/mocktest/QuestionTests/DI.js";
import mongoose from "mongoose";

export const createDI = async (req, res) => {
  try {
    const { title, describeImageQuestions = [] } = req.body;

    // 1️⃣ Basic validation
    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    // 2️⃣ Max 5 questions
    if (describeImageQuestions.length > 5) {
      return res.status(400).json({
        success: false,
        message: "Describe Image section cannot have more than 5 questions",
      });
    }

    // 3️⃣ Validate ObjectIds
    const invalidIds = describeImageQuestions.filter(
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
      ...new Set(describeImageQuestions.map(String)),
    ];

    // 5️⃣ Check ImageQuestions exist
    const existingQuestions = await ImageQuestion.find({
      _id: { $in: uniqueQuestionIds },
    }).select("_id");

    if (existingQuestions.length !== uniqueQuestionIds.length) {
      const existingIds = existingQuestions.map((q) => q._id.toString());
      const missingIds = uniqueQuestionIds.filter(
        (id) => !existingIds.includes(id)
      );

      return res.status(400).json({
        success: false,
        message: "Some ImageQuestions do not exist",
        missingIds,
      });
    }

    // 🔥 6️⃣ IMPORTANT: Check if ImageQuestions already used in any DI
    const alreadyUsedDI = await DI.findOne({
      describeImageQuestions: { $in: uniqueQuestionIds },
    }).select("describeImageQuestions title");

    if (alreadyUsedDI) {
      const usedIds = alreadyUsedDI.describeImageQuestions.map(String);

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
      describeImageQuestions: uniqueQuestionIds,
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
export const getAllDI = async (req, res) => {
  try {
    const DISections = await DI.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: DISections.length,
      data: DISections,
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
/* ===================== SUBMIT DI ===================== */
export const submitDI = async (req, res) => {
  try {
    const { testId, answers } = req.body; 
    // answers: array of { questionId, ... }

    // Mock Scoring Logic
    let totalFluency = 0;
    let totalPronunciation = 0;
    let totalContent = 0;
    const count = answers?.length || 0;

    const results = count > 0 ? answers.map(a => {
        // Random scores between 10 and 90
        const fluency = Math.floor(Math.random() * (90 - 40) + 40);
        const pronunciation = Math.floor(Math.random() * (90 - 40) + 40);
        const content = Math.floor(Math.random() * (90 - 40) + 40);
        
        totalFluency += fluency;
        totalPronunciation += pronunciation;
        totalContent += content;

        return {
            questionId: a.questionId,
            fluency,
            pronunciation,
            content,
            score: Math.round((fluency + pronunciation + content) / 3)
        };
    }) : [];

    const resultData = {
        sectionScores: {
            fluency: count > 0 ? Math.round(totalFluency / count) : 0,
            pronunciation: count > 0 ? Math.round(totalPronunciation / count) : 0,
            content: count > 0 ? Math.round(totalContent / count) : 0,
        },
        overallScore: count > 0 ? Math.round((totalFluency + totalPronunciation + totalContent) / (count * 3)) : 0,
        questionResults: results
    };

    res.json({
        success: true,
        data: resultData
    });

  } catch (error) {
    console.error("Submit DI Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
