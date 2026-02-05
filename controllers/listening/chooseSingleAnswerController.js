import fs from "fs";
import { createClient } from "@deepgram/sdk";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { cloudinary } from "../../config/cloudinary.js";
import { ChooseSingleAnswerAttempt, ChooseSingleAnswerQuestion } from "../../models/listening/ChooseSingleAnswer.js";
dotenv.config();
const deepgram = createClient(process.env.API_KEY);

// ---------- CREATE QUESTION ----------
export const addChooseSingleAnswerQuestion = async (req, res) => {
  try {
    const { title, difficulty, transcript } = req.body;
    let { options } = req.body;

    // 1. Check if file exists
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Audio is required" });
    }

    // 2. Parse options (Multer sends arrays/objects as strings)
    if (typeof options === "string") {
      try {
        options = JSON.parse(options);
      } catch (e) {
        return res.status(400).json({ success: false, message: "Invalid options format" });
      }
    }

    // 3. Validate options length and content
    if (!options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ success: false, message: "Provide at least 2 options" });
    }

    // 4. Validate that exactly one option is marked as correct
    const correctCount = options.filter(
      (o) => String(o.isCorrect) === "true"
    ).length;

    if (correctCount !== 1) {
      return res.status(400).json({ 
        success: false, 
        message: "Exactly one option must be marked as correct" 
      });
    }

    // 5. Upload audio to Cloudinary
    const audio = await cloudinary.uploader.upload(req.file.path, { 
      resource_type: "video" 
    });

    // 6. Transcribe audio (Manual or Deepgram)
    let finalTranscript = transcript;
    if (!finalTranscript) {
       // Fallback to Deepgram if not provided manually
       const audioBuffer = fs.readFileSync(req.file.path);
       const { result, error } = await deepgram.listen.prerecorded.transcribeFile(audioBuffer, {
        smart_format: true,
        model: "nova-2",
        language: "en-US"
      });
      if (!error) {
        finalTranscript = result.results.channels[0].alternatives[0].transcript;
      }
    }

    // 7. Save question to Database
    const question = await ChooseSingleAnswerQuestion.create({
      title: title || "Untitled Question",
      audioUrl: audio.secure_url,
      cloudinaryId: audio.public_id,
      transcript: finalTranscript,
      options: options.map(o => ({
        text: o.text,
        isCorrect: String(o.isCorrect) === "true" // Ensure it's a real boolean
      })),

      difficulty: difficulty || "Medium",
      isPredictive: req.body.isPredictive || false
    });

    // 8. IMPORTANT: Delete the temporary file from your local server
    if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
    }

    res.status(201).json({ success: true, question });

  } catch (error) {
    // Clean up local file even if there is an error
    if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
    }
    console.error("ADD CHOOSE SINGLE ANSWER QUESTION ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// ---------- GET USER ATTEMPTS ----------
 export const getChooseSingleAnswerWithAttempts = async (req, res) => {
  try {
    const { userId } = req.params;

    /* -------------------- 1. Validate userId -------------------- */
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Valid userId is required",
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    /* -------------------- 2. Aggregation Pipeline -------------------- */
    const questions = await ChooseSingleAnswerQuestion.aggregate([
      /* ================= GET ALL ATTEMPTS ================= */
      {
        $lookup: {
          from: ChooseSingleAnswerAttempt.collection.name,
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
    console.error("GET CHOOSE SINGLE ANSWER QUESTIONS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching questions"
    });
  }
};



export const getCommunityAttempts = async (req, res) => {
  try {
    const { questionId } = req.params;

    if (!questionId) {
      return res.status(400).json({
        success: false,
        message: "questionId is required",
      });
    }

    const data = await ChooseSingleAnswerAttempt.aggregate([
      // 1️⃣ Match question
      {
        $match: {
          questionId: new mongoose.Types.ObjectId(questionId),
        },
      },

      // 2️⃣ Latest attempts first
      {
        $sort: { createdAt: -1 },
      },

      // 3️⃣ Group by user
      {
        $group: {
          _id: "$userId",
          attempts: {
            $push: {
              _id: "$_id",
              selectedOptionIndex: "$selectedOptionIndex",
              isCorrect: "$isCorrect",
              timeTaken: "$timeTaken",
              createdAt: "$createdAt",
            },
          },
        },
      },

      // 4️⃣ Limit attempts per user
      {
        $project: {
          userId: "$_id",
          attempts: { $slice: ["$attempts", 15] },
          _id: 0,
        },
      },

      // 5️⃣ Populate user
      {
        $lookup: {
          from: "users", // ⚠️ collection name, NOT model name
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },

      // 6️⃣ Convert user array → object
      {
        $unwind: "$user",
      },

      // 7️⃣ Sort users by latest attempt
      {
        $sort: {
          "attempts.0.createdAt": -1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("COMMUNITY ATTEMPTS ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



// ---------- DELETE QUESTION ----------
export const deleteChooseSingleAnswerQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Validate ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid question id is required",
      });
    }

    // 2. Find question
    const question = await ChooseSingleAnswerQuestion.findById(id);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    // 3. Delete audio from Cloudinary
    if (question.cloudinaryId) {
      try {
        await cloudinary.uploader.destroy(question.cloudinaryId, {
          resource_type: "video",
        });
      } catch (cloudErr) {
        console.error("Cloudinary delete error:", cloudErr);
        // Not throwing error — DB delete should still happen
      }
    }

    // 4. Delete question from DB
    await ChooseSingleAnswerQuestion.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Choose Single Answer question deleted successfully",
    });

  } catch (error) {
    console.error("DELETE CHOOSE SINGLE ANSWER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.messag
    })
  }
}



export const updateChooseSingleAnswerQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await ChooseSingleAnswerQuestion.findById(id);
    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    const { title, difficulty, transcript } = req.body;
    let { options } = req.body;

    // ---------- 1. PARSE OPTIONS ----------
    // FormData sends arrays/objects as strings. We must parse it.
    if (options) {
      try {
        if (typeof options === "string") {
          options = JSON.parse(options);
        }
      } catch (e) {
        return res.status(400).json({ success: false, message: "Invalid options format" });
      }

      // Validate exactly one correct option
      // Note: We check for both boolean true and string "true"
      const correctCount = options.filter(
        (o) => o.isCorrect === true || o.isCorrect === "true"
      ).length;

      if (correctCount !== 1) {
        return res.status(400).json({
          success: false,
          message: "Exactly one option must be marked as correct",
        });
      }
      question.options = options;
    }

    // ---------- 2. AUDIO & TRANSCRIPTION UPDATE ----------
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

      // Upload new audio
      const uploaded = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "video",
      });

      question.audioUrl = uploaded.secure_url;
      question.cloudinaryId = uploaded.public_id;

      // Transcribe new audio using Deepgram - Only if manual transcript NOT provided
      if (!transcript) {
          try {
            const audioBuffer = fs.readFileSync(req.file.path);
            const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
              audioBuffer,
              {
                smart_format: true,
                model: "nova-2",
                language: "en-US",
              }
            );

            if (!error) {
                 question.transcript = result.results.channels[0].alternatives[0].transcript;
            }
          } catch (transcriptionError) {
            console.error("Transcription Failed:", transcriptionError);
            // We continue even if transcription fails, or you can throw error
          }
      }
      fs.unlinkSync(req.file.path);
    }

    // ---------- 3. FIELD UPDATES ----------
    if (title !== undefined) question.title = title;
    if (difficulty !== undefined) question.difficulty = difficulty;
    if (req.body.isPredictive !== undefined) question.isPredictive = req.body.isPredictive;
    if (transcript) question.transcript = transcript; // Always update if provided

    await question.save();

    res.status(200).json({
      success: true,
      question,
    });

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
    }
    console.error("UPDATE CHOOSE SINGLE ANSWER QUESTION ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const submitChooseSingleAnswerAttempt = async (req, res) => {
  try {

    const { questionId, userId, selectedOptionIndex, timeTaken } = req.body;

console.log("Received attempt data:", req.body);
    /* -------------------- 1. Basic Validation -------------------- */
    if (!questionId || !userId || selectedOptionIndex === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    /* -------------------- 2. Fetch Question -------------------- */
    const question = await ChooseSingleAnswerQuestion.findById(questionId);

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
    const attempt = await ChooseSingleAnswerAttempt.create({
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
    console.error("Single Answer Attempt Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while submitting attempt"
    });
  }
};