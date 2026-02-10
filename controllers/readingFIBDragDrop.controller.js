import { ReadingResult } from "../models/mocktest/Reading.js";
import { ReadingFIBDragDrop } from "../models/readingFIBDragDrop.model.js";
import { AttemptReadingFIBDragDrop } from "../models/attemptReadingFIBDragDrop.model.js";
import mongoose from "mongoose";
// Add a new question
export const addQuestion = async (req, res) => {
  try {
    const { title, text, options, correctAnswers, difficulty, isPredictive } = req.body;

    const newQuestion = new ReadingFIBDragDrop({
      title,
      text,
      options,
      correctAnswers,
      difficulty,
      isPredictive,
    });

    await newQuestion.save();
    res.status(201).json({
      success: true,
      data: newQuestion,
      message: "Reading FIB Drag and Drop Question added successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get questions with user attempts status
export const getQuestions = async (req, res) => {
  try {
    const { userId } = req.params;
    const questions = await ReadingFIBDragDrop.find().lean();

    // Fetch user attempts to add status
    const questionsWithStatus = await Promise.all(
      questions.map(async (question) => {
        if (userId) {
          const attempts = await AttemptReadingFIBDragDrop.find({
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
    const question = await ReadingFIBDragDrop.findById(req.params.id);
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
    const { questionId, userAnswers, timeTaken } = req.body;
    const userId = req.user?._id || req.user?.id || req.body.userId;

    const question = await ReadingFIBDragDrop.findById(questionId);
    if (!question) {
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });
    }

    // Scoring Logic
    let score = 0;
    const evaluatedAnswers = userAnswers.map((userAns) => {
        const correctEntry = question.correctAnswers.find(ca => ca.index === userAns.index);
        let isCorrect = false;

        if (correctEntry && correctEntry.correctAnswer === userAns.answer) {
            isCorrect = true;
            score += 1;
        }

        return {
            index: userAns.index,
            answer: userAns.answer,
            isCorrect
        };
    });

    const maxScore = question.correctAnswers.length;

    const newAttempt = new AttemptReadingFIBDragDrop({
      userId,
      questionId,
      userAnswers: evaluatedAnswers,
      score,
      maxScore,
      timeTaken
    });

    await newAttempt.save();

    // ALSO SAVE TO READING RESULT (Unified Result)
    try {
      const readingResult = new ReadingResult({
        user: userId,
        testId: questionId,
        testModel: 'ReadingFIBDragDrop',
        overallScore: score,
        totalMaxScore: maxScore,
        sectionScores: {
          reading: score,
          writing: 0
        },
        scores: [{
          questionId: questionId,
          questionType: 'FIB',
          userAnswer: evaluatedAnswers,
          score: score,
          maxScore: maxScore
        }]
      });
      await readingResult.save();
    } catch (saveError) {
      console.error("Failed to save unified ReadingResult:", saveError);
    }

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

    const attempts = await AttemptReadingFIBDragDrop.find({
      questionId,
      userId,
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: attempts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAll = async (req, res) => {
  try {
    const attempts = await AttemptReadingFIBDragDrop.find();
    return res.status(200).json({ success: true, data: attempts });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
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

    const data = await AttemptReadingFIBDragDrop.aggregate([
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

    const question = await ReadingFIBDragDrop.findById(id);
    if (!question) {
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });
    }

    await ReadingFIBDragDrop.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Reading FIB Dropdown question deleted successfully",
    });
  } catch (error) {
    console.error("Delete Question Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};