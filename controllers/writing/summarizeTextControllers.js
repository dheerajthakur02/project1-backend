import { SummarizeWrittenAttempt, SummarizeTextQuestion } from "../../models/writing/SummarizeText.js";

import mongoose from "mongoose";
import stringSimilarity from "string-similarity";

export const getAllQuestions = async (req, res) => {
  try {
    const questions = await SummarizeTextQuestion.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: questions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createSummarizeTextQuestion = async (req, res) => {
  try {
    const question = await SummarizeTextQuestion.create(req.body);
    res.status(201).json({ success: true, question });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSummarizeTextQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Find existing question
    const question = await SummarizeTextQuestion.findById(id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    // 2. Update only provided fields
    Object.keys(req.body).forEach((key) => {
      if (req.body[key] !== undefined) {
        question[key] = req.body[key];
      }
    });

    // 3. Save updated question
    await question.save();

    res.status(200).json({
      success: true,
      question,
      message: "Summarize Text question updated successfully",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const deleteSummarizeTextQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await SummarizeTextQuestion.findByIdAndDelete(id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Summarize Text question deleted successfully",
      question,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
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
    // Logic: 50-70 words -> 2 marks, 40-49 words -> 1 mark, else 0
    let formScore = 0;
    if (wordCount >= 50 && wordCount <= 70) {
        formScore = 2;
    } else if (wordCount >= 40 && wordCount <= 49) {
        formScore = 1;
    }
    
    // Check for double dots ".."
    if (summaryText.includes("..")) {
        formScore = 0;
    }

    /* -------- DUMMY AI LOGIC (REPLACE LATER) -------- */
    let content = Math.min(4, Math.floor(wordCount / 20));
    let grammar = 2;
    let vocabulary = 2;

    // If form is 0 (due to word count or double dots), total score is 0
    let score = 0;
    if (formScore === 1) {
       score = content + grammar + vocabulary + formScore;
    } else {
       // If form is invalid, usually other scores might strictly be 0 or penalized.
       // User said "give marks 0", so we default everything to 0 if they fail this check?
       // Let's set total score to 0 directly if ".." is present, overriding everything.
       if (summaryText.includes("..")) {
           content = 0;
           grammar = 0;
           vocabulary = 0;
           formScore = 0;
           score = 0;
       } else {
           // Standard word count failure logic (usually keeps component scores but form is 0)
           // But PTE rule: If form is 0, Content is 0.
           // For now, let's keep the user's specific request about ".." separate/explicit.
           score = content + grammar + vocabulary + formScore;
       }
    }
    
    // Refined logic based on "give marks 0":
    if (summaryText.includes("..")) {
        score = 0;
        content = 0;
        grammar = 0;
        vocabulary = 0;
        formScore = 0;
    } else {
        // Recalculate if not zeroed out
        score = content + grammar + vocabulary + formScore;
    }

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



export const getSummarizeTextQuestionsWithCommunityAttempts = async (req, res) => {
  try {
    const { questionId } = req.params;

    const matchStage = questionId
      ? { _id: new mongoose.Types.ObjectId(questionId) }
      : {};

    const questions = await SummarizeTextQuestion.aggregate([
      { $match: matchStage },

      /* ---------------- LOOKUP COMMUNITY ATTEMPTS ---------------- */
      {
        $lookup: {
          from: "summarizewrittenattempts",
          let: { qId: "$_id" },
          pipeline: [
            /* Match attempts for this question */
            {
              $match: {
                $expr: { $eq: ["$questionId", "$$qId"] }
              }
            },

            /* Latest first */
            { $sort: { createdAt: -1 } },

            /* Group by user */
            {
              $group: {
                _id: "$userId",
                attempts: { $push: "$$ROOT" }
              }
            },

            /* Limit attempts per user */
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
    console.error("GET SUMMARIZE COMMUNITY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
