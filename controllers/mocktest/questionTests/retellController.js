import mongoose from "mongoose";

import RETELL from "../../../models/mocktest/QuestionTests/ReTell.js";
import { RetellLectureQuestion } from "../../../models/retell.model.js";

/* ===================== CREATE RETELL ===================== */
export const createReTell = async (req, res) => {
  try {
    const { title, reTellQuestions = [] } = req.body;

    // 1️⃣ Title check
    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    // 2️⃣ Max 5 questions
    if (reTellQuestions.length > 5) {
      return res.status(400).json({
        success: false,
        message: "Re-tell Lecture section cannot have more than 5 questions",
      });
    }

    // 3️⃣ Validate ObjectIds
    const invalidIds = reTellQuestions.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );

    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid ReTellQuestion IDs found",
        invalidIds,
      });
    }

    // 4️⃣ Remove duplicates
    const uniqueQuestionIds = [...new Set(reTellQuestions.map(String))];

    // 5️⃣ Check questions exist
    const existingQuestions = await RetellLectureQuestion.find({
      _id: { $in: uniqueQuestionIds },
    }).select("_id");

    if (existingQuestions.length !== uniqueQuestionIds.length) {
      const existingIds = existingQuestions.map((q) => q._id.toString());
      const missingIds = uniqueQuestionIds.filter(
        (id) => !existingIds.includes(id)
      );

      return res.status(400).json({
        success: false,
        message: "Some ReTellLecture questions do not exist",
        missingIds,
      });
    }

    // 🔥 6️⃣ Ensure question not already used in another RETELL
    const alreadyUsedReTell = await RETELL.findOne({
      reTellQuestions: { $in: uniqueQuestionIds },
    }).select("reTellQuestions title");

    if (alreadyUsedReTell) {
      const usedIds = alreadyUsedReTell.reTellQuestions.map(String);

      const conflictedIds = uniqueQuestionIds.filter((id) =>
        usedIds.includes(id)
      );

      return res.status(400).json({
        success: false,
        message:
          "One or more Re-tell Lecture questions are already used in another section",
        conflictedIds,
        usedInReTellTitle: alreadyUsedReTell.title,
      });
    }

    // 7️⃣ Create RETELL
    const retell = new RETELL({
      title,
      reTellQuestions: uniqueQuestionIds,
    });

    await retell.save();

    res.status(201).json({
      success: true,
      message: "Re-tell Lecture section created successfully",
      data: retell,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===================== GET ALL RETELL ===================== */
export const getAllReTell = async (req, res) => {
  try {
    const retellSections = await RETELL.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: retellSections.length,
      data: retellSections,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch Re-tell Lecture sections",
    });
  }
};

/* ===================== GET RETELL BY ID ===================== */
export const getReTellById = async (req, res) => {
  try {
    const { id } = req.params;

    const retellSection = await RETELL.findById(id).populate(
      "reTellQuestions"
    );

    if (!retellSection) {
      return res.status(404).json({
        success: false,
        message: "Re-tell Lecture section not found",
      });
    }

    res.status(200).json({
      success: true,
      data: retellSection,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch Re-tell Lecture section",
    });
  }
};

/* ===================== UPDATE RETELL ===================== */
export const updateReTell = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedReTell = await RETELL.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedReTell) {
      return res.status(404).json({
        success: false,
        message: "Re-tell Lecture section not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Re-tell Lecture section updated successfully",
      data: updatedReTell,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===================== DELETE RETELL ===================== */
export const deleteReTell = async (req, res) => {
  try {
    const { id } = req.params;

    const retell = await RETELL.findByIdAndDelete(id);

    if (!retell) {
      return res.status(404).json({
        success: false,
        message: "Re-tell Lecture section not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Re-tell Lecture section deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete Re-tell Lecture section",
    });
  }
};


/* ===================== SUBMIT RETELL ===================== */
import { SpeakingResult } from "../../../models/mocktest/Speaking.js";

export const submitReTell = async (req, res) => {
  try {
    const { testId, answers, userId } = req.body;
    // answers: array of { questionId, audioUrl }

    let totalFluency = 0;
    let totalPronunciation = 0;
    let totalContent = 0;
    const count = answers?.length || 0;

    const results = count > 0 ? answers.map(a => {
        // Mock Scoring for Re-tell Lecture (Audio analysis is complex)
        // We simulate scores based on random realistic PTE distributions
        
        const fluency = Math.floor(Math.random() * (5 - 3) + 3); // 3 to 5
        const pronunciation = Math.floor(Math.random() * (5 - 3) + 3);
        const content = Math.floor(Math.random() * (5 - 2) + 2);

        totalFluency += fluency;
        totalPronunciation += pronunciation;
        totalContent += content;

        return {
            questionId: a.questionId,
            questionType: "RL", // Re-tell Lecture
            fluencyScore: fluency,
            pronunciationScore: pronunciation,
            contentScore: content,
            score: parseFloat(((fluency + pronunciation + content) / 3).toFixed(1)),
            userTranscript: "Audio response recorded", // Placeholder
            audioUrl: a.audioUrl
        };
    }) : [];

    const sectionScores = {
        fluency: count > 0 ? parseFloat((totalFluency / count).toFixed(1)) : 0,
        pronunciation: count > 0 ? parseFloat((totalPronunciation / count).toFixed(1)) : 0,
        content: count > 0 ? parseFloat((totalContent / count).toFixed(1)) : 0
    };

    const overallScore = count > 0 ? parseFloat(((sectionScores.fluency + sectionScores.pronunciation + sectionScores.content) / 3).toFixed(1)) : 0;

    // SAVE TO DB using SpeakingResult
    const speakingResult = new SpeakingResult({
        user: req.user?._id || req.user?.id || userId,
        testId: testId,
        testModel: 'ReTell', 
        overallScore,
        sectionScores,
        scores: results
    });

    await speakingResult.save();

    res.json({
        success: true,
        data: speakingResult
    });

  } catch (error) {
    console.error("Submit ReTell Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===================== GET UNUSED RETELL LECTURE QUESTIONS ===================== */
export const getUnusedRetellLectureQuestions = async (req, res) => {
  try {
    const allRetellLectureQuestions = await RetellLectureQuestion.find({});
    const existingRetellSections = await RETELL.find({});

    const usedRetellQuestionIds = new Set();
    existingRetellSections.forEach(section => {
      section.reTellQuestions.forEach(id => usedRetellQuestionIds.add(id.toString()));
    });

    const unusedRetellLectureQuestions = allRetellLectureQuestions.filter(q =>
      !usedRetellQuestionIds.has(q._id.toString())
    );

    res.status(200).json({
      success: true,
      data: {
        reTellLecture: unusedRetellLectureQuestions, // Key for frontend
      },
    });
  } catch (error) {
    console.error("Error fetching unused Re-tell Lecture questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unused Re-tell Lecture questions",
    });
  }
};
