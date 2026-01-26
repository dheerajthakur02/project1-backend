import Attempt from "../models/attempt.model.js"; // Read Aloud
import { WriteFromDictationAttempt } from "../models/listening/WriteFromDictation.js";
import { AttemptReadingReorder } from "../models/attemptReadingReorder.model.js";
// Add other models as we identify them, for now focusing on these 3 as examples + placeholders for others
import mongoose from "mongoose";

export const getDashboardData = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    // 1. Fetch recent attempts from various collections
    // We limit to 5 per type to avoid over-fetching, then will sort and take top 10 globally.
    
    // Read Aloud (RA) & Repeat Sentence (often in same Attempt model?? No, Attempt is RA usually)
    // Based on previous inspections, 'Attempt' seems to be RA.
    const raAttempts = await Attempt.find({ userId })
      .sort({ date: -1 })
      .limit(5)
      .lean();

    // Write From Dictation (WFD)
    const wfdAttempts = await WriteFromDictationAttempt.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Reading Reorder (RO)
    const roAttempts = await AttemptReadingReorder.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // 2. Normalizing Data Structure
    const normalize = (item, type, label, score) => ({
      id: item._id,
      date: item.date || item.createdAt, // Handle key difference
      type, // 'RA', 'WFD', 'RO'
      label, // 'Read Aloud', 'Write From Dictation', etc.
      score: score || 0,
      totalQuestions: 1 // usually 1 per attempt record
    });

    const normalizedRA = raAttempts.map(a => normalize(a, 'RA', 'Read Aloud', a.score));
    const normalizedWFD = wfdAttempts.map(a => normalize(a, 'WFD', 'Write From Dictation', a.totalScore));
    const normalizedRO = roAttempts.map(a => normalize(a, 'RO', 'Reorder Paragraphs', a.score));

    // 3. Merge and Sort
    const allHistory = [...normalizedRA, ...normalizedWFD, ...normalizedRO]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    // 4. Mock Test Score (Placeholder for now, or fetch if model exists)
    // Assuming 0 or calculating average if we had a MockTestResult model
    const mockScore = 0; 

    res.status(200).json({
      success: true,
      data: {
        history: allHistory,
        mockScore
      }
    });

  } catch (error) {
    console.error("Dashboard Data Fetch Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch dashboard data" });
  }
};
