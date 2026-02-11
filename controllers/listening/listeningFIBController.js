import { ListeningFIBQuestion, ListeningFIBAttempt } from "../../models/listening/ListeningFIBQuestion.js";
import mongoose from "mongoose";
import { cloudinary } from "../../config/cloudinary.js";
import fs from "fs";

// ---------- CREATE QUESTION ----------
export const addListeningFIBQuestion = async (req, res) => {
  try {
    const { title, transcript, correctAnswers, difficulty, isPredictive= false } = req.body;
    const parsedIsPredictive =
  isPredictive === "true" ? true :
  isPredictive === "false" ? false :
  false;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Audio is required" });
    }

    // correctAnswers might come as stringified JSON if sent via FormData
    let parsedCorrectAnswers = correctAnswers;
    if (typeof correctAnswers === "string") {
      parsedCorrectAnswers = JSON.parse(correctAnswers);
    }

    // Upload audio
    const audio = await cloudinary.uploader.upload(req.file.path, { resource_type: "video" });

    const question = await ListeningFIBQuestion.create({
      title,
      audioUrl: audio.secure_url,
      cloudinaryId: audio.public_id,
      transcript,
      correctAnswers: parsedCorrectAnswers,

      difficulty: difficulty || "Medium",
      isPredictive: parsedIsPredictive 
    });

    res.status(201).json({ success: true, question });
  } catch (error) {
    console.error("ADD LISTENING FIB QUESTION ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
// ---------- GET QUESTIONS (WITH ATTEMPTS) ----------
export const getListeningFIBQuestionsWithAttempts = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // If no userId, return all questions without attempt stats
    if (!userId) {
       const questions = await ListeningFIBQuestion.find().sort({ createdAt: -1 });
       return res.status(200).json({ success: true, data: questions });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const questions = await ListeningFIBQuestion.aggregate([
      /* ================= TOTAL ATTEMPTS ================= */
      {
        $lookup: {
          from: ListeningFIBAttempt.collection.name,
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

      /* ================= LAST 10 ATTEMPTS ================= */
      {
        $lookup: {
          from: ListeningFIBAttempt.collection.name,
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
                userAnswers: 1,
                score: 1,
                maxScore: 1,
                timeTaken: 1,
                createdAt: 1
              }
            }
          ],
          as: "lastAttempts"
        }
      },

      /* ================= FIELDS ================= */
      {
        $addFields: {
          attemptCount: { $ifNull: [{ $arrayElemAt: ["$attemptCountArr.count", 0] }, 0] },
          isAttempted: {
            $gt: [{ $ifNull: [{ $arrayElemAt: ["$attemptCountArr.count", 0] }, 0] }, 0]
          }
        }
      },
      { $project: { attemptCountArr: 0 } }
    ]);

    res.status(200).json({ success: true, data: questions });
  } catch (error) {
    console.error("GET LISTENING FIB QUESTIONS ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
// Community attempts for Listening FIB (max 15 latest per user)
export const getListeningFIBCommunityAttempts = async (req, res) => {
  try {
    const { questionId }= req.params
     const attempts = await ListeningFIBAttempt.aggregate([
        {
                    $match: {
                      questionId: new mongoose.Types.ObjectId(questionId),
                    },
                  },
            
      /* 1️⃣ Latest first */
      { $sort: { createdAt: -1 } },

      /* 2️⃣ Group by user */
      {
        $group: {
          _id: "$userId",
          attempts: { $push: "$$ROOT" }
        }
      },

      /* 3️⃣ Limit to 15 per user */
      {
        $project: {
          attempts: { $slice: ["$attempts", 15] }
        }
      },

      /* 4️⃣ Flatten */
      { $unwind: "$attempts" },
      { $replaceRoot: { newRoot: "$attempts" } },

      /* 5️⃣ Populate user */
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },

      /* 6️⃣ Populate question */
      {
        $lookup: {
          from: ListeningFIBQuestion.collection.name,
          localField: "questionId",
          foreignField: "_id",
          as: "question"
        }
      },
      { $unwind: "$question" },

      /* 7️⃣ Final shape */
      {
        $project: {
          _id: 1,
          userId: 1,
          questionId: 1,
          userAnswers: 1,
          score: 1,
          maxScore: 1,
          timeTaken: 1,
          createdAt: 1,

          "user.name": 1,
          "user.avatar": 1,

          "question.title": 1,
          "question.audioUrl": 1
        }
      },
       {
        $sort: {
          "attempts.0.createdAt": -1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      count: attempts.length,
      data: attempts
    });
  } catch (error) {
    console.error("GET LISTENING FIB COMMUNITY ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


export const deleteQuestion = async (req, res) => {
  try {
    const question = await ListeningFIBQuestion.findById(req.params.id);
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
// ---------- SUBMIT ATTEMPT ----------
export const submitListeningFIBAttempt = async (req, res) => {
  try {
    const { questionId, userId, userAnswers, timeTaken } = req.body;

    const question = await ListeningFIBQuestion.findById(questionId);
    if (!question) return res.status(404).json({ success: false, message: "Question not found" });

    // Scoring: +1 for each correct answer (case insensitive)
    let score = 0;
    const maxScore = question.correctAnswers.length;

    // userAnswers is array of strings: ["ans1", "ans2", ...]
    // correctAnswers is array of objects: [{index:1, correctAnswer:"ans"}, ...]
    // We assume userAnswers are in order of blanks 1, 2, 3...
    
    question.correctAnswers.sort((a, b) => a.index - b.index).forEach((ca, idx) => {
      const uAns = userAnswers[idx] || "";
      if (uAns.trim().toLowerCase() === ca.correctAnswer.trim().toLowerCase()) {
        score++;
      }
    });

    const attempt = await ListeningFIBAttempt.create({
      questionId,
      userId,
      userAnswers,
      score,
      maxScore,
      timeTaken
    });

    res.status(201).json({ success: true, attempt });
  } catch (error) {
    console.error("SUBMIT LISTENING FIB ATTEMPT ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateListeningFIBQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(req.body)

   let title = req.body?.title
    let transcript = req.body?.transcript
     let correctAnswers = req.body?.correctAnswers 
     let difficulty = req.body?.difficulty

    // 🔥 Parse boolean safely
    let isPredictive;
    if (req.body?.isPredictive !== undefined) {
      if (req.body.isPredictive === "true") isPredictive = true;
      else if (req.body.isPredictive === "false") isPredictive = false;
    }

    const question = await ListeningFIBQuestion.findById(id);
    if (!question) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    // Parse correctAnswers
    if (correctAnswers && typeof correctAnswers === "string") {
      try {
        correctAnswers = JSON.parse(correctAnswers);
      } catch {
        return res.status(400).json({ success: false, message: "Invalid answers format" });
      }
    }

    // Audio update
    if (req.file) {
      if (question.cloudinaryId) {
        await cloudinary.uploader.destroy(question.cloudinaryId, {
          resource_type: "video",
        });
      }

      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "video",
      });

      question.audioUrl = result.secure_url;
      question.cloudinaryId = result.public_id;
      fs.unlinkSync(req.file.path);
    }

    // Field updates
    if (title) question.title = title;
    if (transcript) question.transcript = transcript;
    if (difficulty) question.difficulty = difficulty;
    if (correctAnswers) question.correctAnswers = correctAnswers;
    if (typeof isPredictive === "boolean") {
      question.isPredictive = isPredictive;
    }

    await question.save();
    res.status(200).json({ success: true, question });

  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    console.error("UPDATE LISTENING FIB ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
