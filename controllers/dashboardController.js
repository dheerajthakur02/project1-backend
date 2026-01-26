import Link from "mongoose"; 
import Attempt from "../models/attempt.model.js"; // Read Aloud
import RepeatAttempt from "../models/attemptRepeat.model.js"; // Repeat Sentence
import { WriteFromDictationAttempt } from "../models/listening/WriteFromDictation.js";
import { AttemptReadingReorder } from "../models/attemptReadingReorder.model.js";
import FullMockTestResult from "../models/mocktest/FullMockTestResult.js";

import { RetellLectureAttempt } from "../models/retell.model.js"; // Retell Lecture
import { ShortAnswerAttempt } from "../models/shortAnswer.model.js"; // Answer Short Question
import { SummarizeWrittenAttempt } from "../models/writing/SummarizeText.js"; // Summarize Written Text
import { EssayAttempt } from "../models/writing/Essay.js"; // Essay
import { ImageAttempt } from "../models/image.model.js"; // Describe Image

import { AttemptReadingFIBDropdown } from "../models/attemptReadingFIBDropdown.model.js";
import { AttemptReadingFIBDragDrop } from "../models/attemptReadingFIBDragDrop.model.js";
import { AttemptReadingMultiChoiceMultiAnswer } from "../models/attemptReadingMultiChoiceMultiAnswer.model.js";
import { AttemptReadingMultiChoiceSingleAnswer } from "../models/attemptReadingMultiChoiceSingleAnswer.model.js";

// Models for Listening (assuming they follow similar pattern or checking file structure if needed, adding core ones found)
// If you need more listening models, import them here.


export const getDashboardData = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    // --- 1. Fetch History from various modules (Limit 5 each to keep it fast) ---
    // Helper for fetching
    const fetchRecent = (Model, sortKey = 'createdAt') => Model.find({ userId }).sort({ [sortKey]: -1 }).limit(5).lean();

    const [
        raAttempts, 
        rsAttempts, 
        wfdAttempts, 
        roAttempts,
        rlAttempts,
        asqAttempts,
        swtAttempts,
        essayAttempts,
        diAttempts,
        rfibdAttempts,
        rfibddAttempts,
        rmcmaAttempts,
        rmcsaAttempts
    ] = await Promise.all([
        Attempt.find({ userId }).sort({ date: -1 }).limit(5).lean(),
        RepeatAttempt.find({ userId }).sort({ date: -1 }).limit(5).lean(),
        WriteFromDictationAttempt.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),
        AttemptReadingReorder.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),
        
        fetchRecent(RetellLectureAttempt),
        fetchRecent(ShortAnswerAttempt),
        fetchRecent(SummarizeWrittenAttempt),
        fetchRecent(EssayAttempt),
        fetchRecent(ImageAttempt),
        
        fetchRecent(AttemptReadingFIBDropdown),
        fetchRecent(AttemptReadingFIBDragDrop),
        fetchRecent(AttemptReadingMultiChoiceMultiAnswer),
        fetchRecent(AttemptReadingMultiChoiceSingleAnswer)
    ]);

    // --- 2. Normalize Data ---
    const normalize = (item, type, label, scoreKey = 'score', dateKey = 'date') => ({
      id: item._id,
      date: item[dateKey] || item.createdAt, 
      type, 
      label, 
      score: item[scoreKey] || 0,
      totalQuestions: 1 
    });

    const normalizedHistory = [
        ...raAttempts.map(a => normalize(a, 'RA', 'Read Aloud')),
        ...rsAttempts.map(a => normalize(a, 'RS', 'Repeat Sentence')),
        ...wfdAttempts.map(a => normalize(a, 'WFD', 'Write From Dictation', 'totalScore', 'createdAt')),
        ...roAttempts.map(a => normalize(a, 'RO', 'Reorder Paragraphs', 'score', 'createdAt')),
        
        ...rlAttempts.map(a => normalize(a, 'RL', 'Retell Lecture', 'score', 'createdAt')),
        ...asqAttempts.map(a => normalize(a, 'ASQ', 'Answer Short Question', 'score', 'createdAt')),
        ...swtAttempts.map(a => normalize(a, 'SWT', 'Summarize Written Text', 'score', 'createdAt')),
        ...essayAttempts.map(a => normalize(a, 'WE', 'Write Essay', 'score', 'createdAt')),
        ...diAttempts.map(a => normalize(a, 'DI', 'Describe Image', 'score', 'createdAt')),

        ...rfibdAttempts.map(a => normalize(a, 'RFIB-D', 'Reading FIB Dropdown', 'score', 'createdAt')),
        ...rfibddAttempts.map(a => normalize(a, 'RFIB-DD', 'Reading FIB Drag & Drop', 'score', 'createdAt')),
        ...rmcmaAttempts.map(a => normalize(a, 'R-MCQ-M', 'Reading MCQ Multi', 'score', 'createdAt')),
        ...rmcsaAttempts.map(a => normalize(a, 'R-MCQ-S', 'Reading MCQ Single', 'score', 'createdAt')),
    ];

    // --- 3. Sort and Slice for Final History ---
    const history = normalizedHistory
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 50); // increased limit for 'View All' purposes

    // --- 4. Calculate Average Mock Score ---
    const mockResults = await FullMockTestResult.find({ 
        user: userId, 
        status: 'completed' 
    }).select('overallScore');

    let mockScore = 0;
    if (mockResults.length > 0) {
        const totalScore = mockResults.reduce((sum, r) => sum + (r.overallScore || 0), 0);
        mockScore = Math.round(totalScore / mockResults.length);
    }

    res.status(200).json({
      success: true,
      data: {
        history,
        mockScore
      }
    });

  } catch (error) {
    console.error("Dashboard Data Fetch Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch dashboard data" });
  }
};
