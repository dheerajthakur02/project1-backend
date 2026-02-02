import RL from "../../../models/mocktest/QuestionTests/RL.js";
import { SpeakingResult } from "../../../models/mocktest/Speaking.js";
import mongoose from "mongoose";
import stringSimilarity from "string-similarity";
import ReadAloudModel from "../../../models/readAloud.model.js";

/* ===================== GET HISTORY ===================== */
export const getReadAloudHistory = async (req, res) => {
  try {
    const { questionId } = req.params;
    const userId = req.user?._id || req.user?.id;

    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    // Find results where ANY score item matches the questionId
    const results = await SpeakingResult.find({
        user: userId,
        "scores.questionId": questionId
    }).sort({ createdAt: -1 });

    // Transform to match key frontend expectations if needed, 
    // or we will just update frontend to read this structure.
    // For now, returning the raw SpeakingResult list.
    res.status(200).json({ success: true, data: results });

  } catch (error) {
    console.error("Get RA History Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===================== CREATE RL ===================== */
export const createRL = async (req, res) => {
  try {
    const { title, readAloudQuestions = [] } = req.body;

    const rl = new RL({
      title,
      readAloudQuestions,
    });

    await rl.save(); // 🔒 max 5 validated by schema

    res.status(201).json({
      success: true,
      message: "Read Aloud section created successfully",
      data: rl,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===================== GET ALL RL ===================== */
export const getAllRL = async (req, res) => {
  try {
    const rlSections = await RL.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: rlSections.length,
      data: rlSections,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch Read Aloud sections",
    });
  }
};

/* ===================== GET RL BY ID ===================== */
export const getRLById = async (req, res) => {
  try {
    const { id } = req.params;

    const rlSection = await RL.findById(id)
      .populate("readAloudQuestions");

    if (!rlSection) {
      return res.status(404).json({
        success: false,
        message: "Read Aloud section not found",
      });
    }

    res.status(200).json({
      success: true,
      data: rlSection,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch Read Aloud section",
    });
  }
};

/* ===================== UPDATE RL ===================== */
export const updateRL = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedRL = await RL.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true,
        runValidators: true, // 🔒 important
      }
    );

    if (!updatedRL) {
      return res.status(404).json({
        success: false,
        message: "Read Aloud section not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Read Aloud section updated successfully",
      data: updatedRL,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===================== DELETE RL (OPTIONAL) ===================== */
export const deleteRL = async (req, res) => {
  try {
    const { id } = req.params;

    const rl = await RL.findByIdAndDelete(id);

    if (!rl) {
      return res.status(404).json({
        success: false,
        message: "Read Aloud section not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Read Aloud section deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete Read Aloud section",
    });
  }
};
/* ===================== SUBMIT RL ===================== */
/* ===================== SUBMIT RL ===================== */
/* ===================== SUBMIT RL ===================== */
/* ===================== SUBMIT RL ===================== */
export const submitRL = async (req, res) => {
  try {
    const { testId, answers, userId } = req.body;
    // answers: array of { questionId, audioUrl, transcript }

    /* ---------------- HELPER: NORMALIZATION ---------------- */
    const clean = (text) =>
      (text || "")
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
        .trim();

    /* ---------------- SCORING LOGIC ---------------- */
    let questionMap = new Map();
    let isPractice = false;

    // 1. Try to find RL Section (Mock Test Mode)
    // Validate testId format first to avoid CastError
    if (mongoose.Types.ObjectId.isValid(testId)) {
        const rlSection = await RL.findById(testId).populate("readAloudQuestions");
        if (rlSection) {
            rlSection.readAloudQuestions.forEach(q => questionMap.set(q._id.toString(), q.text));
        }
    }

    // 2. Fallback: Lookup Questions Directly (Practice Mode)
    if (questionMap.size === 0) {
        isPractice = true;
        // Collect all question IDs from answers
        const questionIds = answers.map(a => a.questionId).filter(id => mongoose.Types.ObjectId.isValid(id));
        
        if (questionIds.length > 0) {
            const questions = await ReadAloudModel.find({ _id: { $in: questionIds } });
            questions.forEach(q => questionMap.set(q._id.toString(), q.text));
        }
    }

    if (questionMap.size === 0) {
         return res.status(404).json({ success: false, message: "No questions found for submission" });
    }


    let totalFluency = 0;
    let totalPronunciation = 0;
    let totalContent = 0;
    const count = answers?.length || 0;

    const results = count > 0 ? answers.map(a => {
        const originalText = questionMap.get(a.questionId) || "";
        const transcript = a.transcript || ""; // User's speech transcript
        
        const originalClean = clean(originalText);
        const studentClean = clean(transcript);

        const originalWords = originalClean.split(/\s+/).filter(Boolean);
        const studentWords = studentClean.split(/\s+/).filter(Boolean);

        /* ---------------- WORD ANALYSIS ---------------- */
        const wordAnalysis = [];
        let matchedCount = 0;

        if (studentWords.length === 0) {
            originalWords.forEach(word => wordAnalysis.push({ word, status: "missing" }));
        } else {
            originalWords.forEach((word, index) => {
                const studentWord = studentWords[index];
                if (!studentWord) {
                    wordAnalysis.push({ word, status: "missing" });
                } else if (word === studentWord) {
                    wordAnalysis.push({ word, status: "correct" });
                    matchedCount++;
                } else {
                    const similarity = stringSimilarity.compareTwoStrings(word, studentWord);
                    if (similarity > 0.8) {
                        wordAnalysis.push({ word: studentWord, status: "correct" });
                        matchedCount++;
                    } else {
                        wordAnalysis.push({ word: studentWord, status: "incorrect" });
                    }
                }
            });
        }

        /* ---------------- SCORING ---------------- */
        const totalWords = originalWords.length || 1;
        const contentPercentage = (matchedCount / totalWords) * 100;

        // Content
        let contentScore = 0;
        if (contentPercentage === 100) contentScore = 5;
        else if (contentPercentage >= 70) contentScore = 4;
        else if (contentPercentage >= 40) contentScore = 3;
        else if (contentPercentage > 0) contentScore = 1;

        // Pronunciation
        const pronunciationScore = stringSimilarity.compareTwoStrings(originalClean, studentClean) * 5;

        // Fluency
        const sLen = studentWords.length || 1;
        const fluencyScore = (Math.min(sLen, totalWords) / Math.max(sLen, totalWords)) * 5;

        // Overall Question Score 
        const qScore = (contentScore + pronunciationScore + fluencyScore) / 3;

        totalFluency += fluencyScore;
        totalPronunciation += pronunciationScore;
        totalContent += contentScore;

        return {
            questionId: a.questionId,
            questionType: "RL",
            fluencyScore: parseFloat(fluencyScore.toFixed(1)),
            pronunciationScore: parseFloat(pronunciationScore.toFixed(1)),
            contentScore: parseFloat(contentScore.toFixed(1)),
            score: parseFloat(qScore.toFixed(1)),
            wordAnalysis,
            userTranscript: transcript, // Included for frontend display
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
        // If Practice Mode, use the first questionID as testId ref, and 'readaloud' as model
        testId: isPractice ? (answers[0]?.questionId) : testId, 
        testModel: isPractice ? 'readaloud' : 'RL', 
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
    console.error("Submit RL Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===================== GET UNUSED QUESTIONS FOR ALL TYPES ===================== */
export const getUnusedQuestionsForAllTypes = async (req, res) => {
  try {
    // --- Read Aloud Questions ---
    const allReadAloudQuestions = await ReadAloudModel.find({});
    const existingRLSections = await RL.find({});

    const usedReadAloudQuestionIds = new Set();
    existingRLSections.forEach(section => {
      section.readAloudQuestions.forEach(id => usedReadAloudQuestionIds.add(id.toString()));
    });

    const unusedReadAloudQuestions = allReadAloudQuestions.filter(q =>
      !usedReadAloudQuestionIds.has(q._id.toString())
    );

   
    res.status(200).json({
      success: true,
      data: {
        readAloud: unusedReadAloudQuestions,
      },
    });
  } catch (error) {
    console.error("Error fetching unused questions for all types:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unused questions for all types",
    });
  }
};