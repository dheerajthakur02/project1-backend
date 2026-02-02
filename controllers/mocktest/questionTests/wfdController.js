import mongoose from "mongoose";
import WFD from "../../../models/mocktest/QuestionTests/WFD.js";
import { WriteFromDictationQuestion } from "../../../models/listening/WriteFromDictation.js";

export const createWFD = async (req, res) => {
  try {
    const { title, WriteFromDictationQuestions = [] } = req.body;

    if (!title)
      return res.status(400).json({ message: "Title required" });

    if (WriteFromDictationQuestions.length > 3)
      return res.status(400).json({ message: "Max 3 questions allowed" });

    const uniqueIds = [...new Set(WriteFromDictationQuestions.map(String))];

    const used = await WFD.findOne({
      WriteFromDictationQuestions: { $in: uniqueIds },
    });

    if (used)
      return res.status(400).json({
        message: "Question already used",
        usedIn: used.title,
      });

    const wfd = await WFD.create({ title, WriteFromDictationQuestions: uniqueIds });
    res.status(201).json({ success: true, data: wfd });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const getAllWFD = async (req, res) =>
  res.json({ data: await WFD.find() });

export const getWFDById = async (req, res) =>
  res.json({
    data: await WFD.findById(req.params.id).populate("WriteFromDictationQuestions"),
  });

export const updateWFD = async (req, res) =>
  res.json({
    data: await WFD.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }),
  });

export const deleteWFD = async (req, res) => {
  await WFD.findByIdAndDelete(req.params.id);
  res.json({ success: true });
};

/* ===================== SUBMIT WFD ===================== */
import { ListeningResult } from "../../../models/mocktest/Listening.js";

const cleanText = (text) =>
  text  ? text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim()
        : "";

export const submitWFD = async (req, res) => {
  try {
    const { testId, answers, userId } = req.body;
    // answers: array of { questionId, content }

    const questions = await WriteFromDictationQuestion.find({
      _id: { $in: answers.map((a) => a.questionId) },
    });

    let totalScore = 0;
    const scores = [];

    answers.forEach((ans) => {
      const question = questions.find((q) => q._id.toString() === ans.questionId);
      if (question) {
        const originalWords = cleanText(question.transcript).split(/\s+/).filter(Boolean);
        const userWords = cleanText(ans.content).split(/\s+/).filter(Boolean);

        let correctCount = 0;
        const tempOriginal = [...originalWords];

        userWords.forEach((uw) => {
          const idx = tempOriginal.indexOf(uw);
          if (idx !== -1) {
            correctCount++;
            tempOriginal.splice(idx, 1);
          }
        });

        // 1 point per correct word
        const score = correctCount;
        const maxScore = originalWords.length;
        
        totalScore += score;
        
        scores.push({
            questionId: question._id,
            questionType: "WFD",
            userAnswer: ans.content,
            score: score,
            maxScore: maxScore,
            contentScore: correctCount
        });
      }
    });
    
    // Create Result
    const result = new ListeningResult({
        user: req.user?._id || req.user?.id || userId,
        testId: testId,
        testModel: 'WFD',
        overallScore: totalScore,
        scores: scores
    });

    await result.save();

    res.json({
        success: true,
        data: result
    });

  } catch (error) {
    console.error("Submit WFD Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
/* ===================== GET UNUSED WFD QUESTIONS ===================== */
export const getUnusedWFDQuestions = async (req, res) => {
  try {
    const allWFDQuestions = await WriteFromDictationQuestion.find({});
    const existingWFDSections = await WFD.find({});

    const usedWFDQuestionIds = new Set();
    existingWFDSections.forEach(section => {
      section.WriteFromDictationQuestions.forEach(id => usedWFDQuestionIds.add(id.toString()));
    });

    const unusedWFDQuestions = allWFDQuestions.filter(q =>
      !usedWFDQuestionIds.has(q._id.toString())
    );

    res.status(200).json({
      success: true,
      data: {
        WriteFromDictationQuestions: unusedWFDQuestions, // Key for frontend matching schema
      },
    });
  } catch (error) {
    console.error("Error fetching unused WFD questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unused WFD questions",
    });
  }
};
