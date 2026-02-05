import mongoose from "mongoose";
import { cloudinary } from "../config/cloudinary.js";
import {
  ShortAnswerQuestion,
  ShortAnswerAttempt,
} from "../models/shortAnswer.model.js";

/* =====================================================
   ADD SHORT ANSWER QUESTION
===================================================== */
export const getAllQuestions = async (req, res) => {
    try {
        const questions = await ShortAnswerQuestion.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: questions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const addQuestion = async (req, res) => {
  try {
    const { title, prepareTime, answerTime, answer, transcript, difficulty, isPredictive } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Audio file is required" });
    }

    const audio = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "video",
    });

    const question = await ShortAnswerQuestion.create({
      title,
      prepareTime,
      answerTime,
      answer,
      transcript,
      transcript,
      difficulty: difficulty || "easy",
      audioUrl: audio.secure_url,
      cloudinaryId: audio.public_id,
      isPredictive: isPredictive || false,
    });

    res.status(201).json(question);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =====================================================
   GET QUESTIONS WITH USER ATTEMPTS
===================================================== */
export const getQuestionsWithAttempts = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const questions = await ShortAnswerQuestion.aggregate([
      /* ---------- TOTAL ATTEMPT COUNT ---------- */
      {
        $lookup: {
          from: "shortanswerattempts",
          let: { qId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$questionId", "$$qId"] },
                    { $eq: ["$userId", userObjectId] }
                  ]
                }
              }
            },
            { $count: "count" }
          ],
          as: "attemptCountArr"
        }
      },

      /* ---------- LAST ATTEMPTS ---------- */
      {
        $lookup: {
          from: "shortanswerattempts",
          let: { qId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$questionId", "$$qId"] },
                    { $eq: ["$userId", userObjectId] }
                  ]
                }
              }
            },
            { $sort: { createdAt: -1 } },
            { $limit: 10 },
            {
              $project: {
                score: 1,
                transcript: 1,
                studentAudio: 1,
                createdAt: 1
              }
            }
          ],
          as: "lastAttempts"
        }
      },

      /* ---------- FLAGS ---------- */
      {
        $addFields: {
          attemptCount: {
            $ifNull: [{ $arrayElemAt: ["$attemptCountArr.count", 0] }, 0]
          },
          isAttempted: {
            $gt: [
              { $ifNull: [{ $arrayElemAt: ["$attemptCountArr.count", 0] }, 0] },
              0
            ]
          }
        }
      },

      { $project: { attemptCountArr: 0 } }
    ]);

    res.status(200).json({
      success: true,
      data: questions
    });
  } catch (error) {
    console.error("Get Questions Error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* =====================================================
   UPDATE QUESTION
===================================================== */
export const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await ShortAnswerQuestion.findById(id);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    const { title, prepareTime, answerTime, answer, transcript, difficulty, isPredictive } = req.body;

    if (req.file) {
      await cloudinary.uploader.destroy(question.cloudinaryId, {
        resource_type: "video",
      });

      const uploaded = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "video",
      });

      question.audioUrl = uploaded.secure_url;
      question.cloudinaryId = uploaded.public_id;
    }

    if (title !== undefined) question.title = title;
    if (answer !== undefined) question.answer = answer;
    if (transcript !== undefined) question.transcript = transcript;
    if (prepareTime !== undefined) question.prepareTime = prepareTime;
    if (answerTime !== undefined) question.answerTime = answerTime;
    if (difficulty !== undefined) question.difficulty = difficulty;
    if (difficulty !== undefined) question.difficulty = difficulty;
    if (isPredictive !== undefined) question.isPredictive = isPredictive;

    await question.save();
    res.json(question);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



import User from "../models/user.model.js";
export const getCommunityShortAnswerAttemptsByQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;

    if (!questionId || !mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({
        success: false,
        message: "Valid questionId is required"
      });
    }

    const qId = new mongoose.Types.ObjectId(questionId);

    const attempts = await ShortAnswerAttempt.aggregate([
      /**
       * 1️⃣ Match only this question
       */
      { $match: { questionId: qId } },

      /**
       * 2️⃣ Sort latest attempts first
       */
      { $sort: { createdAt: -1 } },

      /**
       * 3️⃣ Group by user → collect all attempts
       */
      {
        $group: {
          _id: "$userId",
          attempts: { $push: "$$ROOT" } // push all attempts into an array
        }
      },

      /**
       * 4️⃣ Keep only latest 15 attempts per user
       */
      {
        $project: {
          attempts: { $slice: ["$attempts", 15] }
        }
      },

      /**
       * 5️⃣ Flatten array back into documents
       */
      { $unwind: "$attempts" },
      { $replaceRoot: { newRoot: "$attempts" } },

      /**
       * 6️⃣ Populate user info
       */
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

      /**
       * 7️⃣ Project only required fields
       */
      {
        $project: {
          userId: 1,
          "user.name": 1,
          score: 1,
          answer: 1,
          transcript: 1,
          createdAt: 1,
          studentAudio: 1
        }
      },

      /**
       * 8️⃣ Optional: limit total records for UI
       */
      { $limit: 300 } // 20 users × 15 attempts = max 300
    ]);

    res.status(200).json({
      success: true,
      count: attempts.length,
      data: attempts
    });

  } catch (error) {
    console.error("Community Short Answer Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


/* =====================================================
   DELETE QUESTION
===================================================== */
export const deleteQuestion = async (req, res) => {
  try {
    const question = await ShortAnswerQuestion.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    await cloudinary.uploader.destroy(question.cloudinaryId, {
      resource_type: "video",
    });

    await question.deleteOne();
    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



import stringSimilarity from "string-similarity";

export const createShortAnswerAttempt = async (req, res) => {
  try {
    let { questionId, userId, transcript } = req.body;

    /* ---------- VALIDATE IDS ---------- */
    if (
      !mongoose.Types.ObjectId.isValid(questionId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return res.status(400).json({ success: false, message: "Invalid IDs" });
    }

    questionId = new mongoose.Types.ObjectId(questionId);
    userId = new mongoose.Types.ObjectId(userId);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Audio file required",
      });
    }

    /* ---------- FETCH QUESTION ---------- */
    const question = await ShortAnswerQuestion.findById(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    /* ---------- NORMALIZE ---------- */
    const clean = (text) =>
      text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, "");

    const correctAnswer = clean(question.answer);
    const studentAnswer = clean(transcript);

    /* ---------- SCORE (1 or 0) ---------- */
    const score = correctAnswer === studentAnswer ? 1 : 0;

    /* ---------- SAVE ATTEMPT ---------- */
    const attempt = await ShortAnswerAttempt.create({
      questionId,
      userId,
      transcript,
      score,
      studentAudio: {
        public_id: req.file.filename,
        url: req.file.path,
      },
    });

    return res.status(201).json({
      success: true,
      data: attempt,
    });
  } catch (error) {
    console.error("CREATE SHORT ANSWER ATTEMPT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
