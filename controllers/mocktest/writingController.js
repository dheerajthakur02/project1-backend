import Writing, { WritingResult } from "../../models/mocktest/Writing.js";
import mongoose from "mongoose";
import { WriteEssayQuestion } from "../../models/writing/Essay.js";
import { WriteFromDictationQuestion } from "../../models/listening/WriteFromDictation.js";
import { SSTQuestion } from "../../models/listening/SSTQuestion.js";
import { SummarizeTextQuestion } from "../../models/writing/SummarizeText.js";




/* ===================== CREATE WRITING SECTION ===================== */
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

    await writing.save(); // 🔒 max 20 validated by schema (if applicable in your Writing model)

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

/* ===================== GET ALL WRITING SECTIONS ===================== */
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

/* ===================== GET WRITING SECTION BY ID (POPULATED) ===================== */
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

/* ===================== UPDATE WRITING SECTION ===================== */
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

/* ===================== DELETE WRITING SECTION ===================== */
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

/* ===================== GET UNUSED WRITING QUESTIONS ===================== */
export const getUnusedWritingQuestions = async (req, res) => {
  try {
    const [
      allSummarizeWrittenText,
      allWriteEssay,
      allSummarizeSpokenText,
      allWriteFromDictation,
      existingWritingSections
    ] = await Promise.all([
      SummarizeTextQuestion.find({}),
      WriteEssayQuestion.find({}),
      SSTQuestion.find({}),
      WriteFromDictationQuestion.find({}),
      Writing.find({})
    ]);

    const usedSummarizeWrittenTextIds = new Set();
    const usedWriteEssayIds = new Set();
    const usedSummarizeSpokenTextIds = new Set();
    const usedWriteFromDictationIds = new Set();

    existingWritingSections.forEach(section => {
      section.summarizeWrittenText.forEach(id => usedSummarizeWrittenTextIds.add(id.toString()));
      section.writeEssay.forEach(id => usedWriteEssayIds.add(id.toString()));
      section.summarizeSpokenText.forEach(id => usedSummarizeSpokenTextIds.add(id.toString()));
      section.writeFromDictation.forEach(id => usedWriteFromDictationIds.add(id.toString()));
    });

    const unusedSummarizeWrittenText = allSummarizeWrittenText.filter(q => !usedSummarizeWrittenTextIds.has(q._id.toString()));
    const unusedWriteEssay = allWriteEssay.filter(q => !usedWriteEssayIds.has(q._id.toString()));
    const unusedSummarizeSpokenText = allSummarizeSpokenText.filter(q => !usedSummarizeSpokenTextIds.has(q._id.toString()));
    const unusedWriteFromDictation = allWriteFromDictation.filter(q => !usedWriteFromDictationIds.has(q._id.toString()));

    res.status(200).json({
      success: true,
      data: {
        summarizeWrittenText: unusedSummarizeWrittenText,
        writeEssay: unusedWriteEssay,
        summarizeSpokenText: unusedSummarizeSpokenText,
        writeFromDictation: unusedWriteFromDictation,
      },
    });
  } catch (error) {
    console.error("Error fetching unused writing questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unused writing questions",
    });
  }
};


/* ============================================================
   MOCK TEST SUBMISSION & SCORING LOGIC (from your provided code)
   ============================================================ */

const cleanText = (text) =>
  text ? text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim() : "";

/**
 * MAIN CONTROLLER FOR SUBMITTING FULL WRITING MOCK TEST
 */
export const submitFullWritingMockTest = async (req, res) => {
  try {
    const { writingId, userId, answers } = req.body;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ success: false, message: "No answers provided" });
    }

    const processedResults = [];
    let cumulativeWritingScore = 0;

    for (const ans of answers) {
      const { questionId, type, answer: userText } = ans;
      let scoreDetails = { content: 0, grammar: 0, writingScore: 0 };

      // Check if user provided an actual answer
      const isAnswerEmpty = !userText || userText.trim().length < 2;

      if (!isAnswerEmpty) {
        if (type === "SWT") {
          scoreDetails = await processSWT(questionId, userText);
        } else if (type === "ESSAY") {
          scoreDetails = await processEssay(questionId, userText);
        } else if (type === "SST") {
          scoreDetails = await processSST(questionId, userText);
        } else if (type === "WFD") {
          scoreDetails = await processWFD(questionId, userText);
        }
      }

      processedResults.push({
        questionType: type,
        questionId: questionId,
        writingScore: scoreDetails.writingScore,
        contentScore: scoreDetails.content,
        grammarScore: scoreDetails.grammar,
        answerText: userText || "No response",
        score: scoreDetails.writingScore,
        maxScore: 90
      });

      cumulativeWritingScore += scoreDetails.writingScore;
    }

    const overallScore = processedResults.length > 0
      ? Math.round(cumulativeWritingScore / processedResults.length)
      : 0;

    const finalMockResult = await WritingResult.create({
      user: userId,
      writingId: writingId,
      overallScore: Number(overallScore),
      scores: processedResults,
      createdAt: new Date()
    });

    res.status(201).json({
      success: true,
      data: finalMockResult
    });

  } catch (error) {
    console.error("MOCK_TEST_SUBMIT_ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ============================================================
   FIXED SCORING HELPERS (Zero-Logic Added) - Your original logic
   ============================================================ */

async function processSWT(id, text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount < 5) return { content: 0, grammar: 0, writingScore: 0 };

  // Form (Max 1), Content (Max 2), Grammar (Max 2), Vocabulary (Max 2) = Total 7
  let form = (wordCount >= 5 && wordCount <= 75) ? 1 : 0;
  let content = wordCount > 30 ? 2 : 1;
  let grammar = text.includes('.') ? 2 : 1;
  let vocabulary = 1;

  let totalRaw = form + content + grammar + vocabulary;
  return { content, grammar, writingScore: (totalRaw / 7) * 90 };
}

async function processEssay(id, text) {
  const question = await WriteEssayQuestion.findById(id);
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // If essay is too short, score is 0
  if (wordCount < 50) return { content: 0, grammar: 0, writingScore: 0 };

  // 1. Form (Max 2)
  let form = 0;
  if (wordCount >= 200 && wordCount <= 300) form = 2;
  else if (wordCount >= 120 && wordCount <= 380) form = 1;

  // 2. Content (Max 3)
  let content = 0;
  const keywords = question?.keywords || [];
  if (keywords.length > 0) {
    const matched = keywords.filter(kw => text.toLowerCase().includes(kw.toLowerCase())).length;
    const ratio = matched / keywords.length;
    if (ratio > 0.6) content = 3;
    else if (ratio > 0.2) content = 2;
    else content = 1;
  } else {
    content = 2;
  }

  // 3. Grammar (Max 2)
  let grammar = (text.includes('.') && text.charAt(0) === text.charAt(0).toUpperCase()) ? 2 : 1;

  // 4. Structure/Vocab/Spelling (Simplified Max 8)
  let other = wordCount > 150 ? 6 : 3;

  const totalRaw = form + content + grammar + other; // Max 15
  return { content, grammar, writingScore: (totalRaw / 15) * 90 };
}

async function processSST(id, text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount < 10) return { content: 0, grammar: 0, writingScore: 0 };

  let form = (wordCount >= 50 && wordCount <= 70) ? 2 : 1;
  let grammar = /[A-Z]/.test(text[0]) && /[.!?]$/.test(text) ? 2 : 1;
  let content = wordCount > 40 ? 3 : 1;
  let vocab = 2;

  let totalRaw = form + grammar + content + vocab; // Max 12
  return { content, grammar, writingScore: (totalRaw / 12) * 90 };
}

async function processWFD(id, text) {
  const question = await WriteFromDictationQuestion.findById(id);
  if (!question || !text) return { content: 0, grammar: 0, writingScore: 0 };

  const originalWords = cleanText(question.transcript).split(/\s+/).filter(Boolean);
  const userWords = cleanText(text).split(/\s+/).filter(Boolean);

  let correctCount = 0;
  const tempOriginal = [...originalWords];

  userWords.forEach(uw => {
    const idx = tempOriginal.indexOf(uw);
    if (idx !== -1) {
      correctCount++;
      tempOriginal.splice(idx, 1);
    }
  });

  const writingScore = originalWords.length > 0
    ? (correctCount / originalWords.length) * 90
    : 0;

  return { content: correctCount, grammar: 0, writingScore };
}


/* ===================== GET USER WRITING RESULTS ===================== */
export const getUserWritingResults = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.params.userId;

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


export const getWritingResultById = async (req, res) => {
  try {
    const result = await WritingResult.findById(req.params.resultId).populate("writingId");
    if (!result) return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}