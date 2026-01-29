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

export const deleteQuestion = async (req, res) => {
  try {
    const question = await SSTQuestion.findById(req.params.id);
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





// export const submitSSTAttempt = async (req, res) => {
//   try {
//     const { questionId, summaryText, timeTaken, userId } = req.body;

//     console.log("Received SST Attempt:", { questionId, summaryText, timeTaken, userId });
//     const question = await SSTQuestion.findById(questionId);
//     if (!question) {
//       return res.status(404).json({ success: false, message: "Question not found" });
//     }

//     /* ---------------- WORD COUNT ---------------- */
//     const words = summaryText.trim().split(/\s+/).filter(Boolean);
//     const wordCount = words.length;

//     /* ---------------- FORM (2) ---------------- */
//     let form = wordCount >= 5 && wordCount <= 50 ? 2 : 0;

//     /* ---------------- CONTENT (4) ---------------- */
//     const answerWords = question.answer
//       .toLowerCase()
//       .replace(/[^a-z\s]/g, "")
//       .split(/\s+/)
//       .filter(w => w.length > 3);

//     const uniqueAnswerWords = [...new Set(answerWords)];

//     const matchedWords = uniqueAnswerWords.filter(word =>
//       summaryText.toLowerCase().includes(word)
//     );

//     const matchRatio = matchedWords.length / uniqueAnswerWords.length;

//     let content = 0;
//     if (matchRatio >= 0.6) content = 4;
//     else if (matchRatio >= 0.4) content = 3;
//     else if (matchRatio >= 0.25) content = 2;
//     else if (matchRatio >= 0.1) content = 1;

//     /* ---------------- GRAMMAR (2) ---------------- */
//     const sentences = summaryText
//       .split(/[.!?]/)
//       .map(s => s.trim())
//       .filter(Boolean);

//     const correctSentences = sentences.filter(
//       s => /^[A-Z]/.test(s)
//     ).length;

//     const grammar =
//       sentences.length > 0 && correctSentences / sentences.length >= 0.8 ? 2 : 1;

//     /* ---------------- VOCABULARY (2) ---------------- */
//     const uniqueWords = new Set(words.map(w => w.toLowerCase())).size;
//     const vocabRatio = uniqueWords / wordCount;
//     const vocabulary = vocabRatio >= 0.6 ? 2 : 1;

//     /* ---------------- SPELLING (2) ---------------- */
//     let spelling = 2;
//     if (summaryText.includes("  ")) spelling = 1;

//     /* ---------------- TOTAL (12) ---------------- */
//     const totalScore = content + form + grammar + vocabulary + spelling;

//     const attempt = await SSTAttempt.create({
//       questionId,
//       userId,
//       summaryText,
//       wordCount,
//       scores: {
//         content,
//         form,
//         grammar,
//         vocabulary,
//         spelling,
//       },
//       totalScore,
//       timeTaken,
//     });

//     res.status(201).json({
//       success: true,
//       data: {
//         attemptId: attempt._id,
//         totalScore,
//         scores: attempt.scores,
//         matchedKeywords: matchedWords.slice(0, 10),
//         wordCount,
//       },
//     });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

export const submitSSTAttempt = async (req, res) => {
  try {
    
    const { questionId, summaryText, timeTaken, userId } = req.body;

    const question = await SSTQuestion.findById(questionId);
    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    // 1. Clean Text Helper
    const clean = (text) => text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
    const words = summaryText.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    /* ---------------- FORM (Max 2) ---------------- */
    // PTE Standard: 50-70 words is ideal. 
    // We will allow 40-75 for full marks to be lenient, or strict 50-70.
    let form = 0;
    if (wordCount >= 50 && wordCount <= 70) form = 2;
    else if ((wordCount >= 40 && wordCount < 50) || (wordCount > 70 && wordCount <= 100)) form = 1;
    else form = 0;

    /* ---------------- CONTENT (Max 4) ---------------- */
    const targetClean = clean(question.answer);
    const userClean = clean(summaryText);
    
    const targetWords = [...new Set(targetClean.split(/\s+/).filter(w => w.length > 3))];
    const matchedWords = targetWords.filter(word => userClean.includes(word));

    const matchRatio = matchedWords.length / targetWords.length;

    let content = 0;
    if (matchRatio >= 0.8) content = 4; // Perfect match
    else if (matchRatio >= 0.6) content = 3;
    else if (matchRatio >= 0.4) content = 2;
    else if (matchRatio >= 0.2) content = 1;

    /* ---------------- GRAMMAR (Max 2) ---------------- */
    // Check if it starts with capital and ends with period
    const hasCapitalStart = /^[A-Z]/.test(summaryText.trim());
    const hasPeriodEnd = /[.!?]$/.test(summaryText.trim());
    
    let grammar = 0;
    if (hasCapitalStart && hasPeriodEnd) grammar = 2;
    else if (hasCapitalStart || hasPeriodEnd) grammar = 1;

    /* ---------------- VOCABULARY (Max 2) ---------------- */
    const uniqueWords = new Set(words.map(w => w.toLowerCase())).size;
    const vocabRatio = uniqueWords / wordCount;
    let vocabulary = vocabRatio >= 0.55 ? 2 : 1;

    /* ---------------- SPELLING (Max 2) ---------------- */
    // Simple check: double spaces or no spaces after periods usually mean bad spelling/formatting
    let spelling = 2;
    if (summaryText.includes("  ") || /[a-z][.][a-z]/.test(summaryText)) spelling = 1;

    /* ---------------- TOTALS ---------------- */
    const totalScore = content + form + grammar + vocabulary + spelling; // Max 12
    
    // Calculate Listening/Writing scores for UI (Based on 10 or 90 scale)
    // Here we scale to 10 for your UI
    const scoreOutOf10 = Number(((totalScore / 12) * 10).toFixed(1));
    const writingScore = Number((scoreOutOf10 / 2).toFixed(1));
    const listeningScore = Number((scoreOutOf10 / 2).toFixed(1));

    const attempt = await SSTAttempt.create({
      questionId,
      userId,
      summaryText,
      wordCount,
      scores: { content, form, grammar, vocabulary, spelling },
      totalScore: scoreOutOf10, 
      timeTaken,
    });

    res.status(201).json({
      success: true,
      data: {
        ...attempt._doc,
        totalScore: scoreOutOf10, // Matching frontend key
        writingScore,
        readingScore: listeningScore, // In SST, listening is the primary skill
        misSpelled: 0, 
        structureErrors: grammar < 2 ? 1 : 0,
        styleIssues: vocabulary < 2 ? 1 : 0
      },
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};
