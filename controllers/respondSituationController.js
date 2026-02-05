// controllers/respondSituation.controller.js
import mongoose from "mongoose";
import { cloudinary } from "../config/cloudinary.js";
import stringSimilarity from "string-similarity";
import fs from "fs";
import { createClient } from "@deepgram/sdk";
import dotenv from "dotenv";

import {
  RespondSituationQuestion,
  RespondSituationAttempt,
} from "../models/respondSituation.model.js";

dotenv.config();
const deepgram = createClient(process.env.API_KEY);

/* ================================
   ADD QUESTION
================================ */
export const addRespondSituationQuestion = async (req, res) => {
  try {
    const { title, prepareTime, answerTime, difficulty, answer, keywords, modelAnswer, isPredictive } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Audio file is required" });
    }

    // Upload audio to Cloudinary
    const audio = await cloudinary.uploader.upload(req.file.path, { resource_type: "video" });

   // Auto-transcription using Deepgram
    const audioBuffer = fs.readFileSync(req.file.path);
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(audioBuffer, {
      smart_format: true,
      model: "nova-2",
      language: "en-US",
    });
    if (error) throw error;

    const transcript = result.results.channels[0].alternatives[0].transcript;

    // Save question
    const question = await RespondSituationQuestion.create({
      title,
      audioUrl: audio?.secure_url,
      cloudinaryId: audio?.public_id,
      transcript: transcript,
      prepareTime: prepareTime || 10,
      answerTime: answerTime || 40,
      difficulty: difficulty || "Medium",
      answer,
      keywords: keywords ? JSON.parse(keywords) : [],
      modelAnswer: modelAnswer || "",
      isPredictive
    });

    res.status(201).json({ success: true, data: question });

  } catch (error) {
    console.error("ADD RESPOND SITUATION QUESTION ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================================
   UPDATE QUESTION
================================ */
export const updateRespondSituationQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await RespondSituationQuestion.findById(id);
    if (!question) return res.status(404).json({ message: "Question not found" });

    const { title, prepareTime, answerTime, difficulty, answer, keywords, modelAnswer, isPredictive } = req.body;

    // AUDIO UPDATE
    if (req.file) {
      if (question.cloudinaryId) {
        await cloudinary.uploader.destroy(question.cloudinaryId, { resource_type: "video" });
      }
      const uploaded = await cloudinary.uploader.upload(req.file.path, { resource_type: "video" });
      question.audioUrl = uploaded.secure_url;
      question.cloudinaryId = uploaded.public_id;

      const audioBuffer = fs.readFileSync(req.file.path);
      const { result, error } = await deepgram.listen.prerecorded.transcribeFile(audioBuffer, {
        smart_format: true,
        model: "nova-2",
        language: "en-US",
      });
      if (error) throw error;
      question.transcript = result.results.channels[0].alternatives[0].transcript;
    }

    // FIELD UPDATES
    if (title !== undefined) question.title = title;
    if (prepareTime !== undefined) question.prepareTime = prepareTime;
    if (answerTime !== undefined) question.answerTime = answerTime;
    if (difficulty !== undefined) question.difficulty = difficulty;
    if (answer !== undefined) question.answer = answer;
    if (keywords !== undefined) question.keywords = Array.isArray(keywords) ? keywords : JSON.parse(keywords);
    if (modelAnswer !== undefined) question.modelAnswer = modelAnswer;
    if(isPredictive!== undefined)  question.isPredictive =isPredictive;
    await question.save();
    res.json({ success: true, data: question });

  } catch (error) {
    console.error("UPDATE RESPOND SITUATION QUESTION ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================================
   GET QUESTIONS WITH USER ATTEMPTS
================================ */
export const getRespondSituationQuestionsWithAttempts = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const questions = await RespondSituationQuestion.aggregate([
      {
        $lookup: {
          from: "respondsituationattempts",
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
          from: "respondsituationattempts",
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
                transcript: 1,
                createdAt: 1,
                studentAudio: 1,
                wordAnalysis: 1
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

export const getCommunityRespondSituationAttemptsByQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;

    /* ---------------- VALIDATE questionId ---------------- */
    if (!questionId || !mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({
        success: false,
        message: "Valid questionId is required"
      });
    }

    const qId = new mongoose.Types.ObjectId(questionId);

    const attempts = await RespondSituationAttempt.aggregate([
      /* ---------------- MATCH QUESTION ---------------- */
      { $match: { questionId: qId } },

      /* ---------------- SORT LATEST FIRST ---------------- */
      { $sort: { createdAt: -1 } },

      /* ---------------- GROUP BY USER → COLLECT ALL ATTEMPTS ---------------- */
      {
        $group: {
          _id: "$userId",
          attempts: { $push: "$$ROOT" } // push all attempts into an array
        }
      },

      /* ---------------- KEEP UP TO 15 ATTEMPTS PER USER ---------------- */
      {
        $project: {
          attempts: { $slice: ["$attempts", 15] } // max 15 attempts per user
        }
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
          as: "user"
        }
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true
        }
      },

      /* ---------------- FINAL RESPONSE ---------------- */
      {
        $project: {
          userId: 1,
          "user.name": 1,
          score: 1,
          content: 1,
          transcript: 1,
          fluency: 1,
          pronunciation: 1,
          wordAnalysis: 1,
          studentAudio: 1,
          createdAt: 1
        }
      },

      /* ---------------- LIMIT TOTAL FOR UI ---------------- */
      { $limit: 300 } // e.g., 20 users × 15 attempts = max 300
    ]);

    return res.status(200).json({
      success: true,
      count: attempts.length,
      data: attempts
    });

  } catch (error) {
    console.error("COMMUNITY RESPOND SITUATION ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


export const deleteRespondSituationQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await RespondSituationQuestion.findById(id);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    // Remove audio from Cloudinary
    if (question.cloudinaryId) {
      await cloudinary.uploader.destroy(
        question.cloudinaryId,
        { resource_type: "video" }
      );
    }

    await RespondSituationQuestion.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "RTS question deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


/* ================================
   CREATE ATTEMPT
================================ */
export const createRespondSituationAttempt = async (req, res) => {
  try {
    let { questionId, userId, transcript } = req.body;

    if (!req.file) return res.status(400).json({ message: "Audio is required" });

    userId = new mongoose.Types.ObjectId(userId);
    questionId = new mongoose.Types.ObjectId(questionId);

    const question = await RespondSituationQuestion.findById(questionId);
    if (!question) return res.status(404).json({ message: "Question not found" });

    const clean = (text) => text.toLowerCase().replace(/[^\w\s]/g, "").trim();

    const originalWords = clean(question.answer).split(/\s+/);
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
        wordAnalysis.push({ word: sWord, status: sim > 0.8 ? "correct" : "incorrect" });
        if (sim > 0.8) matched++;
      }
    });

    const content = (matched / originalWords.length) * 5;
    const pronunciation = stringSimilarity.compareTwoStrings(clean(question.transcript || ""), clean(transcript)) * 5;
    const fluency = (Math.min(studentWords.length, originalWords.length) / Math.max(studentWords.length, originalWords.length)) * 5;
    const score = content + pronunciation + fluency;

    const audioUpload = await cloudinary.uploader.upload(req.file.path, { resource_type: "video" });

    const attempt = await RespondSituationAttempt.create({
      questionId,
      userId,
      studentAudio: { url: audioUpload.secure_url, public_id: audioUpload.public_id },
      transcript,
      score: score.toFixed(1),
      content: content.toFixed(1),
      pronunciation: pronunciation.toFixed(1),
      fluency: fluency.toFixed(1),
      wordAnalysis
    });

    res.status(201).json({ success: true, data: attempt });

  } catch (error) {
    console.error("CREATE RESPOND SITUATION ATTEMPT ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
