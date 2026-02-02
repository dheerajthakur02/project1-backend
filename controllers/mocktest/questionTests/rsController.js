import RS from "../../../models/mocktest/QuestionTests/RS.js";
import { SpeakingResult } from "../../../models/mocktest/Speaking.js";
import mongoose from "mongoose";
import RepeatQuestion from "../../../models/repeat.model.js";
/* ===================== CREATE RL ===================== */


export const createRS = async (req, res) => {
  try {
    const { title, repeatSentenceQuestions = [] } = req.body;

    // 1️⃣ Title check
    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    // 2️⃣ Max 5 questions
    if (repeatSentenceQuestions.length > 5) {
      return res.status(400).json({
        success: false,
        message: "Repeat Sentence section cannot have more than 5 questions",
      });
    }

    // 3️⃣ Validate ObjectIds
    const invalidIds = repeatSentenceQuestions.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );

    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid RepeatQuestion IDs found",
        invalidIds,
      });
    }

    // 4️⃣ Remove duplicates from request
    const uniqueQuestionIds = [
      ...new Set(repeatSentenceQuestions.map(String)),
    ];

    // 5️⃣ Check RepeatQuestions exist
    const existingQuestions = await RepeatQuestion.find({
      _id: { $in: uniqueQuestionIds },
    }).select("_id");

    if (existingQuestions.length !== uniqueQuestionIds.length) {
      const existingIds = existingQuestions.map((q) => q._id.toString());
      const missingIds = uniqueQuestionIds.filter(
        (id) => !existingIds.includes(id)
      );

      return res.status(400).json({
        success: false,
        message: "Some RepeatQuestions do not exist",
        missingIds,
      });
    }

    // 🔥 6️⃣ Check if RepeatQuestions already used in another RS
    const alreadyUsedRS = await RS.findOne({
      repeatSentenceQuestions: { $in: uniqueQuestionIds },
    }).select("repeatSentenceQuestions title");

    if (alreadyUsedRS) {
      const usedIds = alreadyUsedRS.repeatSentenceQuestions.map(String);

      const conflictedIds = uniqueQuestionIds.filter((id) =>
        usedIds.includes(id)
      );

      return res.status(400).json({
        success: false,
        message:
          "One or more RepeatQuestions are already used in another RS section",
        conflictedIds,
        usedInRSTitle: alreadyUsedRS.title,
      });
    }

    // 7️⃣ Create RS
    const rs = new RS({
      title,
      repeatSentenceQuestions: uniqueQuestionIds,
    });

    await rs.save();

    res.status(201).json({
      success: true,
      message: "Repeat Sentence section created successfully",
      data: rs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/* ===================== GET ALL RL ===================== */
export const getAllRS = async (req, res) => {
  try {
    const rsSections = await RS.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: rsSections.length,
      data: rsSections,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch Read Aloud sections",
    });
  }
};

/* ===================== GET RL BY ID ===================== */
export const getRSById = async (req, res) => {
  try {
    const { id } = req.params;

    const rsSection = await RS.findById(id)
      .populate("repeatSentenceQuestions");

    if (!rsSection) {
      return res.status(404).json({
        success: false,
        message: "Read Aloud section not found",
      });
    }

    res.status(200).json({
      success: true,
      data: rsSection,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch Read Aloud section",
    });
  }
};

/* ===================== UPDATE RL ===================== */
export const updateRS = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedRS = await RS.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true,
        runValidators: true, // 🔒 important
      }
    );

    if (!updatedRS) {
      return res.status(404).json({
        success: false,
        message: "Read Aloud section not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Read Aloud section updated successfully",
      data: updatedRS,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===================== DELETE RL (OPTIONAL) ===================== */
export const deleteRS = async (req, res) => {
  try {
    const { id } = req.params;

    const rs = await RS.findByIdAndDelete(id);

    if (!rs) {
      return res.status(404).json({
        success: false,
        message: "Read Aloud section not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Read Aloud section deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete Read Aloud section",
    });
  }
};
/* ===================== SUBMIT RS ===================== */
/* ===================== SUBMIT RS ===================== */
export const submitRS = async (req, res) => {
  try {
    const { testId, answers, userId } = req.body; 
    // answers: array of { questionId, ... }

    // Mock Scoring Logic
    let totalFluency = 0;
    let totalPronunciation = 0;
    const count = answers?.length || 0;

    const results = count > 0 ? answers.map(a => {
        // Random scores between 10 and 90 (PTE scale)
        const fluency = Math.floor(Math.random() * (90 - 40) + 40);
        const pronunciation = Math.floor(Math.random() * (90 - 40) + 40);
        
        totalFluency += fluency;
        totalPronunciation += pronunciation;

        return {
            questionId: a.questionId,
            questionType: "RS",
            fluencyScore: fluency,
            pronunciationScore: pronunciation,
            score: Math.round((fluency + pronunciation) / 2),
            userTranscript: "", // RS usually doesn't show transcript unless STT is used
            audioUrl: a.audioUrl
        };
    }) : [];

    const sectionScores = {
        fluency: count > 0 ? Math.round(totalFluency / count) : 0,
        pronunciation: count > 0 ? Math.round(totalPronunciation / count) : 0,
        content: 0
    };

    const overallScore = count > 0 ? Math.round((totalFluency + totalPronunciation) / (count * 2)) : 0;

    const resultData = {
        sectionScores,
        overallScore,
        questionResults: results
    };

    // SAVE TO DB
    // Assuming we use SpeakingResult for all speaking sub-tests
    // SAVE TO DB
    const speakingResult = new SpeakingResult({
        user: req.user?._id || req.user?.id || userId,
        testId: testId,
        testModel: 'RS', // Using 'RS' model
        overallScore,
        sectionScores,
        scores: results
    });

    await speakingResult.save();

    res.json({
        success: true,
        data: speakingResult
    });

  } catch (error) {
    console.error("Submit RS Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


export const getUnusedRepeatSentenceQuestions = async (req, res) => {
  try {
    const allRepeatQuestions = await RepeatQuestion.find({});
    const existingRSSections = await RS.find({});

    const usedRepeatQuestionIds = new Set();
    existingRSSections.forEach(section => {
      section.repeatSentenceQuestions.forEach(id => usedRepeatQuestionIds.add(id.toString()));
    });

    const unusedRepeatSentenceQuestions = allRepeatQuestions.filter(q =>
      !usedRepeatQuestionIds.has(q._id.toString())
    );

    res.status(200).json({
      success: true,
      data: {
        repeatSentence: unusedRepeatSentenceQuestions, // Key for frontend
      },
    });
  } catch (error) {
    console.error("Error fetching unused Repeat Sentence questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unused Repeat Sentence questions",
    });
  }
};