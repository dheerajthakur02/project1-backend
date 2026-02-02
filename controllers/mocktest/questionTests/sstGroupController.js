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

/* ================= SUBMIT SST ================= */
import { ListeningResult } from "../../../models/mocktest/Listening.js";

export const submitSSTGroup = async (req, res) => {
  try {
    const { testId, answers, userId } = req.body;
    // answers: { questionIdx: "User summary text..." }

    const group = await SSTGroup.findById(testId).populate("summarizeSpokenTextQuestion");
    if (!group) {
        return res.status(404).json({ success: false, message: "Test section not found" });
    }

    const questions = group.summarizeSpokenTextQuestion;
    let totalScore = 0;
    let totalMaxScore = 0;
    const results = [];

    questions.forEach((question, qIdx) => {
        const userText = answers[qIdx] || "";
        const words = userText.trim().split(/\s+/).filter(w => w.length > 0);
        const wordCount = words.length;

        // --- Mock Scoring Logic ---
        
        // 1. Form (Max 2): 50-70 words = 2, 40-49 or 71-100 = 1, else 0
        let formScore = 0;
        if (wordCount >= 50 && wordCount <= 70) formScore = 2;
        else if ((wordCount >= 40 && wordCount < 50) || (wordCount > 70 && wordCount <= 100)) formScore = 1;

        // 2. Content (Max 2): Check keywords
        const keywords = question.keywords || [];
        let matches = 0;
        if (keywords.length > 0) {
            const lowerText = userText.toLowerCase();
            keywords.forEach(k => {
                if (lowerText.includes(k.toLowerCase())) matches++;
            });
            // Simple heuristic
            if (matches >= Math.min(4, keywords.length)) contentScore = 2;
            else if (matches >= 2) contentScore = 1;
        }
        let contentScore = keywords.length ? (matches > 0 ? 2 : 0) : 2; // Default if no keywords

        // 3. Others (Mocked)
        // Hard to judge grammar/vocab without AI, so we give partial credit if form is good
        let grammarScore = formScore > 0 ? 1.5 : 0;
        let vocabScore = formScore > 0 ? 1.5 : 0;
        let spellingScore = formScore > 0 ? 1.5 : 0; // max 2

        const questionScore = formScore + contentScore + grammarScore + vocabScore + spellingScore;
        const questionMax = 10; // 2+2+2+2+2

        totalScore += questionScore;
        totalMaxScore += questionMax;

        results.push({
            questionId: question._id,
            questionType: "SST",
            score: questionScore,
            maxScore: questionMax,
            userAnswer: userText,
            contentScore,
            formScore, 
            grammarScore, 
            vocabScore, 
            spellingScore
        });
    });

    const listeningResult = new ListeningResult({
        user: req.user?._id || req.user?.id || userId,
        testId: testId,
        testModel: 'SST',
        overallScore: totalScore,
        sectionScores: {
            listening: totalScore,
            writing: totalScore
        },
        scores: results
    });

    await listeningResult.save();

    res.json({
        success: true,
        data: listeningResult
    });

  } catch (error) {
    console.error("Submit SST Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===================== GET UNUSED SST QUESTIONS ===================== */
export const getUnusedSSTQuestions = async (req, res) => {
  try {
    const allSSTQuestions = await SSTQuestion.find({});
    const existingSSTGroups = await SSTGroup.find({});

    const usedSSTQuestionIds = new Set();
    existingSSTGroups.forEach(group => {
      group.summarizeSpokenTextQuestion.forEach(id => usedSSTQuestionIds.add(id.toString()));
    });

    const unusedSSTQuestions = allSSTQuestions.filter(q =>
      !usedSSTQuestionIds.has(q._id.toString())
    );

    res.status(200).json({
      success: true,
      data: {
        summarizeSpokenTextQuestion: unusedSSTQuestions, // Key for frontend matching schema
      },
    });
  } catch (error) {
    console.error("Error fetching unused SST questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unused SST questions",
    });
  }
};