import Reading, { ReadingResult } from "../../models/mocktest/Reading.js";


/**
 * ✅ CREATE READING SECTION
 */
export const createReading = async (req, res) => {
  try {
    const {
      title,
      summarizeWrittenText = [],
      fillInTheBlanksDropdown = [],
      multipleChoiceMultiple = [],
      reOrderParagraphs = [],
      fillInTheBlanksWithDragDrop = [],
      multipleChoiceSingle = [],
      highLightCorrectSummary = [],
      highlightIncorrectWords = [],
    } = req.body;

    const reading = new Reading({
      title,
      summarizeWrittenText,
      fillInTheBlanksDropdown,
      multipleChoiceMultiple,
      reOrderParagraphs,
      fillInTheBlanksWithDragDrop,
      multipleChoiceSingle,
      highLightCorrectSummary,
      highlightIncorrectWords,
    });

    await reading.save(); // 🔒 max 20 questions validated in schema

    res.status(201).json({
      success: true,
      message: "Reading section created successfully",
      data: reading,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * ✅ GET ALL READING SECTIONS
 */
export const getAllReading = async (req, res) => {
  try {
    const readingSections = await Reading.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: readingSections.length,
      data: readingSections,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch reading sections",
    });
  }
};

/**
 * ✅ GET READING BY ID (WITH QUESTIONS)
 */
export const getReadingById = async (req, res) => {
  try {
    const { id } = req.params;

    const readingSection = await Reading.findById(id)
       .populate("summarizeWrittenText")
       .populate("fillInTheBlanksDropdown")
       .populate("multipleChoiceMultiple")
       .populate("reOrderParagraphs")
       .populate("fillInTheBlanksWithDragDrop")
       .populate("multipleChoiceSingle")
       .populate("highLightCorrectSummary")
       .populate("highlightIncorrectWords");

    if (!readingSection) {
      return res.status(404).json({
        success: false,
        message: "Reading section not found",
      });
    }

    res.status(200).json({
      success: true,
      data: readingSection,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch reading section",
    });
  }
};

/**
 * ✅ UPDATE READING SECTION
 */
export const updateReading = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedReading = await Reading.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true,
        runValidators: true, // 🔒 important for question limit
      }
    );

    if (!updatedReading) {
      return res.status(404).json({
        success: false,
        message: "Reading section not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Reading section updated successfully",
      data: updatedReading,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * ✅ CALCULATE READING RESULT
 */

/**
 * ✅ CALCULATE READING RESULT (Server-Side Scoring)
 */
export const calculateReadingResult = async (req, res) => {
  try {
    const { userId, readingId, answers } = req.body;
    // answers = [{ questionId, type, answer }]

    const readingTest = await Reading.findById(readingId)
       .populate("summarizeWrittenText")
       .populate("fillInTheBlanksDropdown")
       .populate("multipleChoiceMultiple")
       .populate("reOrderParagraphs")
       .populate("fillInTheBlanksWithDragDrop")
       .populate("multipleChoiceSingle")
       .populate("highLightCorrectSummary")
       .populate("highlightIncorrectWords");

    if (!readingTest) return res.status(404).json({ success: false, message: "Reading Test not found" });

    // Helper to find question (Filtered for safety)
    const allQuestions = [
        ...(readingTest.summarizeWrittenText || []),
        ...(readingTest.fillInTheBlanksDropdown || []),
        ...(readingTest.multipleChoiceMultiple || []),
        ...(readingTest.reOrderParagraphs || []),
        ...(readingTest.fillInTheBlanksWithDragDrop || []),
        ...(readingTest.multipleChoiceSingle || []),
        ...(readingTest.highLightCorrectSummary || []),
        ...(readingTest.highlightIncorrectWords || [])
    ].filter(q => q && q._id);

    const findQuestion = (id) => allQuestions.find(q => q._id.toString() === id);

    let totalScore = 0;
    const detailedScores = [];

    if (Array.isArray(answers)) {
      for (const ans of answers) {
          const question = findQuestion(ans.questionId);
          let score = 0;
          let maxScore = 0;

          if (question) {
              // SCORING LOGIC
              try {
                if (["FIB_R", "FIB_RW", "FIB_DD", "ReadingFIBDropdown", "ReadingFIBDragDrop"].includes(ans.type)) {
                    // FIB Logic
                    maxScore = question.blanks?.length || 5;
                    if (ans.answer && typeof ans.answer === 'object') {
                        question.blanks.forEach(b => {
                            if (ans.answer[b.index] === b.correctAnswer) score += 1;
                        });
                    }
                } else if (["MCM", "MCMA", "ReadingMultiChoiceMultiAnswer"].includes(ans.type)) {
                    // Multi Choice Multi
                    maxScore = question.options?.length || 1;
                    if (Array.isArray(ans.answer)) {
                         const correct = question.correctAnswer || [];
                         ans.answer.forEach(a => {
                             if (correct.includes(a)) score += 1;
                         });
                    }
                } else if (["MCS", "ReadingMultiChoiceSingleAnswer", "HCS", "SMW"].includes(ans.type)) {
                    // Single Choice
                    maxScore = 1;
                    if (ans.answer === question.correctAnswer || ans.answer === question.answer) score = 1;
                } else if (["RO", "ReadingReorder"].includes(ans.type)) {
                    // Reorder
                    maxScore = (question.sentences?.length || 1) - 1;
                    if (Array.isArray(ans.answer) && ans.answer.length > 1) {
                         ans.answer.forEach((item, idx) => {
                            if (item.id === question.sentences[idx]?._id?.toString() || item.text === question.sentences[idx]?.text) score += 1;
                         });
                         if (score > maxScore) score = maxScore; 
                    }
                } else if (["SWT", "SummarizeWrittenText"].includes(ans.type)) {
                     // Simple logic
                     maxScore = 7;
                     const answerText = typeof ans.answer === 'string' ? ans.answer : "";
                     const words = answerText.split(" ").length;
                     if (words >= 5 && words <= 75) score = 7;
                     else score = 0;
                }
              } catch (e) {
                console.error("Error scoring question:", ans.questionId, e);
              }
          }
          
          detailedScores.push({
              questionId: ans.questionId,
              questionType: ans.type,
              userAnswer: ans.answer,
              score: score,
              maxScore: maxScore
          });
          totalScore += score;
      }
    }

    const overallScore = Math.round(totalScore); // Raw sum for now

    const readingResult = new ReadingResult({
      user: userId,
      readingId,
      overallScore,
      scores: detailedScores, // Schema expects 'scores' with specific fields, ensured above
    });

    await readingResult.save();

    res.status(200).json({
      success: true,
      data: readingResult,
    });
  } catch (error) {
    console.error("Reading Calc Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * ✅ GET USER READING RESULTS
 */
export const getUserReadingResults = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const results = await ReadingResult.find({ user: userId })
      .populate("readingId", "title name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * ✅ GET READING RESULT BY ID
 */
export const getReadingResultById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await ReadingResult.findById(id).populate("readingId");

    if (!result) return res.status(404).json({ success: false, message: "Result not found" });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
