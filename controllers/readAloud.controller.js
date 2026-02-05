import ReadAloud from "../models/readAloud.model.js";
import mongoose from "mongoose";

export const getReadAloudQuestionsWithAttempts = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, message: "UserId is required" });

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const questions = await ReadAloud.aggregate([
      // Lookup attempts in speakingresults
      {
        $lookup: {
          from: "speakingresults",
          let: { qId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$user", userObjectId] },
                    { $in: ["$$qId", "$scores.questionId"] }
                  ]
                }
              }
            },
            { $count: "count" }
          ],
          as: "attemptData"
        }
      },
      // Add fields
      {
        $addFields: {
           attemptCount: { $ifNull: [{ $arrayElemAt: ["$attemptData.count", 0] }, 0] },
           isAttempted: { $gt: [{ $ifNull: [{ $arrayElemAt: ["$attemptData.count", 0] }, 0] }, 0] },
           status: {
             $cond: {
               if: { $gt: [{ $ifNull: [{ $arrayElemAt: ["$attemptData.count", 0] }, 0] }, 0] },
               then: "Practiced",
               else: "Not Practiced"
             }
           }
        }
      },
      { $project: { attemptData: 0 } },
      { $sort: { createdAt: -1 } }
    ]);

    res.status(200).json({ success: true, data: questions });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createReadAloud = async (req, res) => {
  try {
    const readAloud = await ReadAloud.create(req.body);
    res.status(201).json({
      success: true,
      data: readAloud,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllReadAloud = async (req, res) => {
  try {
    const readAlouds = await ReadAloud.find();
    res.status(200).json({
      success: true,
      data: readAlouds,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getReadAloudById = async (req, res) => {
  try {
    const readAloud = await ReadAloud.findById(req.params.id);

    if (!readAloud) {
      return res.status(404).json({
        success: false,
        message: "ReadAloud not found",
      });
    }

    // Find adjacent questions
    const nextQuestion = await ReadAloud.findOne({ _id: { $gt: req.params.id } }).sort({ _id: 1 }).select('_id');
    const prevQuestion = await ReadAloud.findOne({ _id: { $lt: req.params.id } }).sort({ _id: -1 }).select('_id');

    res.status(200).json({
      success: true,
      data: {
        ...readAloud.toObject(),
        nextId: nextQuestion ? nextQuestion._id : null,
        prevId: prevQuestion ? prevQuestion._id : null
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateReadAloud = async (req, res) => {
  try {
    const readAloud = await ReadAloud.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!readAloud) {
      return res.status(404).json({
        success: false,
        message: "ReadAloud not found",
      });
    }

    res.status(200).json({
      success: true,
      data: readAloud,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteReadAloud = async (req, res) => {
  try {
    const readAloud = await ReadAloud.findByIdAndDelete(req.params.id);

    if (!readAloud) {
      return res.status(404).json({
        success: false,
        message: "ReadAloud not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "ReadAloud deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
