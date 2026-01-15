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



// exports.addRetellQuestion = async (req, res) => {
//     try {
//         const { title, difficulty } = req.body;
//         const audioFile = req.file; // Provided by Multer

//         if (!audioFile) {
//             return res.status(400).json({ message: "Audio file is required" });
//         }

//         // 1. Upload Audio to Cloudinary
//         const uploadResult = await cloudinary.uploader.upload(audioFile.path, {
//             resource_type: "video", // Cloudinary treats audio as video resource type
//             folder: "retell_questions"
//         });

//         // 2. Convert Audio to Transcript using OpenAI Whisper
//         const transcription = await openai.audio.transcriptions.create({
//             file: fs.createReadStream(audioFile.path),
//             model: "whisper-1",
//         });

//         // 3. Save to Database
//         const newQuestion = new Question({
//             title,
//             difficulty,
//             audioUrl: uploadResult.secure_url,
//             transcript: transcription.text,
//             type: 'retell_lecture'
//         });

//         await newQuestion.save();

//         // 4. Clean up local temp file
//         fs.unlinkSync(audioFile.path);

//         res.status(201).json({
//             success: true,
//             message: "Question added successfully with AI transcript",
//             data: newQuestion
//         });

//     } catch (error) {
//         console.error("Error adding question:", error);
//         res.status(500).json({ success: false, message: error.message });
//     }
// };

export const addRetellQuestion = async (req, res) => {
  try {
     const { title, prepareTime, answerTime, difficulty } = req.body;

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

    await question.save();
    res.json(question);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



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
