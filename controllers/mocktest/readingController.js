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
export const calculateReadingResult = async (req, res) => {
  try {
    const { userId, readingId, answers } = req.body;
    // answers = [{ questionId, questionType, score }]

    let totalScore = 0;

    const detailedScores = answers.map((answer) => {
      totalScore += answer.score;

      return {
        questionType: answer.questionType,
        contentScore: answer.score,
      };
    });

    const overallScore = Math.round(totalScore / answers.length);

    const readingResult = new ReadingResult({
      user: userId,
      readingId,
      overallScore,
      scores: detailedScores,
    });

    await readingResult.save();

    res.status(200).json({
      success: true,
      data: readingResult,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
