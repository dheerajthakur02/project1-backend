
import mongoose from "mongoose";
import { cloudinary } from "../../config/cloudinary.js";
import { HIWAttempt, HIWQuestion } from "../../models/listening/HIW.js";

// @route   POST /api/hiw

export const createHIWQuestion = async (req, res) => {
  try {
    const { title, content, mistakes, difficulty } = req.body;

    const newQuestion = await HIWQuestion.create({
      title,
      content,
      mistakes: typeof mistakes === "string" ? JSON.parse(mistakes) : mistakes,
      audioUrl: "audio placeholder",
      cloudinaryId: "cloudinaryId placeholder",
      difficulty,
    });

    res.status(201).json({
      success: true,
      data: newQuestion
    });

  } catch (error) {
    console.error("Create HIW Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// @desc    Update HIW Question
// @route   PUT /api/hiw/:id
export const updateHIWQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    let question = await HIWQuestion.findById(id);

    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    // Build update object
    const updateData = { ...req.body };
    
    // Handle correctKeys if sent as string from frontend
    if (req.body.correctKeys) {
        updateData.correctKeys = JSON.parse(req.body.correctKeys);
    }

    // Handle Audio Update if a new file is uploaded
    if (req.file) {
      // 1. Delete old audio from Cloudinary
      if (question.cloudinaryId) {
        await cloudinary.uploader.destroy(question.cloudinaryId, { resource_type: "video" });
      }

      // 2. Upload new audio
      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "video",
        folder: "hiw_audio",
      });

      updateData.audioUrl = result.secure_url;
      updateData.cloudinaryId = result.public_id;
    }

    // Update only the fields provided in updateData
    const updatedQuestion = await HIWQuestion.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: updatedQuestion });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all HIW Questions
// @route   GET /api/hiw
// export const getHIWQuestions = async (req, res) => {
//   try {
//     const questions = await HIWQuestion.find().sort({ createdAt: -1 });
//     res.status(200).json({ success: true, count: questions.length, data: questions });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };
export const getHIWQuestions  = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const questions = await HIWQuestion.aggregate([
      // 1️⃣ Count total attempts by this user per question
      {
        $lookup: {
          from: "hiwattempts", // Mongo collection name
          let: { qId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$questionId", "$$qId"] },
                    { $eq: ["$userId", userObjectId] },
                  ],
                },
              },
            },
            { $count: "count" },
          ],
          as: "attemptCountArr",
        },
      },

      // 2️⃣ Get last 10 attempts for this user per question
      {
        $lookup: {
          from: "hiwattempts",
          let: { qId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$questionId", "$$qId"] },
                    { $eq: ["$userId", userObjectId] },
                  ],
                },
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 10 },
            {
              $project: {
                selectedIndices: 1,
                score: 1,
                correctCount: 1,
                wrongCount: 1,
                missedCount: 1,
                timeTaken: 1,
                createdAt: 1,
              },
            },
          ],
          as: "lastAttempts",
        },
      },

      // 3️⃣ Add derived fields
      {
        $addFields: {
          attemptCount: {
            $ifNull: [{ $arrayElemAt: ["$attemptCountArr.count", 0] }, 0],
          },
          isAttempted: {
            $gt: [
              { $ifNull: [{ $arrayElemAt: ["$attemptCountArr.count", 0] }, 0] },
              0,
            ],
          },
        },
      },

      // 4️⃣ Cleanup
      {
        $project: {
          attemptCountArr: 0,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      count: questions.length,
      data: questions,
    });
  } catch (error) {
    console.error("GET HIW QUESTIONS WITH ATTEMPTS ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



export const submitHIWAttempt = async (req, res) => {
  try {
    const { questionId, userId, selectedIndices, timeTaken } = req.body;
    const question = await HIWQuestion.findById(questionId);

    const mistakeIndices = question.mistakes.map(m => m.index);
    
    // 1. Correct Words: User clicked a word that is actually a mistake
    const correctCount = selectedIndices.filter(idx => mistakeIndices.includes(idx)).length;

    // 2. Wrong Words: User clicked a word that was correct in the audio (Penalty)
    const wrongCount = selectedIndices.filter(idx => !mistakeIndices.includes(idx)).length;

    // 3. Missed Words: Actual mistakes the user failed to click
    const missedCount = mistakeIndices.filter(idx => !selectedIndices.includes(idx)).length;

    // PTE Score Calculation
    const score = Math.max(0, correctCount - wrongCount);

    const attempt = await HIWAttempt.create({
      questionId,
      userId,
      selectedIndices,
      score,
      correctCount,
      wrongCount,
      missedCount,
      timeTaken
    });

    res.status(200).json({
      success: true,
      data: {
        score,
        correctCount,
        wrongCount,
        missedCount,
        mistakes: question.mistakes // Sending back for frontend analysis UI
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};