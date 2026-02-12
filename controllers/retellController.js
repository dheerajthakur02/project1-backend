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
      prepareTime: prepareTime || 10,
      answerTime: answerTime || 40,
      difficulty: difficulty || "Medium",
      isPredictive: isPredictive || false
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
    if (isPredictive !== undefined) question.isPredictive = isPredictive;

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

    /* -------- HELPERS -------- */
    const clean = (t) => t ? t.toLowerCase().replace(/[^\w\s]/g, "").trim() : "";
    
    // 1. Extract Keywords from Question (Simple Stopword Removal)
    const stopwords = ["a", "an", "the", "in", "on", "at", "to", "for", "of", "and", "but", "so", "is", "are", "was", "were", "this", "that", "it", "he", "she", "they", "we", "you", "i"];
    
    const originalText = clean(question.transcript);
    const originalWords = originalText.split(/\s+/).filter(w => w.length > 0);
    const keywords = originalWords.filter(w => w.length > 3 && !stopwords.includes(w));
    const uniqueKeywords = [...new Set(keywords)];

    // 2. Analyze Student Transcript
    const studentText = clean(transcript);
    const studentWords = studentText.split(/\s+/).filter(w => w.length > 0);
    const studentWordCount = studentWords.length;

    console.log("Original Transcript:", originalText);
    console.log("Keywords Extracted:", uniqueKeywords);
    console.log("Student Transcript:", studentText);
    console.log("Student Word Count:", studentWordCount);

    // Count Keyword Matches
    let matchedKeywords = 0;
    uniqueKeywords.forEach(k => {
        if (studentText.includes(k)) matchedKeywords++;
    });
    
    console.log("Matched Keywords Count:", matchedKeywords);

    /* -------- SCORING LOGIC -------- */
    
    /* A. CONTENT (0-5) */
    let content = 0;
    
    // Safety check for empty questions
    if (uniqueKeywords.length === 0) {
        // Fallback: Pure Length Based if no keywords found
        if (studentWordCount >= 30) content = 5;
        else if (studentWordCount >= 20) content = 4;
        else if (studentWordCount >= 10) content = 3;
        else content = 1;
        console.log("Content Score (No Q-Keywords - Fallback):", content);
    } else {
        // 1. Keyword Coverage Score (Accuracy) - Max 5
        const coverageRatio = matchedKeywords / uniqueKeywords.length;
        const keywordScore = Math.min(5, coverageRatio * 5);
        
        // 2. Length-Based Score (Volume) - Max 5
        let lengthScore = 0;
        if (studentWordCount >= 90) lengthScore = 5;
        else if (studentWordCount >= 70) lengthScore = 4;
        else if (studentWordCount >= 50) lengthScore = 3;
        else if (studentWordCount >= 30) lengthScore = 2;
        else if (studentWordCount >= 10) lengthScore = 1; // Basic effort
        
        // Final Content Score is the MAXIMUM of Accuracy OR Volume
        // This ensures short perfect answers get high scores, and long descriptive answers get high scores.
        // We require at least 1 keyword match to get ANY score generally, unless it's purely length based fallback.
        if (matchedKeywords === 0 && studentWordCount < 90) {
             content = 0; // If you said nothing relevant and it's not super long, 0.
             console.log("Content: 0 (No Keywords Matched)");
        } else {
             content = Math.max(keywordScore, lengthScore);
             // Ensure integer steps? User asked for "increase marks", usually 0-5 integers or float.
             // Let's keep it as float for nuance if coverage is 3.5, or round?
             // PTE usually uses integers for traits. Let's round to nearest integer or 0.5?
             // The prompt implied generic "marks". Let's use flexible float but cap at 5.
             content = Math.min(5, content);
             console.log(`Content Score: ${content} (Max of Keyword: ${keywordScore.toFixed(2)}, Length: ${lengthScore})`);
        }
    }

    /* B. PRONUNCIATION (0-5) - String Similarity */
    const pronunciation = stringSimilarity.compareTwoStrings(originalText, studentText) * 5;

    /* C. FLUENCY (0-5) - Length Ratio */
    // Ratio of student length to original length (capped at 1.0)
    let lengthRatio = 0;
    if (originalWords.length > 0) {
        lengthRatio = Math.min(studentWords.length, originalWords.length) / Math.max(studentWords.length, originalWords.length);
    }
    const fluency = lengthRatio * 5;

    /* D. TOTAL SCORE */
    const score = content + pronunciation + fluency;

    // Generate basic word analysis for frontend feedback
    const wordAnalysis = studentWords.map(word => ({
        word,
        status: uniqueKeywords.includes(word) ? "correct" : "incorrect" 
    }));

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
      wordAnalysis // Store basic analysis
    });

    res.status(201).json({ success: true, data: attempt });

  } catch (error) {
    console.error("RETELL ATTEMPT ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
