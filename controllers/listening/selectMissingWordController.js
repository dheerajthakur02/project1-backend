import fs from "fs";
import { createClient } from "@deepgram/sdk";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { cloudinary } from "../../config/cloudinary.js";
import { SelectMissingWordAttempt, SelectMissingWordQuestion } from "../../models/listening/SelectMissingWord.js";
dotenv.config();
const deepgram = createClient(process.env.API_KEY);

// ---------- CREATE QUESTION ----------
export const addSelectMissingWordQuestion = async (req, res) => {
  try {
    const { title, difficulty } = req.body;
    let { options } = req.body;

    // 1. Check for audio
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Audio is required" });
    }

    // 2. PARSE OPTIONS (FormData sends this as a string)
    if (typeof options === "string") {
      try {
        options = JSON.parse(options);
      } catch (e) {
        return res.status(400).json({ success: false, message: "Invalid options format" });
      }
    }

    // 3. Validation
    if (!options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ success: false, message: "Provide at least 2 options" });
    }

    // Check if exactly one is correct (Handle both boolean true and string "true")
    const correctCount = options.filter(o => String(o.isCorrect) === "true").length;
    if (correctCount !== 1) {
      return res.status(400).json({ success: false, message: "Exactly one option must be marked as correct" });
    }

    // 4. Upload audio
    const audio = await cloudinary.uploader.upload(req.file.path, { resource_type: "video" });

    // 5. Transcribe
    let finalTranscript = req.body.transcript;
    if (!finalTranscript) {
      const audioBuffer = fs.readFileSync(req.file.path);
      const { result, error } = await deepgram.listen.prerecorded.transcribeFile(audioBuffer, {
        smart_format: true,
        model: "nova-2",
        language: "en-US"
      });
      if (error) throw error;
      finalTranscript = result.results.channels[0].alternatives[0].transcript;
    }

    // 6. Save question
    const question = await SelectMissingWordQuestion.create({
      title,
      audioUrl: audio.secure_url,
      cloudinaryId: audio.public_id,
      transcript: finalTranscript,
      options: options.map(o => ({
        text: o.text,
        isCorrect: String(o.isCorrect) === "true"
      })),

      difficulty: difficulty || "Medium",
      isPredictive: req.body.isPredictive || false
    });

    // Clean up local temp file
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    res.status(201).json({ success: true, question });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error("ADD SMW ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------- GET USER ATTEMPTS ----------
 export const getSelectMissingWordWithAttempts = async (req, res) => {
  try {
    const { userId } = req.params;

    /* -------------------- 1. Check if userId provided -------------------- */
    if (!userId) {
      const questions = await SelectMissingWordQuestion.find().sort({ createdAt: -1 });
      return res.status(200).json({
        success: true,
        data: questions
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Valid userId is required",
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    /* -------------------- 2. Aggregation Pipeline -------------------- */
    const questions = await SelectMissingWordQuestion.aggregate([
      /* ================= GET ALL ATTEMPTS ================= */
      {
        $lookup: {
          from: SelectMissingWordAttempt.collection.name,
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
            { $sort: { createdAt: -1 } }
          ],
          as: "allAttempts"
        }
      },

      /* ================= GET LAST 10 ATTEMPTS ================= */
      {
        $addFields: {
          lastAttempts: { $slice: ["$allAttempts", 10] },
          attemptCount: { $size: "$allAttempts" },
          isAttempted: { $gt: [{ $size: "$allAttempts" }, 0] }
        }
      },

      /* ================= CLEAN RESPONSE ================= */
      {
        $project: {
          "allAttempts.__v": 0,
          "lastAttempts.__v": 0
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      data: questions
    });

  } catch (error) {
    console.error("GET SELECT MISSING WORD QUESTIONS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching questions"
    });
  }
};


export const getSelectMissingWordCommunityAttempts = async (req, res) => {
  try {
    const {questionId} = req.params;
    const attempts = await SelectMissingWordAttempt.aggregate([
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
          from: SelectMissingWordQuestion.collection.name,
          localField: "questionId",
          foreignField: "_id",
          as: "question"
        }
      },
      { $unwind: "$question" },

      {
        $project: {
          score: 1,
          maxScore: 1,
          selectedWord: 1,
          createdAt: 1,
          "user.name": 1,
          "question.title": 1
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



export const updateSelectMissingWordQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, difficulty } = req.body;
    let { options } = req.body;

    const question = await SelectMissingWordQuestion.findById(id);
    if (!question) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    // 1. PARSE OPTIONS IF PROVIDED
    if (options && typeof options === "string") {
      try {
        options = JSON.parse(options);
      } catch (e) {
        return res.status(400).json({ success: false, message: "Invalid options format" });
      }
    }

    // 2. AUDIO UPDATE
    let finalTranscript = req.body.transcript;

    if (req.file) {
      if (question.cloudinaryId) {
        await cloudinary.uploader.destroy(question.cloudinaryId, { resource_type: "video" });
      }
      const uploaded = await cloudinary.uploader.upload(req.file.path, { resource_type: "video" });
      question.audioUrl = uploaded.secure_url;
      question.cloudinaryId = uploaded.public_id;

      // Only auto-transcribe if no manual transcript provided
      if (!finalTranscript) {
        const audioBuffer = fs.readFileSync(req.file.path);
        const { result } = await deepgram.listen.prerecorded.transcribeFile(audioBuffer, {
          smart_format: true,
          model: "nova-2",
          language: "en-US"
        });
        finalTranscript = result.results.channels[0].alternatives[0].transcript;
      }
      
      fs.unlinkSync(req.file.path); // cleanup
    }
    
    // Update transcript used (either manual or auto-generated)
    if (finalTranscript !== undefined) question.transcript = finalTranscript;

    // 3. FIELD UPDATES
    if (title !== undefined) question.title = title;
    if (difficulty !== undefined) question.difficulty = difficulty;
    if (req.body.isPredictive !== undefined) question.isPredictive = req.body.isPredictive;

    // 4. OPTIONS UPDATE VALIDATION
    if (options) {
      const correctCount = options.filter(o => String(o.isCorrect) === "true").length;
      if (correctCount !== 1) {
        return res.status(400).json({ success: false, message: "Exactly one option must be marked as correct" });
      }
      question.options = options.map(o => ({
        text: o.text,
        isCorrect: String(o.isCorrect) === "true"
      }));
    }

    await question.save();
    res.status(200).json({ success: true, question });

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error("UPDATE SMW ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
export const deleteQuestion = async (req, res) => {
  try {
    const question = await SelectMissingWordQuestion.findById(req.params.id);
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

export const submitSelectMissingWordAttempt = async (req, res) => {
  try {

    const { questionId, userId, selectedOptionIndex, timeTaken } = req.body;



    /* -------------------- 1. Basic Validation -------------------- */
    if (!questionId || !userId || selectedOptionIndex === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    /* -------------------- 2. Fetch Question -------------------- */
    const question = await SelectMissingWordQuestion.findById(questionId);
   
    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found"
      });
    }

    /* -------------------- 3. Validate Index -------------------- */
    const options = question.options;

    if (
      !Array.isArray(options) ||
      selectedOptionIndex < 0 ||
      selectedOptionIndex >= options.length
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid option selection"
      });
    }

    /* -------------------- 4. Check Correctness -------------------- */
    const userSelectedChoice = options[selectedOptionIndex];
    const isCorrect = userSelectedChoice.isCorrect === true;

    const correctIndex = options.findIndex(o => o.isCorrect === true);

    if (correctIndex === -1) {
      return res.status(500).json({
        success: false,
        message: "Question configuration error: no correct option found"
      });
    }

    const correctChoice = options[correctIndex];
    /* -------------------- 5. Scoring System -------------------- */
    const score = isCorrect ? 1 : 0;
    const readingScore = isCorrect ? 0.5 : 0;
    const listeningScore = isCorrect ? 0.5 : 0;

    /* -------------------- 6. Save Attempt -------------------- */
    const attempt = await SelectMissingWordAttempt.create({
      questionId,
      userId,
      selectedOptionIndex,
      isCorrect,
      timeTaken: timeTaken || null
    });

    /* -------------------- 7. Label Generator -------------------- */
    const indexToLabel = (idx) => String.fromCharCode(65 + idx);

    /* -------------------- 8. Response for Result Modal -------------------- */
    return res.status(201).json({
      success: true,
      data: {
        attemptId: attempt._id,
        questionId: question.title || question._id,
        score,
        readingScore,
        listeningScore,
        myAnswer: indexToLabel(selectedOptionIndex),
        myAnswerText: userSelectedChoice.text,
        correctAnswer: indexToLabel(correctIndex),
        correctAnswerText: correctChoice.text,
        isCorrect
      }
    });

  } catch (error) {
    console.error("Select Missing Word Attempt Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while submitting attempt"
    });
  }
};