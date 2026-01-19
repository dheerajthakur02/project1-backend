import fs from "fs";
import { createClient } from "@deepgram/sdk";
import { HighlightSummaryQuestion, HighlightSummaryAttempt } from "../../models/listening/HCSQuestion.js";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { cloudinary } from "../../config/cloudinary.js";
dotenv.config();
const deepgram = createClient(process.env.API_KEY);
// ---------- CREATE QUESTION ----------
export const addHighlightSummaryQuestion = async (req, res) => {
  try {
    const { summaries, difficulty } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Audio is required" });
    }

    if (!summaries || summaries.length !== 3) {
      return res.status(400).json({ success: false, message: "Provide 3 summaries" });
    }

    // Upload audio
    const audio = await cloudinary.uploader.upload(req.file.path, { resource_type: "video" });

    // Transcribe audio using Deepgram
    const audioBuffer = fs.readFileSync(req.file.path);
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(audioBuffer, {
      smart_format: true,
      model: "nova-2",
      language: "en-US"
    });

    if (error) throw error;

    const transcript = result.results.channels[0].alternatives[0].transcript;

    // Save question
    const question = await HighlightSummaryQuestion.create({
      audioUrl: audio.secure_url,
      cloudinaryId: audio.public_id,
      transcript,
      summaries: summaries.map(s => ({
        text: s.text,
        isCorrect: s.isCorrect
      })),
      difficulty: difficulty || "Medium"
    });

    res.status(201).json({ success: true, question });
  } catch (error) {
    console.error("ADD HIGHLIGHT SUMMARY QUESTION ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};



// ---------- GET QUESTIONS ----------
export const getHighlightSummaryQuestions = async (req, res) => {
  try {
    const questions = await HighlightSummaryQuestion.find();
    res.status(200).json({ success: true, questions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------- ADD ATTEMPT ----------
export const addHighlightSummaryAttempt = async (req, res) => {
  try {
    const { questionId, userId, selectedSummaryIndex, timeTaken } = req.body;

    const question = await HighlightSummaryQuestion.findById(questionId);
    if (!question) return res.status(404).json({ success: false, message: "Question not found" });

    const isCorrect = question.summaries[selectedSummaryIndex]?.isCorrect || false;

    const attempt = await HighlightSummaryAttempt.create({
      questionId,
      userId,
      selectedSummaryIndex,
      isCorrect,
      timeTaken
    });

    res.status(201).json({ success: true, attempt });
  } catch (error) {
    console.error("ADD HIGHLIGHT SUMMARY ATTEMPT ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------- GET USER ATTEMPTS ----------
export const getHighlightSummaryQuestionsWithAttempts = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const questions = await HighlightSummaryQuestion.aggregate([
      /* ================= TOTAL ATTEMPT COUNT ================= */
      {
        $lookup: {
          from: HighlightSummaryAttempt.collection.name,
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
          from: HighlightSummaryAttempt.collection.name,
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
                selectedSummaryIndex: 1,
                isCorrect: 1,
                timeTaken: 1,
                createdAt: 1
              }
            }
          ],
          as: "lastAttempts"
        }
      },

      /* ================= FINAL FIELDS ================= */
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

      {
        $project: {
          attemptCountArr: 0
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      data: questions
    });

  } catch (error) {
    console.error("GET HIGHLIGHT SUMMARY QUESTIONS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};



export const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await HighlightSummaryQuestion.findById(id);
    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    const { title, difficulty,  summaries } = req.body;

    // ---------- AUDIO UPDATE ----------
    if (req.file) {
      // Delete old audio from Cloudinary
      // if (question.cloudinaryId) {
      //   await cloudinary.uploader.destroy(question.cloudinaryId, {
      //     resource_type: "video",
      //   });
      // }

      // Upload new audio
      const uploaded = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "video",
      });

      question.audioUrl = uploaded.secure_url;
      question.cloudinaryId = uploaded.public_id;

      // Optional: auto-update transcript if audio changed
     
    // Transcribe audio using Deepgram
    const audioBuffer = fs.readFileSync(req.file.path);
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(audioBuffer, {
      smart_format: true,
      model: "nova-2",
      language: "en-US"
    });

    if (error) throw error;

    const transcript = result.results.channels[0].alternatives[0].transcript;
    question.transcript = transcript;
    }

    // ---------- FIELD UPDATES ----------
    if (title !== undefined) question.title = title;
    if (difficulty !== undefined) question.difficulty = difficulty;

    // ---------- SUMMARIES UPDATE ----------
    if (summaries !== undefined) {
      const correctCount = summaries.filter(s => s.isCorrect === true).length;

      if (correctCount !== 1) {
        return res.status(400).json({
          success: false,
          message: "Exactly one summary must be marked as correct",
        });
      }

      question.summaries = summaries;
    }

    await question.save();

    res.status(200).json({
      success: true,
      question,
    });

  } catch (error) {
    console.error("UPDATE HIGHLIGHT SUMMARY QUESTION ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
