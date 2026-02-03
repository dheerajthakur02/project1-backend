



import {cloudinary} from "../config/cloudinary.js";
import Question from "../models/repeat.model.js";
import mongoose from "mongoose";

// Upload Question
export const addQuestion = async (req, res) => {
  const { title, prepareTime, answerTime, transcript } = req.body;

  if (!transcript) {
    return res.status(400).json({ message: "Transcript is required" });
  }

  const audio = await cloudinary.uploader.upload(req.file.path, {
    resource_type: "video"
  });

  const question = await Question.create({
    title,
    prepareTime,
    answerTime,
    transcript: transcript,
    audioUrl: audio?.secure_url,
    cloudinaryId: audio?.public_id,
    difficulty: req.body.difficulty || "Medium",
  });

  res.json(question);
};

export const getAllQuestions = async (req, res) => {
  try {
    const questions = await Question.find().sort({ createdAt: -1 });
    res.json({ success: true, data: questions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const getQuestionsWithAttempts = async (req, res) => {

  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required"
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const questions = await Question.aggregate([
      /* ---------------- TOTAL ATTEMPT COUNT ---------------- */
      {
        $lookup: {
          from: "repeatattempts",
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

      /* ---------------- LAST 5 ATTEMPTS ---------------- */
      {
        $lookup: {
          from: "repeatattempts",
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
            { $sort: { createdAt: -1 } }, // newest first
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

      /* ---------------- FINAL SHAPE ---------------- */
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

      {
        $project: {
          attemptCountArr: 0
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: questions
    });

  } catch (error) {
    console.error("Get Questions Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


export const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    const title = req.body?.title;
    const prepareTime = req.body?.prepareTime;
    const answerTime = req.body?.answerTime;

    // If new audio uploaded
    if (req.file) {
      // Delete old audio
      await cloudinary.uploader.destroy(question.cloudinaryId, {
        resource_type: "video"
      });

      // Upload new audio
      const uploaded = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "video"
      });

      question.audioUrl = uploaded.secure_url;
      question.cloudinaryId = uploaded.public_id;
    }

    // Update text fields only if sent
    if (title !== undefined) question.title = title;
    if (prepareTime !== undefined) question.prepareTime = prepareTime;
    if (answerTime !== undefined) question.answerTime = answerTime;

    await question.save();

    res.json(question);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


import User from "../models/user.model.js";

export const getQuestionsWithCommunityAttempts = async (req, res) => {
  try {
    const { questionId } = req.params;

    const matchStage = questionId
      ? { _id: new mongoose.Types.ObjectId(questionId) }
      : {};

    const questions = await Question.aggregate([
      { $match: matchStage },

      /* ---------------- LOOKUP COMMUNITY ATTEMPTS ---------------- */
      {
        $lookup: {
          from: "repeatattempts",
          let: { qId: "$_id" },
          pipeline: [
            /* Match only this question */
            {
              $match: {
                $expr: { $eq: ["$questionId", "$$qId"] }
              }
            },

            /* Sort latest attempts first */
            { $sort: { createdAt: -1 } },

            /* Group by user → collect all attempts per user */
            {
              $group: {
                _id: "$userId",
                attempts: { $push: "$$ROOT" } // collect all attempts for this user
              }
            },

            /* Keep max 15 attempts per user */
            {
              $project: {
                userId: "$_id",
                attempts: { $slice: ["$attempts", 15] }
              }
            },

            /* Populate user info */
            {
              $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "user"
              }
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },

            /* Final shape */
            {
              $project: {
                userId: 1,
                user: { name: "$user.name" },
                attempts: {
                  score: 1,
                  content: 1,
                  fluency: 1,
                  pronunciation: 1,
                  studentAudio: 1,
                  createdAt: 1
                }
              }
            }
          ],
          as: "communityAttempts"
        }
      },

      /* Total number of users who attempted */
      {
        $addFields: {
          totalCommunityUsers: { $size: "$communityAttempts" }
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      data: questions
    });
  } catch (error) {
    console.error("Get Questions with Community Attempts Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};






// Delete question
export const deleteQuestion = async (req, res) => {
  const q = await Question.findById(req.params.id);
  await cloudinary.uploader.destroy(q.cloudinaryId, { resource_type: "video" });
  await q.deleteOne();
  res.json({ message: "Deleted" });
};

// // Upload Student Answer
// export const submitAnswer = async (req, res) => {
//   const { questionId, userId } = req.body;

//   const audio = await cloudinary.uploader.upload(req.file.path, {
//     resource_type: "video"
//   });

//   const attempt = await Attempt.create({
//     questionId,
//     userId,
//     studentAudioUrl: audio.secure_url,
//     cloudinaryId: audio.public_id,
//     score: 0
//   });

//   res.json(attempt);
// };
