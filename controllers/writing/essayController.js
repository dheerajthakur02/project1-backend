import { EssayAttempt, WriteEssayQuestion } from "../../models/writing/Essay.js";
import mongoose from "mongoose";

export const createEssayQuestion = async (req, res) => {
  try {
    const question = await WriteEssayQuestion.create(req.body);
    res.status(201).json({ success: true, question });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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



/* ---------- Submit Essay Attempt ---------- */
export const submitEssayAttempt = async (req, res) => {
  try {
    const { questionId, essayText, timeTaken, userId } = req.body;


    const wordCount = essayText.trim().split(/\s+/).length;

    // Dummy scoring logic
    const content = Math.min(6, Math.floor(wordCount / 50));
    const grammar = Math.min(2, Math.floor(Math.random() * 3));
    const spelling = Math.min(2, Math.floor(Math.random() * 3));
    const vocabulary = Math.min(2, Math.floor(Math.random() * 3));
    const form = wordCount >= 200 ? 2 : 0;
    const structure = Math.min(6, Math.floor(wordCount / 40));
    const general = Math.min(6, Math.floor(wordCount / 45));

    const score = content + grammar + spelling + vocabulary + form + structure + general;
    const writingScore = Number((score / 3.15).toFixed(2));

    const attempt = await EssayAttempt.create({
      questionId,
      userId,
      essayText,
      wordCount,
      timeTaken,
      score,
      writingScore,
      content,
      grammar,
      spelling,
      vocabulary,
      form,
      structure,
      general,
      misspelled: Math.floor(Math.random() * 4),
      grammarErrors: Math.floor(Math.random() * 5),
      structureIssues: Math.floor(Math.random() * 3),
      styleIssues: Math.floor(Math.random() * 3)
    });

    res.status(201).json(attempt);

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
