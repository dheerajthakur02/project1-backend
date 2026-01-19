import { ListeningFIBQuestion, ListeningFIBAttempt } from "../../models/listening/ListeningFIBQuestion.js";
import mongoose from "mongoose";
import { cloudinary } from "../../config/cloudinary.js";
import fs from "fs";

// ---------- CREATE QUESTION ----------
export const addListeningFIBQuestion = async (req, res) => {
  try {
    const { title, transcript, correctAnswers, difficulty } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Audio is required" });
    }

    // correctAnswers might come as stringified JSON if sent via FormData
    let parsedCorrectAnswers = correctAnswers;
    if (typeof correctAnswers === "string") {
      parsedCorrectAnswers = JSON.parse(correctAnswers);
    }

    // Upload audio
    const audio = await cloudinary.uploader.upload(req.file.path, { resource_type: "video" });

    const question = await ListeningFIBQuestion.create({
      title,
      audioUrl: audio.secure_url,
      cloudinaryId: audio.public_id,
      transcript,
      correctAnswers: parsedCorrectAnswers,
      difficulty: difficulty || "Medium"
    });

    res.status(201).json({ success: true, question });
  } catch (error) {
    console.error("ADD LISTENING FIB QUESTION ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
// ---------- GET QUESTIONS (WITH ATTEMPTS) ----------
export const getListeningFIBQuestionsWithAttempts = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required" });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const questions = await ListeningFIBQuestion.aggregate([
      /* ================= TOTAL ATTEMPTS ================= */
      {
        $lookup: {
          from: ListeningFIBAttempt.collection.name,
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

      /* ================= LAST 10 ATTEMPTS ================= */
      {
        $lookup: {
          from: ListeningFIBAttempt.collection.name,
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
                userAnswers: 1,
                score: 1,
                maxScore: 1,
                timeTaken: 1,
                createdAt: 1
              }
            }
          ],
          as: "lastAttempts"
        }
      },

      /* ================= FIELDS ================= */
      {
        $addFields: {
          attemptCount: { $ifNull: [{ $arrayElemAt: ["$attemptCountArr.count", 0] }, 0] },
          isAttempted: {
            $gt: [{ $ifNull: [{ $arrayElemAt: ["$attemptCountArr.count", 0] }, 0] }, 0]
          }
        }
      },
      { $project: { attemptCountArr: 0 } }
    ]);

    res.status(200).json({ success: true, data: questions });
  } catch (error) {
    console.error("GET LISTENING FIB QUESTIONS ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------- SUBMIT ATTEMPT ----------
export const submitListeningFIBAttempt = async (req, res) => {
  try {
    const { questionId, userId, userAnswers, timeTaken } = req.body;

    const question = await ListeningFIBQuestion.findById(questionId);
    if (!question) return res.status(404).json({ success: false, message: "Question not found" });

    // Scoring: +1 for each correct answer (case insensitive)
    let score = 0;
    const maxScore = question.correctAnswers.length;

    // userAnswers is array of strings: ["ans1", "ans2", ...]
    // correctAnswers is array of objects: [{index:1, correctAnswer:"ans"}, ...]
    // We assume userAnswers are in order of blanks 1, 2, 3...
    
    question.correctAnswers.sort((a, b) => a.index - b.index).forEach((ca, idx) => {
      const uAns = userAnswers[idx] || "";
      if (uAns.trim().toLowerCase() === ca.correctAnswer.trim().toLowerCase()) {
        score++;
      }
    });

    const attempt = await ListeningFIBAttempt.create({
      questionId,
      userId,
      userAnswers,
      score,
      maxScore,
      timeTaken
    });

    res.status(201).json({ success: true, attempt });
  } catch (error) {
    console.error("SUBMIT LISTENING FIB ATTEMPT ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
