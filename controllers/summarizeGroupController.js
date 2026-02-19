import {cloudinary} from "../config/cloudinary.js";
import {SummarizeGroupAttempt, SummarizeGroupQuestion } from "../models/summarizeGroup.model.js";
import mongoose from "mongoose";
import stringSimilarity from "string-similarity";

// Upload Question
export const addQuestion = async (req, res) => {
  const { title, prepareTime, answerTime, answer, transcript, isPredictive } = req.body;

  const audio = await cloudinary.uploader.upload(req.file.path, {
    resource_type: "video"
  });

  const question = await SummarizeGroupQuestion.create({
    title,
    prepareTime,
    answerTime,
    answer,
    transcript,
    transcript,
    audioUrl: audio?.secure_url,
    cloudinaryId: audio?.public_id,
    difficulty: req.body.difficulty || "Medium",
    isPredictive: isPredictive || false
  });

  res.json(question);
};



export const getQuestionsWithAttempts = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const questions = await SummarizeGroupQuestion.aggregate([
      /* ================= TOTAL ATTEMPT COUNT ================= */
      {
        $lookup: {
          from: SummarizeGroupAttempt.collection.name,
          let: { qId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$questionId", "$$qId"] },
                    { $eq: ["$userId", userObjectId] },
                  ],
                },
              },
            },
            { $count: "count" },
          ],
          as: "attemptCountArr",
        },
      },

      /* ================= LAST 10 ATTEMPTS ================= */
      {
        $lookup: {
          from: SummarizeGroupAttempt.collection.name,
          let: { qId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$questionId", "$$qId"] },
                    { $eq: ["$userId", userObjectId] },
                  ],
                },
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 10 },
            {
              $project: {
                score: 1,
                content: 1,
                fluency: 1,
                pronunciation: 1,
                createdAt: 1,
                studentAudio: 1,
              },
            },
          ],
          as: "lastAttempts",
        },
      },

      /* ================= FINAL SHAPE ================= */
      {
        $addFields: {
          attemptCount: {
            $ifNull: [{ $arrayElemAt: ["$attemptCountArr.count", 0] }, 0],
          },
          isAttempted: {
            $gt: [
              { $ifNull: [{ $arrayElemAt: ["$attemptCountArr.count", 0] }, 0] },
              0,
            ],
          },
        },
      },

      {
        $project: {
          attemptCountArr: 0,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: questions,
    });

  } catch (error) {
    console.error("Get Questions Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

import User from "../models/user.model.js";
export const getCommunitySummarizeGroupAttemptsByQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;

    /* ---------------- VALIDATE questionId ---------------- */
    if (!questionId || !mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({
        success: false,
        message: "Valid questionId is required",
      });
    }

    const qId = new mongoose.Types.ObjectId(questionId);

    const attempts = await SummarizeGroupAttempt.aggregate([
      /* ---------------- MATCH QUESTION ---------------- */
      { $match: { questionId: qId } },

      /* ---------------- SORT LATEST FIRST ---------------- */
      { $sort: { createdAt: -1 } },

      /* ---------------- GROUP BY USER → COLLECT ALL ATTEMPTS ---------------- */
      {
        $group: {
          _id: "$userId",
          attempts: { $push: "$$ROOT" }, // push all attempts into an array
        },
      },

      /* ---------------- KEEP UP TO 15 ATTEMPTS PER USER ---------------- */
      {
        $project: {
          attempts: { $slice: ["$attempts", 15] }, // max 15 attempts per user
        },
      },

      /* ---------------- FLATTEN ARRAY BACK TO DOCUMENTS ---------------- */
      { $unwind: "$attempts" },
      { $replaceRoot: { newRoot: "$attempts" } },

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

      /* ---------------- FINAL PROJECTION ---------------- */
      {
        $project: {
          userId: 1,
          "user.name": 1,
          score: 1,
          content: 1,
          fluency: 1,
          pronunciation: 1,
          studentAudio: 1,
          createdAt: 1,
        },
      },

      /* ---------------- LIMIT TOTAL FOR UI ---------------- */
      { $limit: 300 }, // e.g., 20 users × 15 attempts = 300 max
    ]);

    return res.status(200).json({
      success: true,
      count: attempts.length,
      data: attempts,
    });
  } catch (error) {
    console.error("Community Summarize Group Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await SummarizeGroupQuestion.findById(id);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    const title = req.body?.title;
    const prepareTime = req.body?.prepareTime;
    const answerTime = req.body?.answerTime;
    const transcript = req.body?.transcript;
    const isPredictive = req.body?.isPredictive

    // If new audio uploaded
    if (req.file) {
    //   // Delete old audio
      await cloudinary.uploader.destroy(question.cloudinaryId, {
        resource_type: "video"
      });

      // Upload new audio
      const uploaded = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "video"
      });

      question.audioUrl = uploaded.secure_url;
      question.cloudinaryId = uploaded.public_id;
    }

    // Update text fields only if sent
    if (title !== undefined) question.title = title;
    if (prepareTime !== undefined) question.prepareTime = prepareTime;
    if (answerTime !== undefined) question.answerTime = answerTime;
    if (transcript !== undefined) question.transcript = transcript;
    if (isPredictive !== undefined) question.isPredictive = isPredictive;

    await question.save();

    res.json(question);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// Delete question
export const deleteQuestion = async (req, res) => {
  const q = await SummarizeGroupQuestion.findById(req.params.id);
  await cloudinary.uploader.destroy(q.cloudinaryId, { resource_type: "video" });
  await q.deleteOne();
  res.json({ message: "Deleted" });
};

// Helper function to define common stop words
const getStopWords = () => new Set([
    'a', 'an', 'the', 'is', 'am', 'are', 'was', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'into', 'of', 'on', 'to', 'with',
    'and', 'or', 'but', 'not', 'no', 'this', 'that', 'these', 'those', 'it', 'its', 'he', 'she', 'they', 'we', 'you', 'your',
    'his', 'her', 'their', 'our', 'my', 'me', 'him', 'us', 'them', 'who', 'what', 'where', 'when', 'why', 'how', 'which', 'whom',
    'if', 'then', 'else', 'up', 'down', 'out', 'off', 'on', 'about', 'above', 'below', 'between', 'before', 'after', 'during',
    'through', 'under', 'over', 'around', 'each', 'every', 'some', 'any', 'all', 'few', 'many', 'more', 'most', 'other', 'such',
    'only', 'own', 'same', 'so', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'there', 'here',
    'also', 'much', 'about', 'against', 'among', 'amongst', 'cant', 'could', 'had', 'has', 'have', 'like', 'must', 'per', 'than',
    'until', 'upon', 'would', 'shall', 'may', 'might', 'must', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
    'nine', 'ten', 'zero', 'said', 'say', 'says'
]);


export const createSummarizeGroupAttempt = async (req, res) => {
    try {
        let { questionId, userId, transcript } = req.body;

        /* ---------------- VALIDATE & CAST userId ---------------- */
        if (!userId) return res.status(400).json({ success: false, message: "userId is required" });
        if (typeof userId !== 'string' || !mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ success: false, message: "Invalid userId format" });
        userId = new mongoose.Types.ObjectId(userId);

        /* ---------------- VALIDATE & CAST questionId ---------------- */
        if (!questionId) return res.status(400).json({ success: false, message: "questionId is required" });
        if (typeof questionId !== 'string' || !mongoose.Types.ObjectId.isValid(questionId)) return res.status(400).json({ success: false, message: "Invalid questionId format" });
        questionId = new mongoose.Types.ObjectId(questionId);

        /* ---------------- VALIDATE AUDIO ---------------- */
        if (!req.file) return res.status(400).json({ success: false, message: "Audio recording is required" });

        /* ---------------- FETCH QUESTION ---------------- */
        const question = await SummarizeGroupQuestion.findById(questionId);
        if (!question) return res.status(404).json({ success: false, message: "Question not found" });

        const referenceText = question.answer;
        if (!referenceText) return res.status(500).json({ success: false, message: "Question reference answer is missing" });

        /* ---------------- NORMALIZATION ---------------- */
        const cleanText = (text) =>
            (text || "")
                .toLowerCase()
                .replace(/[.,\/#!$%^&*;:{}=\-_`~()]/g, "")
                .trim();

        const studentClean = cleanText(transcript);
        const referenceClean = cleanText(referenceText);

        const studentWordsRaw = studentClean.split(/\s+/).filter(Boolean);
        const referenceWordsRaw = referenceClean.split(/\s+/).filter(Boolean);

        const stopWords = getStopWords();

        // Filter out stop words for keyword-based matching
        const referenceKeywords = referenceWordsRaw.filter(word => word.length > 2 && !stopWords.has(word));
        const studentKeywords = studentWordsRaw.filter(word => word.length > 2 && !stopWords.has(word));

        /* ---------------- ADVANCED WORD & KEYWORD ANALYSIS ---------------- */
        const wordAnalysis = []; // Stores detailed word-by-word feedback for UI
        let matchedKeywordsCount = 0; // For Content Score
        const matchedReferenceWordsIndices = new Set(); // To track which reference words were matched
        const usedStudentWordsIndices = new Set(); // To track which student words were used for matching

        // Phase 1: Direct Word-by-Word Matching (with window) for detailed feedback
        referenceWordsRaw.forEach((refWord, refIndex) => {
            let foundMatch = false;
            // Search window: 3 words before, 5 words after current reference word index
            const searchStart = Math.max(0, refIndex - 3);
            const searchEnd = Math.min(studentWordsRaw.length, refIndex + 5);

            for (let i = searchStart; i < searchEnd; i++) {
                if (usedStudentWordsIndices.has(i)) continue; // Skip already used student words

                const studentWord = studentWordsRaw[i];
                if (studentWord && stringSimilarity.compareTwoStrings(refWord, studentWord) > 0.8) {
                    wordAnalysis.push({ word: refWord, status: "correct", studentMatch: studentWord, matchedByIndex: i });
                    matchedReferenceWordsIndices.add(refIndex);
                    usedStudentWordsIndices.add(i);
                    foundMatch = true;
                    break;
                }
            }
            if (!foundMatch) {
                wordAnalysis.push({ word: refWord, status: "missing" });
            }
        });

        // Phase 2: Keyword Coverage for Content Score (less strict, presence-based)
        // This ensures main ideas are captured even if exact phrasing is different.
        const tempStudentKeywords = [...studentKeywords]; // Copy to modify
        referenceKeywords.forEach(refKeyword => {
            let keywordFound = false;
            for (let i = 0; i < tempStudentKeywords.length; i++) {
                if (tempStudentKeywords[i] && stringSimilarity.compareTwoStrings(refKeyword, tempStudentKeywords[i]) > 0.7) { // Lower similarity for keyword presence
                    matchedKeywordsCount++;
                    tempStudentKeywords[i] = null; // Mark as used
                    keywordFound = true;
                    break;
                }
            }
        });

        // Phase 3: Identify 'extra' words in student's transcript for UI feedback
        // This can be simplified or made more robust if needed.
        // For simplicity, we'll just mark words not matched in Phase 1 as extra.
        studentWordsRaw.forEach((studentWord, index) => {
            if (!usedStudentWordsIndices.has(index)) {
                // Check if this extra word is a meaningful keyword or just filler
                const isMeaningfulExtra = studentKeywords.includes(studentWord); // A rough check
                wordAnalysis.push({ word: studentWord, status: isMeaningfulExtra ? "extra_meaningful" : "extra_filler", originalIndex: index });
            }
        });


        /* ---------------- SCORING (Content, Pronunciation, Fluency - Max 5 each) ---------------- */
        const totalReferenceKeywords = referenceKeywords.length || 1;
        const totalStudentWordsInTranscript = studentWordsRaw.length || 1; // Used for fluency comparison

        // --- CONTENT SCORE (max 5) ---
        // Now based on keyword coverage, which is more forgiving for summaries
        const keywordCoverageRatio = matchedKeywordsCount / totalReferenceKeywords;
        let contentScore = 0;
        if (keywordCoverageRatio >= 0.9) contentScore = 6;
        else if (keywordCoverageRatio >= 0.75) contentScore = 5;
        else if (keywordCoverageRatio >= 0.5) contentScore = 4;
        else if (keywordCoverageRatio >= 0.3) contentScore = 3;
        else if (keywordCoverageRatio > 0) contentScore = 1;

        // --- PRONUNCIATION SCORE (max 5) ---
        // Use overall transcript similarity, as it correlates with clarity.
        const overallTranscriptSimilarity = stringSimilarity.compareTwoStrings(referenceClean, studentClean);
        let pronunciationScore = overallTranscriptSimilarity * 5;
        pronunciationScore = Math.max(0, Math.min(5, pronunciationScore));

        // --- FLUENCY SCORE (max 5) ---
        // Compare the length of the student's *actual* spoken words (minus stop words)
        // to the significant words in the reference.
        const effectiveStudentWordsCount = studentKeywords.length;
        const effectiveReferenceWordsCount = referenceKeywords.length;

        const lengthRatio = effectiveReferenceWordsCount > 0 ? effectiveStudentWordsCount / effectiveReferenceWordsCount : 0;
        let fluencyScore = 0;
        if (lengthRatio >= 0.8 && lengthRatio <= 1.2) fluencyScore = 5;
        else if (lengthRatio >= 0.6 && lengthRatio <= 1.4) fluencyScore = 4;
        else if (lengthRatio >= 0.4 && lengthRatio <= 1.6) fluencyScore = 3;
        else fluencyScore = 2;
        fluencyScore = Math.max(0, Math.min(5, fluencyScore));

        // --- TOTAL SCORE ---
        const totalScore = contentScore + pronunciationScore + fluencyScore;

        /* ---------------- SAVE ATTEMPT ---------------- */
        const attempt = await SummarizeGroupAttempt.create({
            questionId,
            userId,
            studentAudio: {
                public_id: req.file.filename,
                url: req.file.path
            },
            transcript: transcript || "",
            score: parseFloat(totalScore.toFixed(1)),
            content: parseFloat(contentScore.toFixed(1)),
            pronunciation: parseFloat(pronunciationScore.toFixed(1)),
            fluency: parseFloat(fluencyScore.toFixed(1)),
            wordAnalysis // Detailed analysis for UI feedback
        });

        return res.status(201).json({
            success: true,
            data: attempt
        });

    } catch (error) {
        console.error("CREATE ATTEMPT ERROR:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "An internal server error occurred"
        });
    }
};

export const saveAttempt = async (req, res) => {
  try {
   
    const response = await SummarizeGroupAttempt.create(req.body);


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