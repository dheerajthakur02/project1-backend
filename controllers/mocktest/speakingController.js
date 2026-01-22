import  Speaking, { SpeakingResult } from "../../models/mocktest/Speaking.js";


/**
 * ✅ CREATE SPEAKING SECTION
 */
export const createSpeaking = async (req, res) => {
  try {
    const {
      title,
      readAloudQuestions = [],
      repeatSentenceQuestions = [],
      describeImageQuestions = [],
      reTellLectureQuestions = [],
      summarizeSpokenTextQuestions = [],
      highlightIncorrectWordsQuestions = [],
    } = req.body;

    const speaking = new Speaking({
      title,
      readAloudQuestions,
      repeatSentenceQuestions,
      describeImageQuestions,
      reTellLectureQuestions,
      summarizeSpokenTextQuestions,
      highlightIncorrectWordsQuestions,
    });

    await speaking.save(); // 🔒 total <= 40 validated by schema

    res.status(201).json({
      success: true,
      message: "Speaking section created successfully",
      data: speaking,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


export const getAllSpeaking = async (req, res) => {
  try {
    const speakingSections = await Speaking.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: speakingSections.length,
      data: speakingSections,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch speaking sections",
    });
  }
};
export const getSpeakingById = async (req, res) => {
  try {
    const { id } = req.params;
    const speakingSection = await Speaking.findById(id)
      .populate("readAloudQuestions")
      .populate("repeatSentenceQuestions")
      .populate("describeImageQuestions")
      .populate("reTellLectureQuestions")
      .populate("summarizeSpokenTextQuestions")
      .populate("highlightIncorrectWordsQuestions");

    if (!speakingSection) {
      return res.status(404).json({
        success: false,
        message: "Speaking section not found",
      });
    }

    res.status(200).json({
      success: true,
      data: speakingSection,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch speaking section",
    });
  }
}

export const updateSpeaking = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedSpeaking = await Speaking.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true,
        runValidators: true, // 🔒 important
      }
    );

    if (!updatedSpeaking) {
      return res.status(404).json({
        success: false,
        message: "Speaking section not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Speaking section updated successfully",
      data: updatedSpeaking,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


// utils/scoringHelper.js

/**
 * Compares user transcript with original text and returns a score 0-90
 */
export const compareStrings = (original, transcript) => {
  if (!transcript) return 10; // Minimum PTE score is 10
  
  const origWords = original.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").split(" ");
  const userWords = transcript.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").split(" ");

  let matches = 0;
  origWords.forEach(word => {
    if (userWords.includes(word)) matches++;
  });

  const percentage = (matches / origWords.length) * 100;
  
  // Map percentage to PTE 10-90 scale
  const pteScore = Math.round((percentage / 100) * 80) + 10;
  return pteScore > 90 ? 90 : pteScore;
};

export const calculateSpeakingResult = async (req, res) => {
  try {
    const { userId, speakingTestId, answers } = req.body; 
    // 'answers' should be an array: [{ questionId, audioUrl, transcript }]

    const testData = await Speaking.findById(speakingTestId)
      .populate("readAloudQuestions")
      .populate("repeatSentenceQuestions");

    let totalContent = 0;
    let totalFluency = 0;
    let totalPronunciation = 0;
    let questionCount = answers.length;

    const detailedAnalysis = answers.map((answer) => {
      // Find the original question text for comparison
      // This is a simplified search across the arrays
      const question = [...testData.readAloudQuestions, ...testData.repeatSentenceQuestions]
        .find(q => q._id.toString() === answer.questionId);

      const originalText = question ? (question.text || question.content) : "";
      
      // Calculate Content Accuracy (0-90 scale)
      // compareStrings checks word match percentage
      const contentScore = compareStrings(originalText, answer.transcript);

      // AI Logic Simulation: Fluency & Pronunciation 
      // In a real app, these come from your Speech-to-Text AI confidence scores
      const fluencyScore = Math.floor(Math.random() * (90 - 60) + 60); 
      const pronunciationScore = Math.floor(Math.random() * (90 - 55) + 55);

      totalContent += contentScore;
      totalFluency += fluencyScore;
      totalPronunciation += pronunciationScore;

      return {
        questionId: answer.questionId,
        type: answer.type,
        score: Math.round((contentScore + fluencyScore + pronunciationScore) / 3),
        userTranscript: answer.transcript,
        audioUrl: answer.audioUrl
      };
    });

    const finalResult = new SpeakingResult({
      user: userId,
      speakingTestId,
      overallScore: Math.round((totalContent + totalFluency + totalPronunciation) / (questionCount * 3)),
      sectionScores: {
        content: Math.round(totalContent / questionCount),
        fluency: Math.round(totalFluency / questionCount),
        pronunciation: Math.round(totalPronunciation / questionCount)
      },
      detailedAnalysis
    });

    await finalResult.save();

    res.status(200).json({
      success: true,
      data: finalResult
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};