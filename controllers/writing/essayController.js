import { EssayAttempt, WriteEssayQuestion } from "../../models/writing/Essay.js";
import mongoose from "mongoose";

export const getAllQuestions = async (req, res) => {
  try {
    const questions = await WriteEssayQuestion.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: questions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createEssayQuestion = async (req, res) => {
  try {
    const question = await WriteEssayQuestion.create(req.body);
    res.status(201).json({ success: true, question });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateEssayQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedQuestion = await WriteEssayQuestion.findByIdAndUpdate(
      id,
      { $set: req.body }, // update only provided fields
      { new: true, runValidators: true }
    );

    if (!updatedQuestion) {
      return res.status(404).json({
        success: false,
        message: "Essay question not found",
      });
    }

    res.status(200).json({
      success: true,
      question: updatedQuestion,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const deleteEssayQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await WriteEssayQuestion.findByIdAndDelete(id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Essay question not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Essay question deleted successfully",
      question,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const scoreEssay = ({ essayText, minWords = 200, maxWords = 300 }) => {
  const words = essayText.trim().split(/\s+/);
  const wordCount = words.length;

  // 1️⃣ Word Count Score (0–20)
  let wordScore = 0;
  if (wordCount >= minWords && wordCount <= maxWords) {
    wordScore = 20;
  } else if (wordCount >= minWords * 0.8) {
    wordScore = 15;
  } else if (wordCount >= minWords * 0.6) {
    wordScore = 10;
  }

  // 2️⃣ Grammar Score (simple heuristic)
  const grammarMistakes = (essayText.match(/\b(is|are|was|were)\s+(is|are|was|were)\b/gi) || []).length;
  const grammarScore = Math.max(20 - grammarMistakes * 2, 8);

  // 3️⃣ Vocabulary Score
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  const vocabRatio = uniqueWords.size / wordCount;
  const vocabularyScore =
    vocabRatio > 0.6 ? 20 :
    vocabRatio > 0.45 ? 15 :
    vocabRatio > 0.3 ? 10 : 8;

  // 4️⃣ Relevance Score (placeholder – later AI)
  const relevanceScore = 15;

  // 5️⃣ Final Score
  const totalScore =
    wordScore +
    grammarScore +
    vocabularyScore +
    relevanceScore;

  // 6️⃣ Band Score (PTE-like)
  let band = 0;
  if (totalScore >= 70) band = 90;
  else if (totalScore >= 60) band = 79;
  else if (totalScore >= 50) band = 65;
  else band = 50;

  return {
    wordCount,
    scores: {
      wordScore,
      grammarScore,
      vocabularyScore,
      relevanceScore,
    },
    totalScore,
    band,
  };
};


export const submitEssayAttempt = async (req, res) => {
  try {
    const { questionId, essayText, timeTaken, userId } = req.body;

    // 1. Basic cleaning and word count
    const words = essayText.trim().split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;

    // 2. Fetch question keywords to check "Content" (Optional but recommended)
    const question = await WriteEssayQuestion.findById(questionId);
    const keywords = question?.keywords || []; // e.g. ["environment", "pollution", "global"]

    /* ---------- SCORING CALCULATIONS ---------- */

    // A. FORM (Max 2) - PTE Standard: 200-300 words
    let form = 0;
    if (wordCount >= 200 && wordCount <= 300) form = 2;
    else if ((wordCount >= 120 && wordCount < 200) || (wordCount > 300 && wordCount <= 380)) form = 1;
    else form = 0;

    // C. DEVELOPMENT (Max 2) - Formerly 'Structure'
    const transitionWords = ["furthermore", "moreover", "however", "consequently", "therefore", "in conclusion", "firstly", "secondly", "additionally", "nevertheless", "on the other hand", "for example"];
    const foundTransitions = transitionWords.filter(word => essayText.toLowerCase().includes(word)).length;
    const paragraphs = essayText.split('\n').filter(p => p.trim().length > 0).length;
    
    let structure = 0;
    if (foundTransitions >= 3 && paragraphs >= 2) structure = 2;
    else if (foundTransitions >= 1 || paragraphs >= 2) structure = 1;

    // B. CONTENT (Max 6) - User Logic: 0, 2, 3, 6
    /*
        6– Full Marks: Completely answers the question, clear position, well-developed ideas, fully on topic, within word limit (200-300).
        3 – Partial: Mostly on topic, some ideas underdeveloped, slightly unclear argument.
        2 – Weak: Limited relevance, very short or poorly developed, ideas unclear.
        0 – No Content: Off topic, too short (very low word count), memorized template.
    */
    let content = 0;
    const lowerEssay = essayText.toLowerCase();
    
    // Check keyword matches if available
    if (keywords && keywords.length > 0) {
        const matches = keywords.filter(k => lowerEssay.includes(k.toLowerCase())).length;

        if (matches >= 4 && wordCount >= 200 && wordCount <= 300) {
             // High relevance + Correct Length -> 6
             content = 6;
        } else if (matches >= 3 && wordCount >= 120) {
             // Good relevance + Decent Length -> 3
             content = 3;
        } else if (matches >= 1 && wordCount >= 50) {
             // Weak relevance -> 2
             content = 2;
        } else {
             // No matches or too short -> 0
             content = 0;
        }
    } else {
        // Fallback Logic (No keywords defined on question)
        // Rely on Length & Structure (Development) as proxy for quality
        if (wordCount >= 200 && wordCount <= 300 && structure === 2) {
            content = 6;
        } else if (wordCount >= 120 && structure >= 1) {
            content = 3;
        } else if (wordCount >= 50) {
            content = 2;
        } else {
            content = 0;
        }
    }

    // D. VOCABULARY (Max 2) - Lexical Range
    const uniqueWords = new Set(words.map(w => w.toLowerCase())).size;
    const lexicalRange = uniqueWords / wordCount;
    let vocabulary = 0;
    if (lexicalRange > 0.4 && wordCount > 100) vocabulary = 2;
    else if (lexicalRange > 0.3) vocabulary = 1;

    // E. GRAMMAR (Max 2)
    const sentences = essayText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const correctSentences = sentences.filter(s => /^[A-Z]/.test(s.trim())).length;
    let grammar = 0;
    if (sentences.length > 0) {
        if (correctSentences / sentences.length > 0.8) grammar = 2;
        else if (correctSentences / sentences.length > 0.5) grammar = 1;
    }

    // F. SPELLING (Max 2)
    // Simulated for now
    let misspelledCount = Math.floor(Math.random() * 5); 
    let spelling = 2;
    if (misspelledCount === 1) spelling = 1;
    else if (misspelledCount >= 2) spelling = 0;

    // G. GENERAL LINGUISTIC RANGE (Max 2)
    let general = 0;
    if (content >= 3 && structure >= 1 && vocabulary >= 1) general = 2;
    else if (content >= 2) general = 1;


    /* ---------- FINAL TOTALS ---------- */

    // Total Score (PTE max is usually 15 for essay, but we sum components)
    // Content (6) + Form (2) + Development/Structure (2) + Vocabulary (2) + Grammar (2) + Spelling (2) + General (2) = 18 Max
    const totalMax = 18;
    const rawScore = content + grammar + spelling + vocabulary + form + structure + general;
    
    // Scale it to a 0-90 scale (PTE standard)
    const writingScore = Number(((rawScore / totalMax) * 90).toFixed(0));

    const attempt = await EssayAttempt.create({
      questionId,
      userId,
      essayText,
      wordCount,
      timeTaken,
      score: rawScore,
      writingScore, 
      content,
      grammar,
      spelling,
      vocabulary,
      form,
      structure,
      general,
      misspelled: misspelledCount,
      grammarErrors: sentences.length - correctSentences,
      structureIssues: paragraphs < 3 ? 1 : 0,
      styleIssues: foundTransitions < 3 ? 1 : 0
    });

    res.status(201).json({
        success: true,
        data: attempt
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};



export const getWriteEssayQuestionsWithAttempts = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId)
      return res.status(400).json({ success: false, message: "userId is required" });

    if (!mongoose.Types.ObjectId.isValid(userId))
      return res.status(400).json({ success: false, message: "Invalid userId" });

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const questions = await WriteEssayQuestion.aggregate([
      // Total attempt count
      {
        $lookup: {
          from: "essayattempts",
          let: { qId: "$_id" },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ["$questionId", "$$qId"] }, { $eq: ["$userId", userObjectId] }] } } },
            { $count: "count" }
          ],
          as: "attemptCountArr"
        }
      },
      // Last 10 attempts
      {
        $lookup: {
          from: "essayattempts",
          let: { qId: "$_id" },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ["$questionId", "$$qId"] }, { $eq: ["$userId", userObjectId] }] } } },
            { $sort: { createdAt: -1 } },
            { $limit: 10 },
            {
              $project: {
                essayText: 1,
                wordCount: 1,
                score: 1,
                writingScore: 1,
                content: 1,
                grammar: 1,
                spelling: 1,
                vocabulary: 1,
                form: 1,
                structure: 1,
                general: 1,
                misspelled: 1,
                grammarErrors: 1,
                structureIssues: 1,
                styleIssues: 1,
                timeTaken: 1,
                createdAt: 1
              }
            }
          ],
          as: "lastAttempts"
        }
      },
      // Add fields
      {
        $addFields: {
          attemptCount: { $ifNull: [{ $arrayElemAt: ["$attemptCountArr.count", 0] }, 0] },
          isAttempted: { $gt: [{ $ifNull: [{ $arrayElemAt: ["$attemptCountArr.count", 0] }, 0] }, 0] }
        }
      },
      // Clean up
      { $project: { attemptCountArr: 0 } }
    ]);

    return res.status(200).json({ success: true, data: questions });

  } catch (error) {
    console.error("GET WRITE ESSAY QUESTIONS ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


export const getWriteEssayQuestionsWithCommunityAttempts = async (req, res) => {
  try {
    const { questionId } = req.params;

    const matchStage = questionId
      ? { _id: new mongoose.Types.ObjectId(questionId) }
      : {};

    const questions = await WriteEssayQuestion.aggregate([
      { $match: matchStage },

      /* ---------------- LOOKUP COMMUNITY ATTEMPTS ---------------- */
      {
        $lookup: {
          from: "essayattempts",
          let: { qId: "$_id" },
          pipeline: [
            /* Match attempts for this question */
            {
              $match: {
                $expr: { $eq: ["$questionId", "$$qId"] }
              }
            },

            /* Latest attempts first */
            { $sort: { createdAt: -1 } },

            /* Group attempts by user */
            {
              $group: {
                _id: "$userId",
                attempts: { $push: "$$ROOT" }
              }
            },

            /* Keep max 15 attempts per user */
            {
              $project: {
                userId: "$_id",
                attempts: { $slice: ["$attempts", 15] }
              }
            },

            /* Populate user */
            {
              $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "user"
              }
            },
            {
              $unwind: {
                path: "$user",
                preserveNullAndEmptyArrays: true
              }
            },

            /* Final response shape */
            {
              $project: {
                userId: 1,
                user: { name: "$user.name" },
                attempts: {
                  essayText: 1,
                  wordCount: 1,
                  score: 1,
                  writingScore: 1,
                  content: 1,
                  grammar: 1,
                  spelling: 1,
                  vocabulary: 1,
                  form: 1,
                  structure: 1,
                  general: 1,
                  misspelled: 1,
                  grammarErrors: 1,
                  structureIssues: 1,
                  styleIssues: 1,
                  timeTaken: 1,
                  createdAt: 1
                }
              }
            }
          ],
          as: "communityAttempts"
        }
      },

      /* ---------------- TOTAL COMMUNITY USERS ---------------- */
      {
        $addFields: {
          totalCommunityUsers: { $size: "$communityAttempts" }
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      data: questions
    });

  } catch (error) {
    console.error("GET WRITE ESSAY COMMUNITY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
