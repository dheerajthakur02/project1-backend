import { WriteFromDictationQuestion, WriteFromDictationAttempt } from "../../models/listening/WriteFromDictation.js";
import mongoose from "mongoose";
import fs from 'fs';
import { createClient } from "@deepgram/sdk";
import dotenv from "dotenv";
import { cloudinary } from "../../config/cloudinary.js";
dotenv.config();
const deepgram = createClient(process.env.API_KEY);

// Create Question (Admin)
export const createQuestion = async (req, res) => {
  try {
    const { title, difficulty, transcript: manualTranscript } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Audio file is required" });
    }

    // 1. Upload to Cloudinary
    const audio = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "video"
    });

    // 2. Transcribe (Auto or Manual)
    let transcript = manualTranscript;
    if (!transcript) {
        const audioBuffer = fs.readFileSync(req.file.path);
        const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
            audioBuffer,
            {
                smart_format: true,
                model: "nova-2",
                language: "en-US",
                punctuate: true
            }
        );
        if (error) throw error;
        transcript = result.results.channels[0].alternatives[0].transcript;
    }

    const question = await WriteFromDictationQuestion.create({
      title,
      audioUrl: audio.secure_url,
      transcript,
      cloudinaryId: audio.public_id,
      difficulty: difficulty || "Medium",
      isPredictive: req.body.isPredictive || false
    });

    res.status(201).json({ success: true, question });

  } catch (error) {
    console.error("CREATE WFD QUESTION ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get All Questions (User/Admin)
export const getQuestions = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) {
             const questions = await WriteFromDictationQuestion.find().sort({ createdAt: -1 });
             return res.status(200).json({ success: true, data: questions });
        }
        const userObjectId = new mongoose.Types.ObjectId(userId);

        const questions = await WriteFromDictationQuestion.aggregate([
             // 1. Count attempts
             {
                $lookup: {
                    from: "writefromdictationattempts",
                    let: { qId: "$_id" },
                    pipeline: [
                         { $match: { $expr: { $and: [{ $eq: ["$questionId", "$$qId"] }, { $eq: ["$userId", userObjectId] }] } } },
                         { $count: "count" }
                    ],
                    as: "attemptCountArr"
                }
             },
             // 2. Get Last Attempts
             {
                $lookup: {
                    from: "writefromdictationattempts",
                    let: { qId: "$_id" },
                    pipeline: [
                        { $match: { $expr: { $and: [{ $eq: ["$questionId", "$$qId"] }, { $eq: ["$userId", userObjectId] }] } } },
                        { $sort: { createdAt: -1 } },
                        { $limit: 10 },
                        {
                            $project: {
                                totalScore: 1,
                                scores: 1,
                                studentTranscript: 1,
                                wordAnalysis: 1,
                                createdAt: 1,
                                timeTaken: 1
                            }
                        }
                    ],
                    as: "lastAttempts"
                }
             },
             // 3. Add Attempt Status
             {
                $addFields: {
                    attemptCount: { $ifNull: [{ $arrayElemAt: ["$attemptCountArr.count", 0] }, 0] },
                    isAttempted: { $gt: [{ $ifNull: [{ $arrayElemAt: ["$attemptCountArr.count", 0] }, 0] }, 0] }
                }
             },
             { $project: { attemptCountArr: 0 } }
        ]);

        res.status(200).json({ success: true, data: questions });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getWriteFromDictationCommunityAttempts = async (req, res) => {
  try {

    const {questionId} = req.params;
    const attempts = await WriteFromDictationAttempt.aggregate([
       {
                    $match: {
                      questionId: new mongoose.Types.ObjectId(questionId),
                    },
                  },
            
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$userId", attempts: { $push: "$$ROOT" } } },
      { $project: { attempts: { $slice: ["$attempts", 15] } } },
      { $unwind: "$attempts" },
      { $replaceRoot: { newRoot: "$attempts" } },

      { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },

      {
        $lookup: {
          from: WriteFromDictationQuestion.collection.name,
          localField: "questionId",
          foreignField: "_id",
          as: "question"
        }
      },
      { $unwind: "$question" },

      {
        $project: {
          totalScore: 1,
          scores: 1,
          studentTranscript: 1,
          createdAt: 1,
          "user.name": 1,
          "question.audioUrl": 1
        }
      },
       {
        $sort: {
          "attempts.0.createdAt": -1,
        },
      },
    ]);

    res.status(200).json({ success: true, data: attempts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


export const deleteQuestion = async (req, res) => {
  try {
    const question = await WriteFromDictationQuestion.findById(req.params.id);
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

// Submit Attempt (Scoring Logic)
export const submitAttempt = async (req, res) => {
    try {
        const { questionId, studentTranscript, timeTaken, userId } = req.body;

        const question = await WriteFromDictationQuestion.findById(questionId);
        if (!question) return res.status(404).json({ success: false, message: "Question not found" });

        // Normalization Helper
        const clean = (text) => text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
        
        const originalWords = clean(question.transcript).split(/\s+/).filter(Boolean);
        const studentWords = clean(studentTranscript).split(/\s+/).filter(Boolean);

        // Scoring: 1 point per correct word
        let matchCount = 0;
        const usedIndices = new Set();
        const wordAnalysis = [];

        // Identify Correct Words (Simple Matching, Order Independent per PTE strictness variation, but generally content words matter more)
        // We will do a frequency match to allow for "out of order" but correct words.
        
        // However, to generate the UI "Red/Green" sequence, we often need a diff. 
        // For accurate scoring:
        
        const studentAnalysis = studentWords.map(sw => ({ word: sw, status: 'extra' }));
        const originalAnalysis = originalWords.map(ow => ({ word: ow, matched: false }));

        for (let i = 0; i < studentAnalysis.length; i++) {
            const sw = studentAnalysis[i].word;
            // Find first available match in original
            const matchIndex = originalAnalysis.findIndex((ow, idx) => ow.word === sw && !ow.matched);
            
            if (matchIndex !== -1) {
                studentAnalysis[i].status = 'correct';
                originalAnalysis[matchIndex].matched = true;
                matchCount++;
            }
        }

        // Prepare Analysis for Storage
        // We want to store what the user wrote and mark it correct/extra.
        // AND we want to know what was missing.
        
        // Actually the model schema assumes a list of words. Let's store the user's words with status.
        // The UI might need "Missing Words" list separately. 
        // But for our schema 'wordAnalysis', let's store the student's perspective + Missing entries appended or handled by UI?
        // Let's stick to storing the Students stream with status.
        
        const analysisResult = studentAnalysis.map(sa => ({
            word: sa.word,
            status: sa.status
        }));
        
        // Append missing words for data completeness (optional, but good for UI)
        originalAnalysis.forEach(ow => {
            if (!ow.matched) {
                analysisResult.push({ word: ow.word, status: 'missing' });
            }
        });

        const totalPossible = originalWords.length;
        
        // Raw Score calculation
        const rawScore = matchCount; 
        
        // Scale to 10
        let scaledScore = 0;
        if (totalPossible > 0) {
            scaledScore = (rawScore / totalPossible) * 10;
        }
        scaledScore = parseFloat(scaledScore.toFixed(1));

        // Attempting to match the user's screenshot breakdown
        // Split 50/50 for Listening and Writing (approximate logic since PTE uses integrated scoring)
        const listeningScore = parseFloat((scaledScore / 2).toFixed(2));
        const writingScore = parseFloat((scaledScore / 2).toFixed(2));

        const attempt = await WriteFromDictationAttempt.create({
            questionId,
            userId,
            studentTranscript,
            wordAnalysis: analysisResult,
            scores: {
                listening: listeningScore,
                writing: writingScore
            },
            totalScore: scaledScore,
            timeTaken
        });

        res.status(201).json({
            success: true,
            data: attempt
        });

    } catch (error) {
        console.error("SUBMIT WFD ATTEMPT ERROR:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getAttempts = async (req, res) => {
    try {
        const { questionId } = req.params;
        const attempts = await WriteFromDictationAttempt.find({ questionId }).sort({ createdAt: -1 }).populate('userId', 'name');
        res.status(200).json({ success: true, data: attempts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


export const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, difficulty, transcript: manualTranscript } = req.body;
 

    const question = await WriteFromDictationQuestion.findById(id);
    if (!question) {
      if (req.file) fs.unlinkSync(req.file.path); // Cleanup if file was sent
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    // ---------- 1. HANDLE AUDIO UPDATE ----------
    if (req.file) {
      // Delete old audio from Cloudinary
      if (question.cloudinaryId) {
        try {
          await cloudinary.uploader.destroy(question.cloudinaryId, {
            resource_type: "video",
          });
        } catch (err) {
          console.error("Cloudinary Delete Error:", err);
        }
      }

      // Upload new audio to Cloudinary
      const uploaded = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "video",
        folder: "wfd_audio",
      });

      question.audioUrl = uploaded.secure_url;
      question.cloudinaryId = uploaded.public_id;

      // Auto-transcribe new audio ONLY IF no manual transcript is provided in the request
      if (!manualTranscript) {
        try {
          const audioBuffer = fs.readFileSync(req.file.path);
          const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
            audioBuffer,
            {
              smart_format: true,
              model: "nova-2",
              language: "en-US",
              punctuate: true
            }
          );
          if (!error) {
            question.transcript = result.results.channels[0].alternatives[0].transcript;
          }
        } catch (transError) {
          console.error("Deepgram transcription failed during update:", transError);
        }
      }

      // Delete the temporary local file
      fs.unlinkSync(req.file.path);
    }

    // ---------- 2. UPDATE TEXT FIELDS ----------
    if (title !== undefined) question.title = title;
    if (difficulty !== undefined) question.difficulty = difficulty;
    if (req.body.isPredictive !== undefined) question.isPredictive = req.body.isPredictive;
    
    // If user provided a manual transcript, it overrides everything
    if (manualTranscript !== undefined) {
        question.transcript = manualTranscript;
    }

    // Save changes
    const updatedQuestion = await question.save();

    res.status(200).json({
      success: true,
      message: "Question updated successfully",
      data: updatedQuestion,
    });

  } catch (error) {
    // Cleanup local file in case of crash
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error("UPDATE WFD QUESTION ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};