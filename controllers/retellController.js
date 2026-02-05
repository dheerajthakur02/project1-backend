import mongoose from "mongoose";
import { cloudinary } from "../config/cloudinary.js";
import stringSimilarity from "string-similarity";
import {
  RetellLectureQuestion,
  RetellLectureAttempt
} from "../models/retell.model.js";
import fs from "fs";
import { createClient } from "@deepgram/sdk";

import dotenv from "dotenv";
dotenv.config();
const deepgram = createClient(process.env.API_KEY);



export const getAllQuestions = async (req, res) => {
    try {
        const questions = await RetellLectureQuestion.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: questions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const addRetellQuestion = async (req, res) => {
  try {
     const { title, prepareTime, answerTime, difficulty, isPredictive } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Audio file is required"
      });
    }

    /* ---------- UPLOAD AUDIO ---------- */
    const audio = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "video"
    });

    /* ---------- AUTO TRANSCRIPTION ---------- */
      // 2. Convert Audio to Transcript using OpenAI Whisper
        const audioBuffer = fs.readFileSync(req.file.path);
        const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
            audioBuffer,
            {
                smart_format: true,
                model: "nova-2", // Their fastest and most accurate model
                language: "en-US",
            }
        );

        if (error) throw error;

        // Extract transcript text
        const transcript = result.results.channels[0].alternatives[0].transcript;

       

    /* ---------- SAVE QUESTION ---------- */
    const question = await RetellLectureQuestion.create({
      title,
      audioUrl: audio.secure_url,
      cloudinaryId: audio.public_id,
      transcript: transcript,
      isPredictive,
      prepareTime: prepareTime || 10,
      answerTime: answerTime || 40,
      difficulty: difficulty || "Medium"
    });

    res.status(201).json({
      success: true,
      data: question
    });

  } catch (error) {
    console.error("ADD RETELL QUESTION ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updateRetellQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await RetellLectureQuestion.findById(id);
    if (!question) {
      return res.status(404).json({ message: "Retell question not found" });
    }

    const {
      title,
      prepareTime,
      answerTime,
      difficulty,
     isPredictive
    } = req.body;

    /* -------- AUDIO UPDATE -------- */
    if (req.file) {
      // delete old audio
      if (question.cloudinaryId) {
        await cloudinary.uploader.destroy(question.cloudinaryId, {
          resource_type: "video",
        });
      }

      // upload new audio
      const uploaded = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "video",
      });

      question.audioUrl = uploaded.secure_url;
      question.cloudinaryId = uploaded.public_id;

      // dummy transcript if not provided
         const audioBuffer = fs.readFileSync(req.file.path);
        const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
            audioBuffer,
            {
                smart_format: true,
                model: "nova-2", // Their fastest and most accurate model
                language: "en-US",
            }
        );

        if (error) throw error;

        // Extract transcript text
         const transcript = result.results.channels[0].alternatives[0].transcript;

         question.transcript = transcript;
    }

    /* -------- FIELD UPDATES -------- */
    if (title !== undefined) question.title = title;
    if (prepareTime !== undefined) question.prepareTime = prepareTime;
    if (answerTime !== undefined) question.answerTime = answerTime;
    if (difficulty !== undefined) question.difficulty = difficulty;
    if(isPredictive !== undefined) question.isPredictive = isPredictive

    await question.save();
    res.json(question);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteRetell = async (req, res) => {
  try {
    const { id } = req.params;

    // Use a different variable name, e.g., deletedQuestion
    const deletedQuestion = await RetellLectureQuestion.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Deleted successfully",
      response: deletedQuestion,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getRetellLectureById = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await RetellLectureQuestion.findById(id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Retell lecture not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: question,
    });
  } catch (error) {
    console.error("Get by ID error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export const getRetellQuestionsWithAttempts = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const questions = await RetellLectureQuestion.aggregate([
      {
        $lookup: {
          from: "retelllectureattempts",
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
      {
        $lookup: {
          from: "retelllectureattempts",
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
                content: 1,
                fluency: 1,
                pronunciation: 1,
                createdAt: 1,
                studentAudio: 1
              }
            }
          ],
          as: "lastAttempts"
        }
      },
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

    res.json({ success: true, data: questions });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

import User from "../models/user.model.js";
export const getCommunityAttemptsByQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;

    if (!questionId || !mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({
        success: false,
        message: "Valid questionId is required"
      });
    }

    const qId = new mongoose.Types.ObjectId(questionId);

    const attempts = await RetellLectureAttempt.aggregate([
      // 1️⃣ Match only this question
      { $match: { questionId: qId } },

      // 2️⃣ Sort latest attempts first
      { $sort: { createdAt: -1 } },

      // 3️⃣ Group by user → keep latest 15 attempts
      {
        $group: {
          _id: "$userId",
          latestAttempts: { $push: "$$ROOT" } // push all attempts into an array
        }
      },

      // 4️⃣ Slice to max 15 attempts per user
      {
        $project: {
          latestAttempts: { $slice: ["$latestAttempts", 15] }
        }
      },

      // 5️⃣ Unwind to flatten the array back into documents
      { $unwind: "$latestAttempts" },

      // 6️⃣ Replace root to have normal document structure
      { $replaceRoot: { newRoot: "$latestAttempts" } },

      // 7️⃣ Optional: populate user info
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },

      // 8️⃣ Project only required fields
      {
        $project: {
          userId: 1,
          "user.name": 1,
          score: 1,
          content: 1,
          fluency: 1,
          pronunciation: 1,
          createdAt: 1,
          studentAudio: 1
        }
      },

      // 9️⃣ Optional: limit total records for UI
      { $limit: 300 } // 20 users × 15 attempts = 300 max
    ]);

    res.status(200).json({
      success: true,
      count: attempts.length,
      data: attempts
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};




export const createRetellAttempt = async (req, res) => {
  try {
    let { questionId, userId, transcript } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Audio is required" });
    }

    userId = new mongoose.Types.ObjectId(userId);
    questionId = new mongoose.Types.ObjectId(questionId);

    const question = await RetellLectureQuestion.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    const clean = (t) =>
      t.toLowerCase().replace(/[^\w\s]/g, "").trim();

    const originalWords = clean(question.transcript).split(/\s+/);
    const studentWords = clean(transcript).split(/\s+/);

    let matched = 0;
    const wordAnalysis = [];

    originalWords.forEach((word, i) => {
      const sWord = studentWords[i];
      if (!sWord) {
        wordAnalysis.push({ word, status: "missing" });
      } else if (word === sWord) {
        matched++;
        wordAnalysis.push({ word, status: "correct" });
      } else {
        const sim = stringSimilarity.compareTwoStrings(word, sWord);
        wordAnalysis.push({
          word: sWord,
          status: sim > 0.8 ? "correct" : "incorrect"
        });
        if (sim > 0.8) matched++;
      }
    });

    const content = (matched / originalWords.length) * 5;
    const pronunciation =
      stringSimilarity.compareTwoStrings(
        clean(question.transcript),
        clean(transcript)
      ) * 5;

    const fluency =
      (Math.min(studentWords.length, originalWords.length) /
        Math.max(studentWords.length, originalWords.length)) * 5;

    const score = content + pronunciation + fluency;

    const attempt = await RetellLectureAttempt.create({
      questionId,
      userId,
      studentAudio: {
        url: req.file.path,
        public_id: req.file.filename
      },
      transcript,
      score: score.toFixed(1),
      content: content.toFixed(1),
      pronunciation: pronunciation.toFixed(1),
      fluency: fluency.toFixed(1),
      wordAnalysis
    });

    res.status(201).json({ success: true, data: attempt });

  } catch (error) {
    console.error("RETELL ATTEMPT ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
