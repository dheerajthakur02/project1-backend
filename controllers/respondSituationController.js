// controllers/respondSituation.controller.js
import mongoose from "mongoose";
import { cloudinary } from "../config/cloudinary.js";
import stringSimilarity from "string-similarity";
import fs from "fs";
import { createClient } from "@deepgram/sdk";
import dotenv from "dotenv";

import {
  RespondSituationQuestion,
  RespondSituationAttempt,
} from "../models/respondSituation.model.js";

dotenv.config();
const deepgram = createClient(process.env.API_KEY);

/* ================================
   ADD QUESTION
================================ */
export const addRespondSituationQuestion = async (req, res) => {
  try {
    const { title, prepareTime, answerTime, difficulty, answer, keywords, modelAnswer, isPredictive } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Audio file is required" });
    }

    // Upload audio to Cloudinary
    const audio = await cloudinary.uploader.upload(req.file.path, { resource_type: "video" });

   // Auto-transcription using Deepgram
    const audioBuffer = fs.readFileSync(req.file.path);
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(audioBuffer, {
      smart_format: true,
      model: "nova-2",
      language: "en-US",
    });
    if (error) throw error;

    const transcript = result.results.channels[0].alternatives[0].transcript;

    // Save question
    const question = await RespondSituationQuestion.create({
      title,
      audioUrl: audio?.secure_url,
      cloudinaryId: audio?.public_id,
      transcript: transcript,
      prepareTime: prepareTime || 10,
      answerTime: answerTime || 40,
      difficulty: difficulty || "Medium",
      answer,
      keywords: keywords ? JSON.parse(keywords) : [],
      modelAnswer: modelAnswer || "",
      isPredictive
    });

    res.status(201).json({ success: true, data: question });

  } catch (error) {
    console.error("ADD RESPOND SITUATION QUESTION ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================================
   UPDATE QUESTION
================================ */
export const updateRespondSituationQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await RespondSituationQuestion.findById(id);
    if (!question) return res.status(404).json({ message: "Question not found" });

    const { title, prepareTime, answerTime, difficulty, answer, keywords, modelAnswer, isPredictive } = req.body;

    // AUDIO UPDATE
    if (req.file) {
      if (question.cloudinaryId) {
        await cloudinary.uploader.destroy(question.cloudinaryId, { resource_type: "video" });
      }
      const uploaded = await cloudinary.uploader.upload(req.file.path, { resource_type: "video" });
      question.audioUrl = uploaded.secure_url;
      question.cloudinaryId = uploaded.public_id;

      const audioBuffer = fs.readFileSync(req.file.path);
      const { result, error } = await deepgram.listen.prerecorded.transcribeFile(audioBuffer, {
        smart_format: true,
        model: "nova-2",
        language: "en-US",
      });
      if (error) throw error;
      question.transcript = result.results.channels[0].alternatives[0].transcript;
    }

    // FIELD UPDATES
    if (title !== undefined) question.title = title;
    if (prepareTime !== undefined) question.prepareTime = prepareTime;
    if (answerTime !== undefined) question.answerTime = answerTime;
    if (difficulty !== undefined) question.difficulty = difficulty;
    if (answer !== undefined) question.answer = answer;
    if (keywords !== undefined) question.keywords = Array.isArray(keywords) ? keywords : JSON.parse(keywords);
    if (modelAnswer !== undefined) question.modelAnswer = modelAnswer;
    if(isPredictive!== undefined)  question.isPredictive =isPredictive;
    await question.save();
    res.json({ success: true, data: question });

  } catch (error) {
    console.error("UPDATE RESPOND SITUATION QUESTION ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================================
   GET QUESTIONS WITH USER ATTEMPTS
================================ */
export const getRespondSituationQuestionsWithAttempts = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const questions = await RespondSituationQuestion.aggregate([
      {
        $lookup: {
          from: "respondsituationattempts",
          let: { qId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$questionId", "$$qId"] },
                    { $eq: ["$userId", userObjectId] }
                  ]
                }
              }
            },
            { $count: "count" }
          ],
          as: "attemptCountArr"
        }
      },
      {
        $lookup: {
          from: "respondsituationattempts",
          let: { qId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$questionId", "$$qId"] },
                    { $eq: ["$userId", userObjectId] }
                  ]
                }
              }
            },
            { $sort: { createdAt: -1 } },
            { $limit: 10 },
            {
              $project: {
                score: 1,
                content: 1,
                fluency: 1,
                pronunciation: 1,
                transcript: 1,
                createdAt: 1,
                studentAudio: 1,
                wordAnalysis: 1
              }
            }
          ],
          as: "lastAttempts"
        }
      },
      {
        $addFields: {
          attemptCount: {
            $ifNull: [{ $arrayElemAt: ["$attemptCountArr.count", 0] }, 0]
          },
          isAttempted: {
            $gt: [
              { $ifNull: [{ $arrayElemAt: ["$attemptCountArr.count", 0] }, 0] },
              0
            ]
          }
        }
      },
      { $project: { attemptCountArr: 0 } }
    ]);

    res.json({ success: true, data: questions });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


import User from "../models/user.model.js";

export const getCommunityRespondSituationAttemptsByQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;

    /* ---------------- VALIDATE questionId ---------------- */
    if (!questionId || !mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({
        success: false,
        message: "Valid questionId is required"
      });
    }

    const qId = new mongoose.Types.ObjectId(questionId);

    const attempts = await RespondSituationAttempt.aggregate([
      /* ---------------- MATCH QUESTION ---------------- */
      { $match: { questionId: qId } },

      /* ---------------- SORT LATEST FIRST ---------------- */
      { $sort: { createdAt: -1 } },

      /* ---------------- GROUP BY USER → COLLECT ALL ATTEMPTS ---------------- */
      {
        $group: {
          _id: "$userId",
          attempts: { $push: "$$ROOT" } // push all attempts into an array
        }
      },

      /* ---------------- KEEP UP TO 15 ATTEMPTS PER USER ---------------- */
      {
        $project: {
          attempts: { $slice: ["$attempts", 15] } // max 15 attempts per user
        }
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
          as: "user"
        }
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true
        }
      },

      /* ---------------- FINAL RESPONSE ---------------- */
      {
        $project: {
          userId: 1,
          "user.name": 1,
          score: 1,
          content: 1,
          transcript: 1,
          fluency: 1,
          pronunciation: 1,
          wordAnalysis: 1,
          studentAudio: 1,
          createdAt: 1
        }
      },

      /* ---------------- LIMIT TOTAL FOR UI ---------------- */
      { $limit: 300 } // e.g., 20 users × 15 attempts = max 300
    ]);

    return res.status(200).json({
      success: true,
      count: attempts.length,
      data: attempts
    });

  } catch (error) {
    console.error("COMMUNITY RESPOND SITUATION ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


export const deleteRespondSituationQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await RespondSituationQuestion.findById(id);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    // Remove audio from Cloudinary
    if (question.cloudinaryId) {
      await cloudinary.uploader.destroy(
        question.cloudinaryId,
        { resource_type: "video" }
      );
    }

    await RespondSituationQuestion.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "RTS question deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


/* ================================
   CREATE ATTEMPT
================================ */

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

// Helper to generate n-grams from a list of words
const generateNGrams = (words, n) => {
    const ngrams = [];
    if (words.length < n) return ngrams;
    for (let i = 0; i <= words.length - n; i++) {
        ngrams.push(words.slice(i, i + n).join(' '));
    }
    return ngrams;
};

export const createRespondSituationAttempt = async (req, res) => {
    try {
        let { questionId, userId, transcript } = req.body;

        if (!req.file) return res.status(400).json({ message: "Audio is required" });

        // Validate and cast userId
        if (!userId || typeof userId !== 'string' || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Invalid userId" });
        }
        userId = new mongoose.Types.ObjectId(userId);

        // Validate and cast questionId
        if (!questionId || typeof questionId !== 'string' || !mongoose.Types.ObjectId.isValid(questionId)) {
            return res.status(400).json({ success: false, message: "Invalid questionId" });
        }
        questionId = new mongoose.Types.ObjectId(questionId);

        const question = await RespondSituationQuestion.findById(questionId);
        if (!question) return res.status(404).json({ message: "Question not found" });

        const referenceText = question.answer;
        const referenceTranscriptForPronunciation = question.transcript || question.answer; // Use `transcript` if available, else `answer`

        /* ---------------- NORMALIZATION ---------------- */
        const cleanText = (text) =>
            (text || "")
                .toLowerCase()
                .replace(/[.,\/#!$%^&\*;:{}=\-_`~()]/g, "")
                .replace(/\s{2,}/g, ' ') // Replace multiple spaces with a single space
                .trim();

        const studentClean = cleanText(transcript);
        const referenceClean = cleanText(referenceText);
        const pronunciationReferenceClean = cleanText(referenceTranscriptForPronunciation);


        const studentWordsRaw = studentClean.split(/\s+/).filter(Boolean);
        const referenceWordsRaw = referenceClean.split(/\s+/).filter(Boolean);

        const stopWords = getStopWords();

        // Content Words (filtered stop words and short words) for Content Score
        const referenceContentWords = referenceWordsRaw.filter(word => word.length > 2 && !stopWords.has(word));
        const studentContentWords = studentWordsRaw.filter(word => word.length > 2 && !stopWords.has(word));

        /* ---------------- ADVANCED WORD & KEYWORD ANALYSIS ---------------- */
        const wordAnalysis = []; // Stores detailed word-by-word feedback for UI
        const usedStudentWordsIndicesForWordAnalysis = new Set(); // Track student words used for Phase 1 UI feedback

        // --- Phase 1: Detailed Word-by-Word Matching (with window) for UI Feedback ---
        // This generates 'correct', 'missing' statuses for direct visual feedback.
        // It's lenient to give visual cues even for partial matches.
        referenceWordsRaw.forEach((refWord, refIndex) => {
            let foundMatch = false;
            // Search window: 3 words before, 5 words after current reference word index
            const searchStart = Math.max(0, refIndex - 3);
            const searchEnd = Math.min(studentWordsRaw.length, refIndex + 5);

            for (let i = searchStart; i < searchEnd; i++) {
                if (usedStudentWordsIndicesForWordAnalysis.has(i)) continue; // Skip already used student words

                const studentWord = studentWordsRaw[i];
                // Lower similarity threshold for UI feedback to be more forgiving
                if (studentWord && stringSimilarity.compareTwoStrings(refWord, studentWord) > 0.6) {
                    wordAnalysis.push({ word: refWord, status: "correct", studentMatch: studentWord, matchedByIndex: i });
                    usedStudentWordsIndicesForWordAnalysis.add(i);
                    foundMatch = true;
                    break;
                }
            }
            if (!foundMatch) {
                wordAnalysis.push({ word: refWord, status: "missing" });
            }
        });

        // --- Phase 2: N-Gram / Phrase Matching for a more robust Content Score ---
        // Identify key multi-word phrases and individual keywords from the reference answer.
        const reference3Grams = generateNGrams(referenceContentWords, 3);
        const reference2Grams = generateNGrams(referenceContentWords, 2);
        const uniqueReferenceKeywords = [...new Set(referenceContentWords)]; // Ensure unique single words

        const allReferenceContentUnits = [
            ...reference3Grams,
            ...reference2Grams,
            ...uniqueReferenceKeywords
        ];

        let contentUnitsMatched = new Set(); // To store matched phrases/words to avoid double counting
        const tempStudentContentWords = [...studentContentWords]; // Copy for mutable usage

        // Function to find matches for a given content unit (n-gram or single word)
        const findAndMarkMatch = (unit, studentWordsArray, similarityThreshold) => {
            const unitWords = unit.split(' ');
            if (unitWords.length === 1) { // Single word matching
                 for (let i = 0; i < studentWordsArray.length; i++) {
                    if (studentWordsArray[i] && stringSimilarity.compareTwoStrings(unit, studentWordsArray[i]) > similarityThreshold) {
                        studentWordsArray[i] = null; // Mark as used
                        return true;
                    }
                }
            } else { // Multi-word n-gram matching
                // Simple substring check for exact match
                const studentText = studentWordsArray.filter(w => w !== null).join(' ');
                if (studentText.includes(unit)) {
                    return true;
                }
                // Fuzzy N-gram match: Check if *most* words in the unit are present
                let matchedWordsInUnit = 0;
                unitWords.forEach(word => {
                    if (studentWordsArray.some(sw => sw && stringSimilarity.compareTwoStrings(word, sw) > 0.7)) {
                        matchedWordsInUnit++;
                    }
                });
                if (matchedWordsInUnit >= Math.floor(unitWords.length * 0.7)) { // 70% of words in unit matched
                    return true;
                }
            }
            return false;
        };


        // Iterate through reference content units and find matches in student's transcript
        allReferenceContentUnits.forEach(unit => {
            if (contentUnitsMatched.has(unit)) return; // Already matched this unit (e.g., as part of a larger n-gram)

            // Attempt to match the unit
            if (findAndMarkMatch(unit, tempStudentContentWords, 0.7)) { // Use a reasonable threshold for content unit matching
                contentUnitsMatched.add(unit);
            }
        });


        // --- Phase 3: Identify 'extra' words for UI feedback ---
        // These are words in the student's raw transcript that weren't matched in Phase 1
        studentWordsRaw.forEach((studentWord, index) => {
            if (!usedStudentWordsIndicesForWordAnalysis.has(index)) {
                // Check if this extra word is a meaningful keyword or just filler
                const isMeaningfulExtra = studentContentWords.includes(studentWord); // A rough check
                wordAnalysis.push({ word: studentWord, status: isMeaningfulExtra ? "extra_meaningful" : "extra_filler", originalIndex: index });
            }
        });

        /* ---------------- SCORING (Content, Pronunciation, Fluency - Max 5 each) ---------------- */
        const totalContentUnits = allReferenceContentUnits.length || 1;

        // --- CONTENT SCORE (max 5) ---
        const contentCoverageRatio = contentUnitsMatched.size / totalContentUnits;
        let contentScore = 0;
        if (contentCoverageRatio >= 0.9) contentScore = 5;
        else if (contentCoverageRatio >= 0.75) contentScore = 4;
        else if (contentCoverageRatio >= 0.5) contentScore = 3;
        else if (contentCoverageRatio >= 0.3) contentScore = 2;
        else if (contentCoverageRatio > 0) contentScore = 1;


        // --- PRONUNCIATION SCORE (max 5) ---
        // Use `question.transcript` for pronunciation comparison if available and clean,
        // otherwise default to `question.answer`.
        const pronunciationSimilarity = stringSimilarity.compareTwoStrings(pronunciationReferenceClean, studentClean);
        let pronunciationScore = pronunciationSimilarity * 5;
        pronunciationScore = Math.max(0, Math.min(5, pronunciationScore));

        // --- FLUENCY SCORE (max 5) ---
        // Compare the length of the student's *actual* spoken words (all raw words)
        // to the *raw* reference words, allowing for some flexibility.
        const totalReferenceWordsCount = referenceWordsRaw.length || 1;
        const totalStudentWordsSpoken = studentWordsRaw.length;

        const lengthRatio = totalReferenceWordsCount > 0 ? totalStudentWordsSpoken / totalReferenceWordsCount : 0;
        let fluencyScore = 0;
        if (lengthRatio >= 0.8 && lengthRatio <= 1.2) fluencyScore = 5; // Allowing +/- 20% word count variation
        else if (lengthRatio >= 0.6 && lengthRatio <= 1.4) fluencyScore = 4;
        else if (lengthRatio >= 0.4 && lengthRatio <= 1.6) fluencyScore = 3;
        else fluencyScore = 2;
        fluencyScore = Math.max(0, Math.min(5, fluencyScore));


        // --- TOTAL SCORE ---
        // Max total score for 5+5+5 = 15. Your frontend shows 0-16. Adjust max if needed.
        const totalScore = contentScore + pronunciationScore + fluencyScore;


        // Upload audio to Cloudinary
        const audioUpload = await cloudinary.uploader.upload(req.file.path, { resource_type: "video" });

        const attempt = await RespondSituationAttempt.create({
            questionId,
            userId,
            studentAudio: { url: audioUpload.secure_url, public_id: audioUpload.public_id },
            transcript,
            score: parseFloat(totalScore.toFixed(1)),
            content: parseFloat(contentScore.toFixed(1)),
            pronunciation: parseFloat(pronunciationScore.toFixed(1)),
            fluency: parseFloat(fluencyScore.toFixed(1)),
            wordAnalysis
        });

        res.status(201).json({ success: true, data: attempt });

    } catch (error) {
        console.error("CREATE RESPOND SITUATION ATTEMPT ERROR:", error);
        res.status(500).json({ success: false, message: error.message || "An internal server error occurred" });
    }
};

export const saveAttempt = async (req, res) => {
  try {
   
    const response = await RespondSituationAttempt.create(req.body);


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