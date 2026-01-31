import mongoose from "mongoose";
import { SummarizeGroupQuestion } from "../../../models/summarizeGroup.model.js";
import { SGD } from "../../../models/mocktest/QuestionTests/SGD.js";


/* ===================== CREATE SGD ===================== */
export const createSGD = async (req, res) => {
  try {
    const { title, summarizeGroupDiscussionQuestions = [] } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    // 🔒 Max 3 questions
    if (summarizeGroupDiscussionQuestions.length > 3) {
      return res.status(400).json({
        success: false,
        message: "SGD section cannot have more than 3 questions",
      });
    }

    // ✅ Validate ObjectIds
    const invalidIds = summarizeGroupDiscussionQuestions.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );

    if (invalidIds.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid SGD Question IDs",
        invalidIds,
      });
    }

    // 🔁 Remove duplicates
    const uniqueIds = [...new Set(summarizeGroupDiscussionQuestions.map(String))];

    // 🔍 Check existence
    const existing = await SummarizeGroupQuestion.find({
      _id: { $in: uniqueIds },
    }).select("_id");

    if (existing.length !== uniqueIds.length) {
      const existingIds = existing.map((q) => q._id.toString());
      const missingIds = uniqueIds.filter((id) => !existingIds.includes(id));

      return res.status(400).json({
        success: false,
        message: "Some SGD questions do not exist",
        missingIds,
      });
    }

    // 🚫 Check already used
    const alreadyUsed = await SGD.findOne({
      summarizeGroupDiscussionQuestions: { $in: uniqueIds },
    }).select("title summarizeGroupDiscussionQuestions");

    if (alreadyUsed) {
      const usedIds = alreadyUsed.summarizeGroupDiscussionQuestions.map(String);
      const conflictedIds = uniqueIds.filter((id) => usedIds.includes(id));

      return res.status(400).json({
        success: false,
        message: "One or more questions already used in another SGD",
        conflictedIds,
        usedIn: alreadyUsed.title,
      });
    }

    const sgd = new SGD({
      title,
      summarizeGroupDiscussionQuestions: uniqueIds,
    });

    await sgd.save();

    res.status(201).json({
      success: true,
      message: "SGD section created successfully",
      data: sgd,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===================== GET ALL SGD ===================== */
export const getAllSGD = async (req, res) => {
  try {
    const data = await SGD.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: data.length, data });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch SGD" });
  }
};

/* ===================== GET SGD BY ID ===================== */
export const getSGDById = async (req, res) => {
  try {
    const sgd = await SGD.findById(req.params.id)
      .populate("summarizeGroupDiscussionQuestions");

    if (!sgd) {
      return res.status(404).json({ success: false, message: "SGD not found" });
    }

    res.status(200).json({ success: true, data: sgd });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch SGD" });
  }
};

/* ===================== UPDATE SGD ===================== */
export const updateSGD = async (req, res) => {
  try {
    const updated = await SGD.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "SGD not found" });
    }

    res.status(200).json({
      success: true,
      message: "SGD updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/* ===================== DELETE SGD ===================== */
export const deleteSGD = async (req, res) => {
  try {
    const deleted = await SGD.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "SGD not found" });
    }

    res.status(200).json({ success: true, message: "SGD deleted successfully" });
  } catch {
    res.status(500).json({ success: false, message: "Failed to delete SGD" });
  }
};

/* ===================== SUBMIT SGD ===================== */
import { SpeakingResult } from "../../../models/mocktest/Speaking.js";

export const submitSGD = async (req, res) => {
  try {
    const { testId, answers, userId } = req.body;
    // answers: array of { questionId, audioUrl }

    let totalFluency = 0;
    let totalPronunciation = 0;
    let totalContent = 0;
    const count = answers?.length || 0;

    const results = count > 0 ? answers.map(a => {
        // Mock Scoring for SGD
        const fluency = Math.floor(Math.random() * (5 - 3) + 3);
        const pronunciation = Math.floor(Math.random() * (5 - 3) + 3);
        const content = Math.floor(Math.random() * (5 - 2) + 2);

        totalFluency += fluency;
        totalPronunciation += pronunciation;
        totalContent += content;

        return {
            questionId: a.questionId,
            questionType: "SGD",
            fluencyScore: fluency,
            pronunciationScore: pronunciation,
            contentScore: content,
            score: parseFloat(((fluency + pronunciation + content) / 3).toFixed(1)),
            userTranscript: "Audio response recorded",
            audioUrl: a.audioUrl
        };
    }) : [];

    const sectionScores = {
        fluency: count > 0 ? parseFloat((totalFluency / count).toFixed(1)) : 0,
        pronunciation: count > 0 ? parseFloat((totalPronunciation / count).toFixed(1)) : 0,
        content: count > 0 ? parseFloat((totalContent / count).toFixed(1)) : 0
    };

    const overallScore = count > 0 ? parseFloat(((sectionScores.fluency + sectionScores.pronunciation + sectionScores.content) / 3).toFixed(1)) : 0;

    const speakingResult = new SpeakingResult({
        user: req.user?._id || req.user?.id || userId,
        testId: testId,
        testModel: 'SGD',
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
    console.error("Submit SGD Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUnusedSummarizeGroupDiscussionQuestions = async (req, res) => {
  try {
    const allSGDQuestions = await SummarizeGroupQuestion.find({});
    const existingSGDSections = await SGD.find({});

    const usedSGDQuestionIds = new Set();
    existingSGDSections.forEach(section => {
      section.summarizeGroupDiscussionQuestions.forEach(id => usedSGDQuestionIds.add(id.toString()));
    });

    const unusedSGDQuestions = allSGDQuestions.filter(q =>
      !usedSGDQuestionIds.has(q._id.toString())
    );

    res.status(200).json({
      success: true,
      data: {
        summarizeGroupDiscussion: unusedSGDQuestions, // Key for frontend
      },
    });
  } catch (error) {
    console.error("Error fetching unused Summarize Group Discussion questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unused Summarize Group Discussion questions",
    });
  }
};
