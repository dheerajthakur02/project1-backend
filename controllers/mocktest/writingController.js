import Writing, { WritingResult } from "../../models/mocktest/Writing.js";
import mongoose from "mongoose";
import { WriteEssayQuestion } from "../../models/writing/Essay.js";
import { WriteFromDictationQuestion } from "../../models/listening/WriteFromDictation.js";

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




const cleanText = (text) => 
  text ? text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim() : "";

/**
 * MAIN CONTROLLER
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
   FIXED SCORING HELPERS (Zero-Logic Added)
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


/* --- Helper Logic (Extracted from your provided code) --- */

async function calculateEssayScore(ans) {
    const { answer: essayText } = ans;
    const words = essayText.trim().split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;

    // A. Form (Max 2)
    let form = (wordCount >= 200 && wordCount <= 300) ? 2 : 1;
    // B. Grammar (Max 2)
    const sentences = essayText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const correctSentences = sentences.filter(s => /^[A-Z]/.test(s.trim())).length;
    let grammar = (correctSentences / sentences.length > 0.8) ? 2 : 1;
    
    const rawScore = form + grammar + 5; // Simplified for brevity
    return { content: 3, grammar, vocabulary: 2, rawScore, writingScore: (rawScore / 15) * 90 };
}

async function calculateSWTScore(ans) {
    const words = ans.answer.trim().split(/\s+/);
    const wordCount = words.length;
    const form = wordCount >= 5 && wordCount <= 75 ? 2 : 0;
    const rawScore = form + 5; // Placeholder content score
    return { content: 2, grammar: 2, vocabulary: 1, rawScore, writingScore: (rawScore / 7) * 90 };
}

// Add similar helpers for SST and WFD using the logic you already wrote...
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


export const getWritingResultById = async (req, res) => {
  try {
    const result = await WritingResult.findById(req.params.resultId);
    if (!result) return res.status(404).json({ success: false, message: "Not found" });
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}