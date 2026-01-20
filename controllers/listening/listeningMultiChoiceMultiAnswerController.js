import { ListeningMultiChoiceMultiAnswer, ListeningMultiChoiceMultiAnswerAttempt } from "../../models/listening/ListeningMultiChoiceMultiAnswer.js";
import { cloudinary } from "../../config/cloudinary.js";
import mongoose from "mongoose";

// Add a new question
export const addQuestion = async (req, res) => {
  try {
    const { title, question, options, correctOptions, difficulty, transcript } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Audio file is required" });
    }

    // correctOptions and options might come as stringified JSON if sent via FormData
    let parsedOptions = options;
    if (typeof options === "string") {
        try { parsedOptions = JSON.parse(options); } catch (e) { parsedOptions = [options]; }
    }

    let parsedCorrectOptions = correctOptions;
    if (typeof correctOptions === "string") {
        try { parsedCorrectOptions = JSON.parse(correctOptions); } catch (e) { parsedCorrectOptions = [correctOptions]; }
    }

    // Upload audio
    const audio = await cloudinary.uploader.upload(req.file.path, { resource_type: "video" });

    const newQuestion = await ListeningMultiChoiceMultiAnswer.create({
      title,
      audioUrl: audio.secure_url,
      cloudinaryId: audio.public_id,
      transcript: transcript || "", // Optional
      question,
      options: parsedOptions,
      correctOptions: parsedCorrectOptions,
      difficulty: difficulty || "Medium"
    });

    res.status(201).json({
      success: true,
      data: newQuestion,
      message: "Listening Multi Choice Multi Answer Question added successfully",
    });
  } catch (error) {
    console.error("ADD LISTENING MCM QUESTION ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get questions with user attempts status
export const getQuestions = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Fetch all questions
    const questions = await ListeningMultiChoiceMultiAnswer.find().lean();

    // Fetch user attempts to add status
    const questionsWithStatus = await Promise.all(
      questions.map(async (question) => {
        if (userId) {
            // Check attempts for this question
          const attempts = await ListeningMultiChoiceMultiAnswerAttempt.find({
            userId,
            questionId: question._id,
          }).sort({ createdAt: -1 });
          const attemptCount = attempts.length;
          const status = attemptCount > 0 ? `Practiced (${attemptCount})` : "Not Practiced";
          
          // Attach last attempt score if needed, or just status
           return { ...question, status, attemptCount, lastAttempts: attempts };
        }
        return { ...question, status: "Not Practiced", attemptCount: 0 };
      })
    );

    res.status(200).json({ success: true, data: questionsWithStatus });
  } catch (error) {
    console.error("GET LISTENING MCM QUESTIONS ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single question by ID
export const getQuestionById = async (req, res) => {
  try {
    const question = await ListeningMultiChoiceMultiAnswer.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }
    res.status(200).json({ success: true, data: question });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Submit an attempt
export const submitAttempt = async (req, res) => {
  try {
    const { userId, questionId, userSelectedOptions, timeTaken } = req.body;

    const question = await ListeningMultiChoiceMultiAnswer.findById(questionId);
    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    // Scoring Logic: +1 for correct, -1 for incorrect. Min 0.
    const correctOptionsSet = new Set(question.correctOptions);
    let correctCount = 0;
    let incorrectCount = 0;

    userSelectedOptions.forEach(option => {
      // Comparison should ideally be robust (trim/lowercase) but Reading module seems to do exact match on string/ID
      // Assuming options are strings.
      if (correctOptionsSet.has(option)) {
        correctCount++;
      } else {
        incorrectCount++;
      }
    });

    let rawScore = correctCount - incorrectCount;
    // Ensure score is not negative
    const score = Math.max(0, rawScore);
    const maxScore = question.correctOptions.length;

    const newAttempt = await ListeningMultiChoiceMultiAnswerAttempt.create({
      userId,
      questionId,
      userAnswers: userSelectedOptions,
      score,
      maxScore,
      timeTaken: timeTaken || 0
    });

    res.status(201).json({
      success: true,
      data: newAttempt,
      attempt: newAttempt, // Dual return for compatibility
      message: "Attempt submitted successfully",
    });
  } catch (error) {
    console.error("SUBMIT LISTENING MCM ATTEMPT ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
