import { AttemptReadingFIBDropdown } from "../models/attemptReadingFIBDropdown.model.js";
import { ReadingFIBDropdown } from "../models/readingFIBDropdown.model.js";

// Add a new question
export const addQuestion = async (req, res) => {
  try {
    const { title, text, blanks, difficulty, isPrediction } = req.body;

    const newQuestion = new ReadingFIBDropdown({
      title,
      text,
      blanks,
      difficulty,
      isPrediction,
    });

    await newQuestion.save();
    res.status(201).json({
      success: true,
      data: newQuestion,
      message: "Reading FIB Dropdown Question added successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get questions with user attempts status
export const getQuestions = async (req, res) => {
  try {
    const { userId } = req.params;
    const questions = await ReadingFIBDropdown.find().lean();
   
    // Fetch user attempts to add status
    const questionsWithStatus = await Promise.all(
      questions.map(async (question) => {
        if (userId) {
          const attempts = await AttemptReadingFIBDropdown.find({
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
    const question = await ReadingFIBDropdown.findById(req.params.id);
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
    const { userId, questionId, userAnswers } = req.body;

    const question = await ReadingFIBDropdown.findById(questionId);
    if (!question) {
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });
    }

    let score = 0;
    const evaluatedAnswers = userAnswers.map((userAns) => {
      // Find the correct blank
      const correctBlank = question.blanks.find(
        (b) => b.index === userAns.index
      );
      let isCorrect = false;

      if (correctBlank && correctBlank.correctAnswer === userAns.answer) {
        isCorrect = true;
        score += 1; // 1 mark for correct
      }
      // No negative marking
      return {
        index: userAns.index,
        answer: userAns.answer,
        isCorrect,
      };
    });

    const maxScore = question.blanks.length;

    const newAttempt = new AttemptReadingFIBDropdown({
      userId,
      questionId,
      userAnswers: evaluatedAnswers,
      score,
      maxScore,
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
      console.error("User ID missing from token");
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    const attempts = await AttemptReadingFIBDropdown.find({
      questionId,
      userId,
    }).sort({ createdAt: -1 });

    console.log(`Found ${attempts.length} attempts`);
    res.status(200).json({ success: true, data: attempts });
  } catch (error) {
    console.error("getAttempts Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAll = async (req, res) => {
  try {
    const attempts = await AttemptReadingFIBDropdown.find();
    return res.status(200).json({ success: true, data: attempts });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
