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
    
    // normalization helper
    const cleanText = (text) => text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").replace(/\s{2,}/g, " ").trim();
    
    const originalClean = cleanText(originalText);
    const transcriptClean = cleanText(transcript);
    
    const originalWords = originalClean.split(" ");
    const transcriptWords = transcriptClean.split(" ");

    // --- Enhanced Analysis Logic ---

    // 1. Word Analysis (Simple alignment)
    const wordAnalysis = originalWords.map(word => {
      // Check if word exists in transcript (simplistic check)
      // For more advanced, we would need sequence alignment (like Needleman-Wunsch) but this suffices for "simulated"
      const found = transcriptWords.includes(word);
      return {
        word: word,
        status: found ? 'good' : 'bad', // defaulting to binary for now, 'average' could be fuzzy match
        originalWord: word // keep case if we had it, but we cleaned it. using cleaned for now.
      };
    });

    // Re-map to original text casing for display if possible, or just use originalWords as reference
    // Better: Map against the original text split by space
    const originalTextSplit = originalText.split(/\s+/);
    const detailedWordAnalysis = originalTextSplit.map((origWord) => {
      const cleanOrig = cleanText(origWord);
      // specific check for this word in transcript
      const accuracy = stringSimilarity.findBestMatch(cleanOrig, transcriptWords);
      let status = 'bad';
      if (accuracy.bestMatch.rating > 0.8) status = 'good';
      else if (accuracy.bestMatch.rating > 0.5) status = 'average';
      
      return {
        word: origWord,
        status: status
      };
    });


    // 2. Statistics
    const goodCount = detailedWordAnalysis.filter(w => w.status === 'good').length;
    const averageCount = detailedWordAnalysis.filter(w => w.status === 'average').length;
    
    // Recalculate basic scores based on this better analysis
    const contentScore = Math.min(((goodCount + (averageCount * 0.5)) / originalWords.length) * 10, 10); // Max 10 (actually 5 in PTE usually, adjusting to 0-5 scale later if needed, but sticking to provided 0-10 or 0-30 logic)
    
    // Pronunciation (using string similarity as base)
    const similarity = stringSimilarity.compareTwoStrings(originalClean, transcriptClean);
    const pronunciationScore = Math.min(similarity * 10, 10);

    // Fluency (Length + Pause penalty simulation)
    // If transcript is too short => bad fluency
    const lengthRatio = Math.min(transcriptWords.length / originalWords.length, 1.5); // Cap at 1.5
    // Optimal is 1.0. 
    const fluencyPenalty = Math.abs(1 - lengthRatio) * 10;
    const fluencyScore = Math.max(10 - fluencyPenalty, 0);

    const totalScore = Math.min(contentScore + pronunciationScore + fluencyScore, 30); // Max 30

    // 3. AI Feedback Generation
    let feedback = [];
    if (totalScore > 25) feedback.push("Excellent work! Your reading was clear and fluent.");
    else if (totalScore > 15) feedback.push("Good effort. Keep practicing to improve flow and clarity.");
    else feedback.push("You might need more practice. Focus on saying each word clearly.");

    if (fluencyScore < 6) feedback.push("Try to speak at a steady pace without long pauses.");
    if (pronunciationScore < 6) feedback.push("Some words were hard to recognize. Check the red words below.");
    if (transcriptWords.length < originalWords.length * 0.5) feedback.push("It seems you missed a significant portion of the text.");

    const aiFeedbackString = feedback.join(" ");

    const attempt = await Attempt.create({
      paragraphId,
      transcript,
      score: textToFixed(totalScore),
      fluency: textToFixed(fluencyScore),
      content: textToFixed(contentScore),
      pronunciation: textToFixed(pronunciationScore),
      analysis: {
        similarity: similarity,
        matchedWords: goodCount,
        totalWords: originalWords.length
      },
      aiFeedback: aiFeedbackString,
      wordAnalysis: detailedWordAnalysis
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
