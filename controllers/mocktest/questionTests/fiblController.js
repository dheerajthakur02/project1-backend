import mongoose from "mongoose";
import FIBL from "../../../models/mocktest/QuestionTests/FIB&L.js";
import { ListeningFIBQuestion } from "../../../models/listening/ListeningFIBQuestion.js";
import { ListeningResult } from "../../../models/mocktest/Listening.js";

export const createFIBL = async (req, res) => {
  try {
    const { title, fiblQuestions = [] } = req.body;

    if (!title)
      return res.status(400).json({ success: false, message: "Title required" });

    if (fiblQuestions.length > 2)
      return res.status(400).json({
        success: false,
        message: "Max 2 questions allowed",
      });

    const invalidIds = fiblQuestions.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );
    if (invalidIds.length)
      return res.status(400).json({ success: false, invalidIds });

    const uniqueIds = [...new Set(fiblQuestions.map(String))];

    const existing = await ListeningFIBQuestion.find({
      _id: { $in: uniqueIds },
    });

    if (existing.length !== uniqueIds.length) {
      return res.status(400).json({
        success: false,
        message: "Some questions do not exist",
      });
    }

    const alreadyUsed = await FIBL.findOne({
      fiblQuestions: { $in: uniqueIds },
    });

    if (alreadyUsed) {
      return res.status(400).json({
        success: false,
        message: "Question already used in another FIB-L",
        usedIn: alreadyUsed.title,
      });
    }

    const fibl = await FIBL.create({ title, fiblQuestions: uniqueIds });

    res.status(201).json({ success: true, data: fibl });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const getAllFIBL = async (req, res) => {
  const data = await FIBL.find().sort({ createdAt: -1 });
  res.json({ success: true, data });
};

export const getFIBLById = async (req, res) => {
  const data = await FIBL.findById(req.params.id).populate("fiblQuestions");
  if (!data)
    return res.status(404).json({ success: false, message: "Not found" });
  res.json({ success: true, data });
};

export const updateFIBL = async (req, res) => {
  const updated = await FIBL.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  res.json({ success: true, data: updated });
};

export const deleteFIBL = async (req, res) => {
  await FIBL.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: "Deleted successfully" });
};

/* ===================== SUBMIT & SCORE FIBL ===================== */
export const submitFIBL = async (req, res) => {
  try {
    const { testId, answers } = req.body;
    // answers structure: { [questionId]: { "1": "answer", "2": "answer" } }

    const fiblTest = await FIBL.findById(testId).populate("fiblQuestions");
    if (!fiblTest) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }

    let totalScore = 0;
    let maxTotalScore = 0;
    const details = [];

    // Iterate through each question in the test
    for (const question of fiblTest.fiblQuestions) {
      const qId = question._id.toString();
      const userAnsObj = answers[qId] || {}; // e.g. { "1": "apple", "2": "banana" }
      
      let qScore = 0;
      let qMax = question.correctAnswers.length;

      const answerComparison = question.correctAnswers.map((ca) => {
        const userVal = (userAnsObj[ca.index] || "").trim().toLowerCase();
        const correctVal = ca.correctAnswer.trim().toLowerCase();
        const isCorrect = userVal === correctVal;
        
        if (isCorrect) qScore++;

        return {
          index: ca.index,
          userAnswer: userAnsObj[ca.index] || "",
          correctAnswer: ca.correctAnswer,
          isCorrect
        };
      });

      totalScore += qScore;
      maxTotalScore += qMax;

      details.push({
        questionId: qId,
        questionTitle: question.title,
        score: qScore,
        maxScore: qMax,
        answers: answerComparison
      });
    }

    // Result Object
    const resultData = {
      testId,
      overallScore: totalScore,
      maxScore: maxTotalScore,
      percentage: maxTotalScore > 0 ? Math.round((totalScore / maxTotalScore) * 100) : 0,
      details,
      sectionScores: {
          listening: totalScore, // FIBL contributes to listening and writing usually, but simplified here
          writing: totalScore 
      }
    };

    // SAVE TO DB
    const listeningResult = new ListeningResult({
        user: req.user?._id || req.user?.id || req.body.userId, // handle if userId passed in body
        testId: testId,
        testModel: 'FIBL',
        overallScore: totalScore,
        scores: details.map(d => ({
            questionId: d.questionId,
            questionType: 'FIBL',
            score: d.score,
            maxScore: d.maxScore,
            answers: d.answers
        }))
    });

    await listeningResult.save();

    res.status(200).json({
      success: true,
      message: "FIBL Submitted",
      data: resultData
    });

  } catch (error) {
    console.error("FIBL Submit Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
/* ===================== GET UNUSED FIBL QUESTIONS ===================== */
export const getUnusedFIBLQuestions = async (req, res) => {
  try {
    const allFIBLQuestions = await ListeningFIBQuestion.find({});
    const existingFIBLSections = await FIBL.find({});

    const usedFIBLQuestionIds = new Set();
    existingFIBLSections.forEach(section => {
      section.fiblQuestions.forEach(id => usedFIBLQuestionIds.add(id.toString()));
    });

    const unusedFIBLQuestions = allFIBLQuestions.filter(q =>
      !usedFIBLQuestionIds.has(q._id.toString())
    );

    res.status(200).json({
      success: true,
      data: {
        fiblQuestions: unusedFIBLQuestions, // Key for frontend
      },
    });
  } catch (error) {
    console.error("Error fetching unused FIBL questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unused FIBL questions",
    });
  }
};
