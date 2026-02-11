import fs from "fs";
import { createClient } from "@deepgram/sdk";
import { HighlightSummaryQuestion, HighlightSummaryAttempt } from "../../models/listening/HCSQuestion.js";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { cloudinary } from "../../config/cloudinary.js";
dotenv.config();
const deepgram = createClient(process.env.API_KEY);
// ---------- CREATE QUESTION ----------


// ---------- CREATE QUESTION ----------
export const addHighlightSummaryQuestion = async (req, res) => {
  try {
    let { summaries, difficulty, title, transcript } = req.body;

    // 1. Check for Audio
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Audio is required" });
    }

    // 2. Parse Summaries (FormData sends arrays as JSON strings)
    if (typeof summaries === "string") {
      try {
        summaries = JSON.parse(summaries);
      } catch (e) {
        return res.status(400).json({ success: false, message: "Invalid summaries format" });
      }
    }

    // 3. Validation
    if (!summaries || summaries.length < 3) {
      if (req.file) fs.unlinkSync(req.file.path); // Cleanup temp file
      return res.status(400).json({ success: false, message: "Provide exactly 3 summaries" });
    }

    const hasCorrect = summaries.some(s => String(s.isCorrect) === "true");
    if (!hasCorrect) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: "One summary must be marked as correct" });
    }

    // 4. Upload to Cloudinary
    const audio = await cloudinary.uploader.upload(req.file.path, { resource_type: "video" });

    // 5. Transcribe (Manual or Deepgram)
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

    // 6. Save to DB
    const question = await HighlightSummaryQuestion.create({
      title: title || "Untitled Question",
      audioUrl: audio.secure_url,
      cloudinaryId: audio.public_id,
      transcript: finalTranscript,
      summaries: summaries.map(s => ({
        text: s.text,
        isCorrect: String(s.isCorrect) === "true" // Handle string booleans from FormData
      })),

      difficulty: difficulty || "Medium",
      isPredictive: req.body.isPredictive || false,
    });

    // 7. Cleanup temp local file
    fs.unlinkSync(req.file.path);

    res.status(201).json({ success: true, question });
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    console.error("ADD HIGHLIGHT SUMMARY QUESTION ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------- UPDATE QUESTION ----------
export const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    let { title, difficulty, summaries, transcript } = req.body;

    const question = await HighlightSummaryQuestion.findById(id);
    if (!question) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    // 1. Parse Summaries if provided
    if (summaries && typeof summaries === "string") {
      try {
        summaries = JSON.parse(summaries);
      } catch (e) {
        return res.status(400).json({ success: false, message: "Invalid summaries format" });
      }
    }

    // 2. Audio Update Logic
    if (req.file) {
      // Destroy old audio
      if (question.cloudinaryId) {
        await cloudinary.uploader.destroy(question.cloudinaryId, { resource_type: "video" });
      }

      // Upload new
      const uploaded = await cloudinary.uploader.upload(req.file.path, { resource_type: "video" });
      question.audioUrl = uploaded.secure_url;
      question.cloudinaryId = uploaded.public_id;

      // Update Transcript - Only if manual transcript NOT provided
      if (!transcript) {
          const audioBuffer = fs.readFileSync(req.file.path);
          const { result, error } = await deepgram.listen.prerecorded.transcribeFile(audioBuffer, {
            smart_format: true,
            model: "nova-2",
            language: "en-US"
          });
          if (!error) {
            question.transcript = result.results.channels[0].alternatives[0].transcript;
          }
      }
      fs.unlinkSync(req.file.path);
    }

    // 3. Update Text Fields
    if (title) question.title = title;
    if (difficulty) question.difficulty = difficulty;
    if (transcript) question.transcript = transcript;
    if (req.body.isPredictive !== undefined) question.isPredictive = req.body.isPredictive; // Always update if provided

    // 4. Update Summaries
    if (summaries) {
      const correctCount = summaries.filter(s => String(s.isCorrect) === "true").length;
      if (correctCount !== 1) {
        return res.status(400).json({ success: false, message: "Exactly one summary must be correct" });
      }
      question.summaries = summaries.map(s => ({
        text: s.text,
        isCorrect: String(s.isCorrect) === "true"
      }));
    }

    await question.save();
    res.status(200).json({ success: true, question });

  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    console.error("UPDATE ERROR:", error);
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

    /* -------------------- 1. Validate userId -------------------- */
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Valid userId is required",
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    /* -------------------- 2. Aggregation Pipeline -------------------- */
    const questions = await HighlightSummaryQuestion.aggregate([
      /* ================= GET ALL ATTEMPTS ================= */
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
    console.error("GET HIGHLIGHT SUMMARY QUESTIONS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching questions"
    });
  }
};

export const getHighlightSummaryCommunityAttempts = async (req, res) => {
  try {
    const {questionId} = req.params;
    const attempts = await HighlightSummaryAttempt.aggregate([
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
          from: HighlightSummaryQuestion.collection.name,
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
          summaryText: 1,
          createdAt: 1,
          timeTaken: 1,
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


export const deleteQuestion = async (req, res) => {
  try {
    const question = await HighlightSummaryQuestion.findById(req.params.id);
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





export const submitHCSAttempt = async (req, res) => {
  try {
    const { questionId, userId, selectedSummaryIndex,timeTaken } = req.body;


    /* -------------------- 1. Basic Validation -------------------- */
    if (!questionId || !userId || selectedSummaryIndex === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    /* -------------------- 2. Fetch Question -------------------- */
    const question = await HighlightSummaryQuestion.findById(questionId);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found"
      });
    }

    /* -------------------- 3. Validate Index -------------------- */
    const summaries = question.summaries;

    if (
      !Array.isArray(summaries) ||
      selectedSummaryIndex < 0 ||
      selectedSummaryIndex >= summaries.length
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid summary selection"
      });
    }

    /* -------------------- 4. Check Correctness -------------------- */
    const userSelectedChoice = summaries[selectedSummaryIndex];
    const isCorrect = userSelectedChoice.isCorrect === true;

    const correctIndex = summaries.findIndex(s => s.isCorrect === true);

    if (correctIndex === -1) {
      return res.status(500).json({
        success: false,
        message: "Question configuration error: no correct summary found"
      });
    }

    const correctChoice = summaries[correctIndex];

    /* -------------------- 5. Scoring System -------------------- */
    const score = isCorrect ? 1 : 0;
    const readingScore = isCorrect ? 0.5 : 0;
    const listeningScore = isCorrect ? 0.5 : 0;

    /* -------------------- 6. Save Attempt -------------------- */
    const attempt = await HighlightSummaryAttempt.create({
      questionId,
      userId,
      selectedSummaryIndex,
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
        myAnswer: indexToLabel(selectedSummaryIndex),
        myAnswerText: userSelectedChoice.text,
        correctAnswer: indexToLabel(correctIndex),
        correctAnswerText: correctChoice.text,
        isCorrect
      }
    });

  } catch (error) {
    console.error("HCS Attempt Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while submitting attempt"
    });
  }
};
