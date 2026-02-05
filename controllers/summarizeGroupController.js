import {cloudinary} from "../config/cloudinary.js";
import {SummarizeGroupAttempt, SummarizeGroupQuestion } from "../models/summarizeGroup.model.js";
import mongoose from "mongoose";
import stringSimilarity from "string-similarity";

// Upload Question
export const addQuestion = async (req, res) => {
  const { title, prepareTime, answerTime, answer, transcript, isPredictive } = req.body;

  const audio = await cloudinary.uploader.upload(req.file.path, {
    resource_type: "video"
  });

  const question = await SummarizeGroupQuestion.create({
    title,
    prepareTime,
    answerTime,
    answer,
    transcript,
    transcript,
    audioUrl: audio?.secure_url,
    cloudinaryId: audio?.public_id,
    difficulty: req.body.difficulty || "Medium",
    isPredictive: isPredictive || false
  });

  res.json(question);
};



export const getQuestionsWithAttempts = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const questions = await SummarizeGroupQuestion.aggregate([
      /* ================= TOTAL ATTEMPT COUNT ================= */
      {
        $lookup: {
          from: SummarizeGroupAttempt.collection.name,
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

      /* ================= LAST 10 ATTEMPTS ================= */
      {
        $lookup: {
          from: SummarizeGroupAttempt.collection.name,
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
                score: 1,
                content: 1,
                fluency: 1,
                pronunciation: 1,
                createdAt: 1,
                studentAudio: 1,
              },
            },
          ],
          as: "lastAttempts",
        },
      },

      /* ================= FINAL SHAPE ================= */
      {
        $addFields: {
          attemptCount: {
            $ifNull: [{ $arrayElemAt: ["$attemptCountArr.count", 0] }, 0],
          },
          isAttempted: {
            $gt: [
              { $ifNull: [{ $arrayElemAt: ["$attemptCountArr.count", 0] }, 0] },
              0,
            ],
          },
        },
      },

      {
        $project: {
          attemptCountArr: 0,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: questions,
    });

  } catch (error) {
    console.error("Get Questions Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

import User from "../models/user.model.js";
export const getCommunitySummarizeGroupAttemptsByQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;

    /* ---------------- VALIDATE questionId ---------------- */
    if (!questionId || !mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({
        success: false,
        message: "Valid questionId is required",
      });
    }

    const qId = new mongoose.Types.ObjectId(questionId);

    const attempts = await SummarizeGroupAttempt.aggregate([
      /* ---------------- MATCH QUESTION ---------------- */
      { $match: { questionId: qId } },

      /* ---------------- SORT LATEST FIRST ---------------- */
      { $sort: { createdAt: -1 } },

      /* ---------------- GROUP BY USER → COLLECT ALL ATTEMPTS ---------------- */
      {
        $group: {
          _id: "$userId",
          attempts: { $push: "$$ROOT" }, // push all attempts into an array
        },
      },

      /* ---------------- KEEP UP TO 15 ATTEMPTS PER USER ---------------- */
      {
        $project: {
          attempts: { $slice: ["$attempts", 15] }, // max 15 attempts per user
        },
      },

      /* ---------------- FLATTEN ARRAY BACK TO DOCUMENTS ---------------- */
      { $unwind: "$attempts" },
      { $replaceRoot: { newRoot: "$attempts" } },

      /* ---------------- POPULATE USER ---------------- */
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },

      /* ---------------- FINAL PROJECTION ---------------- */
      {
        $project: {
          userId: 1,
          "user.name": 1,
          score: 1,
          content: 1,
          fluency: 1,
          pronunciation: 1,
          studentAudio: 1,
          createdAt: 1,
        },
      },

      /* ---------------- LIMIT TOTAL FOR UI ---------------- */
      { $limit: 300 }, // e.g., 20 users × 15 attempts = 300 max
    ]);

    return res.status(200).json({
      success: true,
      count: attempts.length,
      data: attempts,
    });
  } catch (error) {
    console.error("Community Summarize Group Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await SummarizeGroupQuestion.findById(id);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    const title = req.body?.title;
    const prepareTime = req.body?.prepareTime;
    const answerTime = req.body?.answerTime;
    const transcript = req.body?.transcript;
    const isPredictive = req.body?.isPredictive

    // If new audio uploaded
    if (req.file) {
    //   // Delete old audio
      await cloudinary.uploader.destroy(question.cloudinaryId, {
        resource_type: "video"
      });

      // Upload new audio
      const uploaded = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "video"
      });

      question.audioUrl = uploaded.secure_url;
      question.cloudinaryId = uploaded.public_id;
    }

    // Update text fields only if sent
    if (title !== undefined) question.title = title;
    if (prepareTime !== undefined) question.prepareTime = prepareTime;
    if (answerTime !== undefined) question.answerTime = answerTime;
    if (transcript !== undefined) question.transcript = transcript;
    if (isPredictive !== undefined) question.isPredictive = isPredictive;

    await question.save();

    res.json(question);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// Delete question
export const deleteQuestion = async (req, res) => {
  const q = await SummarizeGroupQuestion.findById(req.params.id);
  await cloudinary.uploader.destroy(q.cloudinaryId, { resource_type: "video" });
  await q.deleteOne();
  res.json({ message: "Deleted" });
};

export const createSummarizeGroupAttempt = async (req, res) => {
  try {
    let { questionId, userId, transcript } = req.body;

    /* ---------------- VALIDATE & CAST userId ---------------- */
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId"
      });
    }

    userId = new mongoose.Types.ObjectId(userId);

    /* ---------------- VALIDATE & CAST questionId ---------------- */
    if (!questionId || !mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid questionId"
      });
    }

    questionId = new mongoose.Types.ObjectId(questionId);

    /* ---------------- VALIDATE AUDIO ---------------- */
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Audio recording is required"
      });
    }

    /* ---------------- FETCH QUESTION ---------------- */
    const question = await SummarizeGroupQuestion.findById(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found"
      });
    }

    const originalText = question.title;
    if (!originalText) {
      return res.status(500).json({
        success: false,
        message: "Question text is missing"
      });
    }

    /* ---------------- NORMALIZATION ---------------- */
    const clean = (text) =>
      (text || "")
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
        .trim();

    const originalClean = clean(question.answer);
    const studentClean = clean(transcript);

    const originalWords = originalClean.split(/\s+/).filter(Boolean);
    const studentWords = studentClean.split(/\s+/).filter(Boolean);

    /* ---------------- WORD ANALYSIS ---------------- */
    const wordAnalysis = [];
    let matchedCount = 0;

    if (studentWords.length === 0) {
      originalWords.forEach(word =>
        wordAnalysis.push({ word, status: "missing" })
      );
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

    /* ---------------- SCORING (5 + 5 + 5 = 15) ---------------- */
    const totalWords = originalWords.length || 1;
    const contentPercentage = (matchedCount / totalWords) * 100;

    // Content (max 5)
    let contentScore = 0;
    if (contentPercentage === 100) contentScore = 6;
    else if (contentPercentage >= 70) contentScore = 4;
    else if (contentPercentage >= 40) contentScore = 3;
    else if (contentPercentage > 0) contentScore = 1;

    // Pronunciation (max 5)
    const pronunciationScore =
      stringSimilarity.compareTwoStrings(originalClean, studentClean) * 5;

    // Fluency (max 5)
    const sLen = studentWords.length || 1;
    const fluencyScore =
      (Math.min(sLen, totalWords) / Math.max(sLen, totalWords)) * 5;

    // Total (max 15)
    const totalScore =
      contentScore + pronunciationScore + fluencyScore;

    /* ---------------- SAVE ATTEMPT ---------------- */
    const attempt = await SummarizeGroupAttempt.create({
      questionId,
      userId,
      studentAudio: {
        public_id: req.file.filename,
        url: req.file.path
      },
      transcript: transcript || "",
      score: totalScore.toFixed(1),
      content: contentScore.toFixed(1),
      pronunciation: pronunciationScore.toFixed(1),
      fluency: fluencyScore.toFixed(1),
      wordAnalysis
    });

    return res.status(201).json({
      success: true,
      data: attempt
    });

  } catch (error) {
    console.error("CREATE ATTEMPT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};