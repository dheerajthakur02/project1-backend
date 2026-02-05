import Attempt from "../models/attempt.model.js";
import ReadAloud from "../models/readAloud.model.js";
import stringSimilarity from "string-similarity";
import mongoose from "mongoose";

const textToFixed = (num) => parseFloat(num.toFixed(1));

export const createAttempt = async (req, res) => {
  try {
    const { paragraphId, transcript } = req.body;
    const userId = req.user?.id;

    if (!paragraphId || transcript === undefined) {
      return res.status(400).json({
        success: false,
        message: "Paragraph ID and transcript are required",
      });
    }

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    // Fetch the original paragraph
    let paragraph;
    if (mongoose.Types.ObjectId.isValid(paragraphId)) {
      paragraph = await ReadAloud.findById(paragraphId);
    }

    if (!paragraph) {
      paragraph = await ReadAloud.findOne({ id: paragraphId });
    }

    if (!paragraph) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    const originalText = paragraph.text;

    // normalization helper
    const cleanText = (text) =>
      String(text || "")
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();

    const originalClean = cleanText(originalText);
    const transcriptClean = cleanText(transcript);

    const originalWords = originalClean ? originalClean.split(" ") : [];
    const transcriptWords = transcriptClean ? transcriptClean.split(" ") : [];

    // --- Enhanced Analysis Logic ---

    // Better word-by-word analysis (with fuzzy match)
    const originalTextSplit = String(originalText || "").split(/\s+/);
    const detailedWordAnalysis = originalTextSplit.map((origWord) => {
      const cleanOrig = cleanText(origWord);

      // handle empty word cases safely
      if (!cleanOrig) {
        return { word: origWord, status: "average" };
      }

      const accuracy = stringSimilarity.findBestMatch(
        cleanOrig,
        transcriptWords.length ? transcriptWords : [""]
      );

      let status = "bad";
      if (accuracy.bestMatch.rating > 0.8) status = "good";
      else if (accuracy.bestMatch.rating > 0.5) status = "average";

      return {
        word: origWord,
        status,
      };
    });

    // 2. Statistics
    const goodCount = detailedWordAnalysis.filter(
      (w) => w.status === "good"
    ).length;
    const averageCount = detailedWordAnalysis.filter(
      (w) => w.status === "average"
    ).length;

    // ✅ CONTENT: MAX 5
    const contentScore = Math.min(
      ((goodCount + averageCount * 0.5) / Math.max(originalWords.length, 1)) *
        5,
      5
    );

    // ✅ PRONUNCIATION: MAX 5 (based on similarity)
    const similarity = stringSimilarity.compareTwoStrings(
      originalClean,
      transcriptClean
    );
    const pronunciationScore = Math.min(similarity * 5, 5);

    // ✅ ORAL FLUENCY: MAX 5 (length ratio penalty)
    const lengthRatio = Math.min(
      transcriptWords.length / Math.max(originalWords.length, 1),
      1.5
    );
    const fluencyPenalty = Math.abs(1 - lengthRatio) * 5;
    const fluencyScore = Math.max(5 - fluencyPenalty, 0);

    // ✅ TOTAL: MAX 15
    const totalScore = Math.min(
      contentScore + pronunciationScore + fluencyScore,
      15
    );

    // 3. AI Feedback Generation (updated for 15 max)
    let feedback = [];
    if (totalScore > 12.5)
      feedback.push("Excellent work! Your reading was clear and fluent.");
    else if (totalScore > 7.5)
      feedback.push(
        "Good effort. Keep practicing to improve flow and clarity."
      );
    else
      feedback.push(
        "You might need more practice. Focus on saying each word clearly."
      );

    if (fluencyScore < 3)
      feedback.push("Try to speak at a steady pace without long pauses.");
    if (pronunciationScore < 3)
      feedback.push(
        "Some words were hard to recognize. Check the red words below."
      );
    if (transcriptWords.length < originalWords.length * 0.5)
      feedback.push("It seems you missed a significant portion of the text.");

    const aiFeedbackString = feedback.join(" ");

    const attempt = await Attempt.create({
      paragraphId: paragraph._id,
      userId,
      transcript,
      score: textToFixed(totalScore),
      fluency: textToFixed(fluencyScore),
      content: textToFixed(contentScore),
      pronunciation: textToFixed(pronunciationScore),
      analysis: {
        similarity: similarity,
        matchedWords: goodCount,
        totalWords: originalWords.length,
      },
      aiFeedback: aiFeedbackString,
      wordAnalysis: detailedWordAnalysis,
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

export const getAttempts = async (req, res) => {
  try {
    const { paragraphId } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    const query = { userId };

    if (paragraphId) {
      let pId = paragraphId;
      if (!mongoose.Types.ObjectId.isValid(paragraphId)) {
        const p = await ReadAloud.findOne({ id: paragraphId });
        if (p) pId = p._id;
      }
      query.paragraphId = pId;
    }

    const attempts = await Attempt.find(query)
      .sort({ date: -1 })
      .populate("userId", "name email");

    res.status(200).json({ success: true, data: attempts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const getAttemptsforCommunity = async (req, res) => {
  try {
    const { paragraphId } = req.params;

    if (!paragraphId) {
      return res.status(400).json({
        success: false,
        message: "paragraphId is required",
      });
    }

    let pId;

    // Handle ObjectId or custom id
    if (mongoose.Types.ObjectId.isValid(paragraphId)) {
      pId = new mongoose.Types.ObjectId(paragraphId);
    } else {
      const paragraph = await ReadAloud.findOne({ id: paragraphId });
      if (!paragraph) {
        return res.status(404).json({
          success: false,
          message: "Paragraph not found",
        });
      }
      pId = paragraph._id;
    }

    const data = await Attempt.aggregate([
      /* ---------------- MATCH PARAGRAPH ---------------- */
      {
        $match: {
          paragraphId: pId,
        },
      },

      /* ---------------- SORT LATEST FIRST ---------------- */
      {
        $sort: { date: -1 },
      },

      /* ---------------- GROUP BY USER ---------------- */
      {
        $group: {
          _id: "$userId",
          attempts: { $push: "$$ROOT" },
        },
      },

      /* ---------------- LIMIT TO 15 ATTEMPTS ---------------- */
      {
        $project: {
          userId: "$_id",
          attempts: { $slice: ["$attempts", 15] },
          _id: 0,
        },
      },

      /* ---------------- POPULATE USER ---------------- */
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },

      /* ---------------- OPTIONAL: SORT USERS BY LATEST ATTEMPT ---------------- */
      {
        $sort: {
          "attempts.0.date": -1,
        },
      },

      /* ---------------- FINAL SHAPE ---------------- */
      {
        $project: {
          userId: 1,
          "user.name": 1,
          "user.email": 1,
          "user.avatar": 1,
          attempts: {
            transcript: 1,
            score: 1,
            fluency: 1,
            content: 1,
            pronunciation: 1,
            analysis: 1,
            aiFeedback: 1,
            wordAnalysis: 1,
            date: 1,
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Community Attempts Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const saveAttempt = async (req, res) => {
  try {
   
    const response = await Attempt.create(req.body);


    return res.status(201).json({
      success: true,
      message: "Attempt saved successfully",
      data: response,
    });
  } catch (error) {
    console.error("Error saving attempt:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save attempt",
      error: error.message,
    });
  }
};



