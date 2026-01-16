import { SummarizeWrittenAttempt, SummarizeTextQuestion } from "../../models/writing/SummarizeText.js";

import mongoose from "mongoose";
import stringSimilarity from "string-similarity";

export const createSummarizeTextQuestion = async (req, res) => {
  try {
    const question = await SummarizeTextQuestion.create(req.body);
    res.status(201).json({ success: true, question });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



export const  getSummarizeTextQuestionsWithAttempts = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId
    if (!userId)
      return res.status(400).json({ success: false, message: "userId is required" });

    if (!mongoose.Types.ObjectId.isValid(userId))
      return res.status(400).json({ success: false, message: "Invalid userId" });

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const questions = await SummarizeTextQuestion.aggregate([
      // Total attempt count
      {
        $lookup: {
          from: "summarizewrittenattempts",
          let: { qId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$questionId", "$$qId"] },
                    { $eq: ["$userId", userObjectId] },
                  ],
                },
              },
            },
            { $count: "count" },
          ],
          as: "attemptCountArr",
        },
      },

      // Last attempts
      {
        $lookup: {
          from: "summarizewrittenattempts",
          let: { qId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$questionId", "$$qId"] },
                    { $eq: ["$userId", userObjectId] },
                  ],
                },
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 10 },
            {
              $project: {
                summaryText: 1,
                wordCount: 1,
                score: 1,
                content: 1,
                grammar: 1,
                vocabulary: 1,
                form: 1,
                readingScore: 1,
                writingScore: 1,
                misSpelled: 1,
                structureErrors: 1,
                styleIssues: 1,
                timeTaken: 1,
                createdAt: 1,
              },
            },
          ],
          as: "lastAttempts",
        },
      },

      // Merge last attempt into top-level field for convenience
      {
        $addFields: {
          attemptCount: { $ifNull: [{ $arrayElemAt: ["$attemptCountArr.count", 0] }, 0] },
          isAttempted: { $gt: [{ $ifNull: [{ $arrayElemAt: ["$attemptCountArr.count", 0] }, 0] }, 0] },
          lastAttempt: { $arrayElemAt: ["$lastAttempts", 0] }, // most recent attempt
        },
      },

      // Clean up
      { $project: { attemptCountArr: 0 } },
    ]);

    return res.status(200).json({ success: true, data: questions });
  } catch (error) {
    console.error("GET SUMMARIZE QUESTIONS ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


export const submitSummarizeWrittenAttempt = async (req, res) => {
  try {
    const { questionId, summaryText, timeTaken, userId } = req.body;

    const words = summaryText.trim().split(/\s+/);
    const wordCount = words.length;

    /* -------- FORM RULE -------- */
    const formScore = wordCount >= 5 && wordCount <= 75 ? 1 : 0;

    /* -------- DUMMY AI LOGIC (REPLACE LATER) -------- */
    const content = Math.min(4, Math.floor(wordCount / 20));
    const grammar = 2;
    const vocabulary = 2;

    const score = content + grammar + vocabulary + formScore;

    const readingScore = score / 2;
    const writingScore = score / 2;

    const attempt = await SummarizeWrittenAttempt.create({
      questionId,
      userId,
      summaryText,
      timeTaken,
      wordCount,
      score,
      content,
      grammar,
      vocabulary,
      form: formScore,
      readingScore,
      writingScore,
    });

    res.status(201).json({
      success: true,
      data: attempt,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
