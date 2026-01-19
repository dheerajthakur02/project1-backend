import { SSTAttempt, SSTQuestion } from "../../models/listening/SSTQuestion.js";
import mongoose from "mongoose";
import fs from 'fs';
import { createClient } from "@deepgram/sdk";
import dotenv from "dotenv";
import { cloudinary } from "../../config/cloudinary.js";
dotenv.config();
const deepgram = createClient(process.env.API_KEY);

export const createQuestion = async (req, res) => {
  try {
    const { title, difficulty, keywords, answer } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Audio file is required"
      });
    }

    // ---------- UPLOAD AUDIO ----------
    const audio = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "video" // audio/video files
    });

    // ---------- AUTO TRANSCRIPTION ----------
    const audioBuffer = fs.readFileSync(req.file.path);
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        smart_format: true,
        model: "nova-2",
        language: "en-US"
      }
    );

    if (error) throw error;

    const transcript = result.results.channels[0].alternatives[0].transcript;

    // ---------- SAVE QUESTION ----------
    const question = await SSTQuestion.create({
      title,
      audioUrl: audio.secure_url,
      transcript,
      answer,
      cloudinaryId: audio.public_id,
      keywords: keywords || [],
      difficulty: difficulty || "Medium"
    });

    res.status(201).json({
      success: true,
      question
    });

  } catch (error) {
    console.error("CREATE QUESTION ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// Get all questions
export const getQuestionsWithAttempts = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const questions = await SSTQuestion.aggregate([
      // 1️⃣ Count total attempts by this user per question
      {
        $lookup: {
          from: "sstattempts",
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
      // 2️⃣ Get last 10 attempts for this user per question
      {
        $lookup: {
          from: "sstattempts",
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
                scores: 1,
                totalScore: 1,
                overallScore: 1,
                timeTaken: 1,
                createdAt: 1,
                summaryText: 1
              }
            }
          ],
          as: "lastAttempts"
        }
      },
      // 3️⃣ Add convenient fields
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
      { $project: { attemptCountArr: 0 } } // remove intermediate array
    ]);

    res.status(200).json({ success: true, data: questions });
  } catch (error) {
    console.error("GET QUESTIONS WITH ATTEMPTS ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// Get single question by ID
export const getQuestionById = async (req, res) => {
    try {
        const { id } = req.params;
        const question = await SSTQuestion.findById(id);
        if (!question) return res.status(404).json({ success: false, message: 'Question not found' });

        res.status(200).json({ success: true, question });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to fetch question' });
    }
};


export const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const question = await SSTQuestion.findById(id);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

   const title = req.body?.title;
   const difficulty = req.body?.difficulty;
   const keywords = req.body?.keywords;
   const answer = req.body?.answer;

    // ---------- AUDIO UPDATE ----------
    if (req.file) {
      // Delete old audio from Cloudinary
    //   if (question.cloudinaryId) {
    //     await cloudinary.uploader.destroy(question.cloudinaryId, {
    //       resource_type: "video",
    //     });
    //   }

      // Upload new audio
      const uploaded = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "video",
      });

      question.audioUrl = uploaded.secure_url;
      question.cloudinaryId = uploaded.public_id;

      // Auto transcription using Deepgram
      const audioBuffer = fs.readFileSync(req.file.path);
      const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
          smart_format: true,
          model: "nova-2",
          language: "en-US",
        }
      );

      if (error) throw error;

      const transcript = result.results.channels[0].alternatives[0].transcript;
      question.transcript = transcript;


    }

    // ---------- FIELD UPDATES ----------
    if (title !== undefined) question.title = title;
    if (difficulty !== undefined) question.difficulty = difficulty;
    if (keywords !== undefined) question.keywords = keywords;
    if (answer !== undefined) question.answer = answer;

    await question.save();

    res.status(200).json({
      success: true,
      question,
    });

  } catch (error) {
    console.error("UPDATE QUESTION ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};




export const submitSSTAttempt = async (req, res) => {
    try {
        const { questionId, summaryText, timeTaken, userId } = req.body;

        // 1. Fetch the original question data
        const question = await SSTQuestion.findById(questionId);
        if (!question) return res.status(404).json({ message: "Question not found" });

        const words = summaryText.trim().split(/\s+/).filter(w => w.length > 0);
        const wordCount = words.length;

        /* ---------- SCORING LOGIC (PTE STANDARDS) ---------- */

        // A. FORM (Max 2)
        // 50-70 words = 2 points
        // 40-49 or 71-100 words = 1 point
        // <40 or >100 = 0 points
        let form = 0;
        if (wordCount >= 50 && wordCount <= 70) form = 2;
        else if ((wordCount >= 40 && wordCount < 50) || (wordCount > 70 && wordCount <= 100)) form = 1;
        else form = 0;

        // B. CONTENT (Max 2)
        // Checks how many keywords from the audio are in the summary
        let content = 0;
        const foundKeywords = question.keywords.filter(kw => 
            summaryText.toLowerCase().includes(kw.toLowerCase())
        );
        const keywordRatio = foundKeywords.length / question.keywords.length;

        if (keywordRatio >= 0.6) content = 2;
        else if (keywordRatio >= 0.3) content = 1;
        else content = 0;

        // C. GRAMMAR (Max 2)
        // Simplified check: Sentences start with Capital and end with Period
        const sentences = summaryText.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const correctSentences = sentences.filter(s => /^[A-Z]/.test(s.trim())).length;
        let grammar = (correctSentences / sentences.length >= 0.8) ? 2 : 1;

        // D. VOCABULARY (Max 2)
        // Lexical range - unique words check
        const uniqueWords = new Set(words.map(w => w.toLowerCase())).size;
        const vocabScore = (uniqueWords / wordCount > 0.6) ? 2 : 1;

        // E. SPELLING (Max 2)
        // Simulating spelling (In real prod, use a spell-check library)
        let spelling = 2; 
        if (summaryText.includes("  ")) spelling = 1; // Basic error check

        /* ---------- TOTALS ---------- */
        const totalScore = content + form + grammar + vocabScore + spelling;
        const overallScore = Math.round((totalScore / 10) * 90);

        const attempt = await SSTAttempt.create({
            questionId,
            userId,
            summaryText,
            wordCount,
            scores: {
                content,
                form,
                grammar,
                vocabulary: vocabScore,
                spelling
            },
            totalScore,
            overallScore,
            timeTaken
        });

        res.status(201).json({
            success: true,
            data: attempt
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};