

// export const createRepeatAttempt = async (req, res) => {
//   try {
//     let { questionId, userId, transcript } = req.body;

//     /* ---------------- VALIDATE userId ---------------- */
//     if (!userId) {
//       return res.status(400).json({
//         success: false,
//         message: "userId is required"
//       });
//     }

//     if (!mongoose.Types.ObjectId.isValid(userId)) {
//      userId = new mongoose.Types.ObjectId(userId);
//     }

    

//     /* ---------------- VALIDATE questionId ---------------- */
//     if (!questionId || !mongoose.Types.ObjectId.isValid(questionId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid questionId"
//       });
//     }

//     questionId = new mongoose.Types.ObjectId(questionId);

//     /* ---------------- VALIDATE AUDIO ---------------- */
//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         message: "Audio recording is required"
//       });
//     }

//     /* ---------------- FETCH QUESTION ---------------- */
//     const question = await Question.findById(questionId);
//     if (!question) {
//       return res.status(404).json({
//         success: false,
//         message: "Question not found"
//       });
//     }

//     const originalText = question.title;
//     if (!originalText) {
//       return res.status(500).json({
//         success: false,
//         message: "Question text (title) is missing"
//       });
//     }

//     /* ---------------- NORMALIZATION ---------------- */
//     const clean = (text) =>
//       (text || "")
//         .toLowerCase()
//         .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
//         .trim();

//     const originalClean = clean(originalText);
//     const studentClean = clean(transcript);

//     const originalWords = originalClean.split(/\s+/).filter(Boolean);
//     const studentWords = studentClean.split(/\s+/).filter(Boolean);

//     /* ---------------- WORD ANALYSIS ---------------- */
//     const wordAnalysis = [];
//     let matchedCount = 0;

//     if (studentWords.length === 0) {
//       originalWords.forEach(word =>
//         wordAnalysis.push({ word, status: "missing" })
//       );
//     } else {
//       originalWords.forEach((word, index) => {
//         const studentWord = studentWords[index];

//         if (!studentWord) {
//           wordAnalysis.push({ word, status: "missing" });
//         } else if (word === studentWord) {
//           wordAnalysis.push({ word, status: "correct" });
//           matchedCount++;
//         } else {
//           const similarity = stringSimilarity.compareTwoStrings(word, studentWord);
//           if (similarity > 0.8) {
//             wordAnalysis.push({ word: studentWord, status: "correct" });
//             matchedCount++;
//           } else {
//             wordAnalysis.push({ word: studentWord, status: "incorrect" });
//           }
//         }
//       });
//     }

//     /* ---------------- SCORING ---------------- */
//     const totalWords = originalWords.length || 1;
//     const contentPercentage = (matchedCount / totalWords) * 100;

//     let contentScore = 0;
//     if (contentPercentage === 100) contentScore = 10;
//     else if (contentPercentage >= 50) contentScore = 7;
//     else if (contentPercentage > 0) contentScore = 3;

//     const pronunciationScore =
//       stringSimilarity.compareTwoStrings(originalClean, studentClean) * 10;

//     const sLen = studentWords.length || 1;
//     const fluencyScore =
//       (Math.min(sLen, totalWords) / Math.max(sLen, totalWords)) * 10;

//     const totalScore =
//       (contentScore + pronunciationScore + fluencyScore) / 3;

//     /* ---------------- SAVE ATTEMPT ---------------- */
//     const attempt = await RepeatAttempt.create({
//       questionId,
//       userId,
//       studentAudio: {
//         public_id: req.file.filename,
//         url: req.file.path
//       },
//       transcript: transcript || "",
//       score: totalScore.toFixed(1),
//       content: contentScore.toFixed(1),
//       pronunciation: pronunciationScore.toFixed(1),
//       fluency: fluencyScore.toFixed(1),
//       wordAnalysis
//     });

//     res.status(201).json({
//       success: true,
//       data: attempt
//     });

//   } catch (error) {
//     console.error("CRITICAL ERROR:", error);
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

import RepeatAttempt from "../models/attemptRepeat.model.js";
import Question from "../models/repeat.model.js";
import stringSimilarity from "string-similarity";
import mongoose from "mongoose";
import { cloudinary } from "../config/cloudinary.js";


export const createRepeatAttempt = async (req, res) => {
    try {
        let { questionId, userId, transcript } = req.body;

        /* ------------------- 1. Input Validation and Type Casting ------------------- */
        if (!userId) {
            return res.status(400).json({ success: false, message: "userId is required." });
        }
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Invalid userId." });
        }
        userId = new mongoose.Types.ObjectId(userId);

        if (!questionId) {
            return res.status(400).json({ success: false, message: "questionId is required." });
        }
        if (!mongoose.Types.ObjectId.isValid(questionId)) {
            return res.status(400).json({ success: false, message: "Invalid questionId." });
        }
        questionId = new mongoose.Types.ObjectId(questionId);

        if (!req.file) {
            return res.status(400).json({ success: false, message: "Audio recording is required." });
        }
        if (typeof transcript !== 'string') {
            transcript = ''; // Ensure transcript is a string, even if empty
        }

        /* ------------------- 2. Fetch Question and Reference Data ------------------- */
        const question = await Question.findById(questionId);
        if (!question) {
            return res.status(404).json({ success: false, message: "Question not found." });
        }

        const originalText = question.transcript; // For repeat, 'transcript' on question model is the target text
        if (!originalText) {
            return res.status(500).json({ success: false, message: "Reference text for repetition is missing for the question." });
        }

        /* ------------------- 3. Text Normalization ------------------- */
        // Improved cleaning function for consistency and robustness
        const cleanText = (text) =>
            (text || "")
                .toLowerCase()
                .replace(/[.,\/#!$%^&\*;:{}=\-_`~()?'"‘’“”]/g, "") // More comprehensive punctuation removal
                .replace(/\s{2,}/g, ' ') // Replace multiple spaces with a single space
                .trim();

        const originalClean = cleanText(originalText);
        const studentClean = cleanText(transcript);

        const originalWords = originalClean.split(/\s+/).filter(Boolean);
        const studentWords = studentClean.split(/\s+/).filter(Boolean);

        /* ------------------- 4. Enhanced Word Analysis for UI Feedback and Content Score ------------------- */
        const wordAnalysis = [];
        let contentMatchedWordsCount = 0; // For content score calculation
        const usedStudentWordsIndices = new Set(); // Track student words used in matching

        // Iterate through original words and find corresponding student words
        originalWords.forEach((originalWord, originalIndex) => {
            let foundMatch = false;
            // Search window: Look +/- 2 words around the expected index in student's transcript
            const searchStart = Math.max(0, originalIndex - 2);
            const searchEnd = Math.min(studentWords.length, originalIndex + 3); // +3 to include up to 2 words after

            for (let i = searchStart; i < searchEnd; i++) {
                if (usedStudentWordsIndices.has(i)) continue; // Skip if this student word has already been matched

                const studentWord = studentWords[i];
                if (studentWord) {
                    const similarity = stringSimilarity.compareTwoStrings(originalWord, studentWord);
                    // A higher similarity threshold is appropriate for repeat questions (e.g., > 0.85)
                    if (similarity > 0.85) {
                        wordAnalysis.push({ word: originalWord, status: "correct", studentMatch: studentWord, matchedByIndex: i });
                        usedStudentWordsIndices.add(i);
                        contentMatchedWordsCount++;
                        foundMatch = true;
                        break;
                    }
                }
            }
            if (!foundMatch) {
                wordAnalysis.push({ word: originalWord, status: "missing" });
            }
        });

        // Identify 'extra' words spoken by the student that weren't part of a match
        studentWords.forEach((studentWord, index) => {
            if (!usedStudentWordsIndices.has(index)) {
                wordAnalysis.push({ word: studentWord, status: "extra", originalIndex: index });
            }
        });


        /* ------------------- 5. Scoring (Content, Pronunciation, Fluency) ------------------- */

        // --- CONTENT SCORE (max 5) ---
        const totalOriginalWords = originalWords.length || 1;
        const contentAccuracyRatio = contentMatchedWordsCount / totalOriginalWords;

        let contentScore = 0;
        if (contentAccuracyRatio >= 0.95) contentScore = 5; // Near perfect match
        else if (contentAccuracyRatio >= 0.8) contentScore = 4;
        else if (contentAccuracyRatio >= 0.6) contentScore = 3;
        else if (contentAccuracyRatio >= 0.3) contentScore = 2;
        else if (contentAccuracyRatio > 0) contentScore = 1;
        contentScore = parseFloat(contentScore.toFixed(1));


        // --- PRONUNCIATION SCORE (max 5) ---
        // Compare the student's cleaned transcript against the original cleaned transcript.
        const pronunciationSimilarity = stringSimilarity.compareTwoStrings(originalClean, studentClean);
        let pronunciationScore = pronunciationSimilarity * 5;
        // Ensure score is within 0-5 range
        pronunciationScore = parseFloat(Math.max(0, Math.min(5, pronunciationScore)).toFixed(1));


        // --- FLUENCY SCORE (max 5) ---
        // For repetition, fluency is about speaking at a similar pace and without too many extra/missing words.
        // A lenient length ratio is still appropriate, but a penalty for *excessive* deviation is added.
        const totalStudentWordsSpoken = studentWords.length;

        const lengthRatio = totalOriginalWords > 0 ? totalStudentWordsSpoken / totalOriginalWords : 0;
        let fluencyScore = 0;

        if (lengthRatio >= 0.9 && lengthRatio <= 1.1) fluencyScore = 5; // Very close word count
        else if (lengthRatio >= 0.75 && lengthRatio <= 1.25) fluencyScore = 4;
        else if (lengthRatio >= 0.5 && lengthRatio <= 1.5) fluencyScore = 3;
        else if (lengthRatio >= 0.25 && lengthRatio <= 1.75) fluencyScore = 2;
        else fluencyScore = 1; // Basic recognition

        // Further penalize if there are too many extra words compared to correct ones
        const extraWordsCount = studentWords.length - contentMatchedWordsCount;
        if (extraWordsCount > (totalOriginalWords * 0.5) && totalOriginalWords > 0) { // If >50% extra words
            fluencyScore = Math.max(1, fluencyScore - 1); // Deduct 1 point, but keep at least 1
        }
        fluencyScore = parseFloat(Math.max(0, Math.min(5, fluencyScore)).toFixed(1));


        // --- TOTAL SCORE ---
        const totalScore = parseFloat((contentScore + pronunciationScore + fluencyScore).toFixed(1));


        /* ------------------- 6. Upload Audio to Cloudinary ------------------- */
        let audioUploadResult;
        try {
            audioUploadResult = await cloudinary.uploader.upload(req.file.path, {
                resource_type: "video", // Treat audio as a video resource in Cloudinary
                folder: "repeat-attempts" // Optional: organize uploads
            });
        } catch (uploadError) {
            console.error("Cloudinary Upload Error:", uploadError);
            // Consider cleaning up the local file here if needed
            return res.status(500).json({ success: false, message: "Failed to upload audio." });
        }


        /* ------------------- 7. Save Attempt to Database ------------------- */
        const attempt = await RepeatAttempt.create({
            questionId,
            userId,
            studentAudio: {
                url: audioUploadResult.secure_url,
                public_id: audioUploadResult.public_id
            },
            transcript: transcript, // Store the raw transcript as provided by STT
            score: totalScore,
            content: contentScore,
            pronunciation: pronunciationScore,
            fluency: fluencyScore,
            wordAnalysis // Detailed feedback for frontend
        });

        res.status(201).json({ success: true, data: attempt });

    } catch (error) {
        console.error("CREATE REPEAT ATTEMPT ERROR:", error);
        res.status(500).json({ success: false, message: error.message || "An internal server error occurred." });
    }
};