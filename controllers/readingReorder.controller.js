import { ReadingReorder } from "../models/readingReorder.model.js";
import { AttemptReadingReorder } from "../models/attemptReadingReorder.model.js";
import mongoose from "mongoose";
// Add a new question
export const addQuestion = async (req, res) => {
  try {
    const { title, sentences, correctOrder, difficulty, isPredictive } = req.body;

    const newQuestion = new ReadingReorder({
      title,
      sentences,
      correctOrder,
      difficulty,
      isPredictive,
    });

    await newQuestion.save();
    res.status(201).json({
      success: true,
      data: newQuestion,
      message: "Reorder Paragraph Question added successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get questions with user attempts status
export const getQuestions = async (req, res) => {
  try {
    const { userId } = req.params;
    const questions = await ReadingReorder.find().lean();

    const questionsWithStatus = await Promise.all(
      questions.map(async (question) => {
        if (userId) {
          const attempts = await AttemptReadingReorder.find({
            userId,
            questionId: question._id,
          });
          const attemptCount = attempts.length;
          const status =
            attemptCount > 0 ? `Practiced (${attemptCount})` : "Not Practiced";
          return { ...question, status, attemptCount };
        }
        return { ...question, status: "Not Practiced", attemptCount: 0 };
      })
    );

    res.status(200).json({ success: true, data: questionsWithStatus });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single question by ID
export const getQuestionById = async (req, res) => {
  try {
    const question = await ReadingReorder.findById(req.params.id);
    if (!question) {
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });
    }
    res.status(200).json({ success: true, data: question });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Submit an attempt
export const submitAttempt = async (req, res) => {
  try {
    const { userId, questionId, userOrder, timeTaken } = req.body;

    const question = await ReadingReorder.findById(questionId);
    if (!question) {
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });
    }

    // Scoring Logic: Adjacent Pairs
    // Points = pairs in userOrder that also exist in correctOrder
    const correctOrder = question.correctOrder;
    let score = 0;
    let pairResults = [];

    // correctOrder = ['C', 'A', 'D', 'B']
    // Valid pairs: C-A, A-D, D-B

    // Create a set of correct pairs for O(1) lookup
    const correctPairs = new Set();
    for (let i = 0; i < correctOrder.length - 1; i++) {
        correctPairs.add(`${correctOrder[i]}-${correctOrder[i+1]}`);
    }

    // Check user pairs
    for (let i = 0; i < userOrder.length - 1; i++) {
        const pair = `${userOrder[i]}-${userOrder[i+1]}`;
        const isCorrect = correctPairs.has(pair);
        
        pairResults.push({ pair, isCorrect });
        if (isCorrect) {
            score += 1;
        }
    }

    // Max score is n-1 where n is number of items
    const maxScore = correctOrder.length - 1;

    const newAttempt = new AttemptReadingReorder({
      userId,
      questionId,
      userOrder,
      pairResults,
      score,
      maxScore,
      timeTaken
    });

    await newAttempt.save();

    res.status(201).json({
      success: true,
      data: newAttempt,
      message: "Attempt submitted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get attempts for a specific question and user
export const getAttempts = async (req, res) => {
  try {
    const { questionId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    const attempts = await AttemptReadingReorder.find({
      questionId,
      userId,
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: attempts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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

    const data = await AttemptReadingReorder.aggregate([
      {
        $match: {
          questionId: new mongoose.Types.ObjectId(questionId),
        },
      },

      // Sort latest attempts first
      { $sort: { createdAt: -1 } },

      // Group attempts per user
      {
        $group: {
          _id: "$userId",
          attempts: { $push: "$$ROOT" },
        },
      },

      // Limit to 15 attempts per user
      {
        $project: {
          userId: "$_id",
          attempts: { $slice: ["$attempts", 15] },
          _id: 0,
        },
      },

      // Optional: sort users by most recent attempt
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

export const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await ReadingReorder.findById(id);
    if (!question) {
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });
    }

    await ReadingReorder.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Reading FIB Dropdown question deleted successfully",
    });
  } catch (error) {
    console.error("Delete Question Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};