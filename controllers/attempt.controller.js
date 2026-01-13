import Attempt from "../models/attempt.model.js";
import ReadAloud from "../models/readAloud.model.js";
import stringSimilarity from "string-similarity";

export const createAttempt = async (req, res) => {
  try {
    const { paragraphId, transcript } = req.body;

    if (!paragraphId || transcript === undefined) {
      return res.status(400).json({
        success: false,
        message: "Paragraph ID and transcript are required",
      });
    }

    // Fetch the original paragraph
    const paragraph = await ReadAloud.findById(paragraphId);
    if (!paragraph) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    const originalText = paragraph.text;
    
    // normalization
    const cleanText = (text) => text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").replace(/\s{2,}/g, " ").trim();
    
    const originalClean = cleanText(originalText);
    const transcriptClean = cleanText(transcript);
    
    const originalWords = originalClean.split(" ");
    const transcriptWords = transcriptClean.split(" ");

    // 1. Pronunciation (0-10)
    // Using string-similarity to compare the raw strings (or cleaned strings)
    const similarity = stringSimilarity.compareTwoStrings(originalClean, transcriptClean);
    const pronunciationScore = Math.min(Math.max(similarity * 10, 0), 10);

    // 2. Content (0-10)
    // Count how many words from original are in transcript
    const matchedWords = originalWords.filter(w => transcriptWords.includes(w)).length;
    // prevent division by zero
    const totalWords = originalWords.length || 1; 
    const contentScore = Math.min((matchedWords / totalWords) * 10, 10);

    // 3. Fluency (0-10)
    // Simple heuristic: compare lengths. 
    // If length is very different, penalize.
    const lengthDiff = Math.abs(originalWords.length - transcriptWords.length);
    // If diff is 0, ratio is 1. If diff is equal to original length, ratio is 0.
    const fluencyRatio = Math.max(0, 1 - (lengthDiff / totalWords));
    const fluencyScore = fluencyRatio * 10;

    // Total Score (Max 30) (Assuming sum)
    const totalScore = pronunciationScore + contentScore + fluencyScore;

    const attempt = await Attempt.create({
      paragraphId,
      transcript,
      score: textToFixed(totalScore),
      fluency: textToFixed(fluencyScore),
      content: textToFixed(contentScore),
      pronunciation: textToFixed(pronunciationScore),
      analysis: {
        similarity: similarity,
        matchedWords: matchedWords,
        totalWords: totalWords
      }
    });

    res.status(201).json({
      success: true,
      data: attempt,
    });

  } catch (error) {
    console.error("Error creating attempt:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const textToFixed = (num) => parseFloat(num.toFixed(1));

export const getAttempts = async (req, res) => {
    try {
        const attempts = await Attempt.find().sort({ date: -1 });
        res.status(200).json({ success: true, data: attempts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
