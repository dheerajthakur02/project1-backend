

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

export const createRepeatAttempt = async (req, res) => {
  try {
    let { questionId, userId, transcript } = req.body;

    /* ---------------- VALIDATE & CAST userId ---------------- */
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId"
      });
    }

    userId = new mongoose.Types.ObjectId(userId);

    /* ---------------- VALIDATE & CAST questionId ---------------- */
    if (!questionId || !mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid questionId"
      });
    }

    questionId = new mongoose.Types.ObjectId(questionId);

    /* ---------------- VALIDATE AUDIO ---------------- */
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Audio recording is required"
      });
    }

    /* ---------------- FETCH QUESTION ---------------- */
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found"
      });
    }

    const originalText = question.transcript;
    if (!originalText) {
      return res.status(500).json({
        success: false,
        message: "Question text is missing"
      });
    }

    /* ---------------- NORMALIZATION ---------------- */
    const clean = (text) =>
      (text || "")
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
        .trim();

    const originalClean = clean(originalText);
    const studentClean = clean(transcript);

    const originalWords = originalClean.split(/\s+/).filter(Boolean);
    const studentWords = studentClean.split(/\s+/).filter(Boolean);

    /* ---------------- WORD ANALYSIS ---------------- */
    const wordAnalysis = [];
    let matchedCount = 0;

    if (studentWords.length === 0) {
      originalWords.forEach(word =>
        wordAnalysis.push({ word, status: "missing" })
      );
    } else {
      originalWords.forEach((word, index) => {
        const studentWord = studentWords[index];

        if (!studentWord) {
          wordAnalysis.push({ word, status: "missing" });
        } else if (word === studentWord) {
          wordAnalysis.push({ word, status: "correct" });
          matchedCount++;
        } else {
          const similarity = stringSimilarity.compareTwoStrings(word, studentWord);
          if (similarity > 0.8) {
            wordAnalysis.push({ word: studentWord, status: "correct" });
            matchedCount++;
          } else {
            wordAnalysis.push({ word: studentWord, status: "incorrect" });
          }
        }
      });
    }

    /* ---------------- SCORING (5 + 5 + 5 = 15) ---------------- */
    const totalWords = originalWords.length || 1;
    const contentPercentage = (matchedCount / totalWords) * 100;

    // Content (max 5)
    let contentScore = 0;
    if (contentPercentage === 100) contentScore = 5;
    else if (contentPercentage >= 70) contentScore = 4;
    else if (contentPercentage >= 40) contentScore = 3;
    else if (contentPercentage > 0) contentScore = 1;

    // Pronunciation (max 5)
    const pronunciationScore =
      stringSimilarity.compareTwoStrings(originalClean, studentClean) * 5;

    // Fluency (max 5)
    const sLen = studentWords.length || 1;
    const fluencyScore =
      (Math.min(sLen, totalWords) / Math.max(sLen, totalWords)) * 5;

    // Total (max 15)
    const totalScore =
      contentScore + pronunciationScore + fluencyScore;

    /* ---------------- SAVE ATTEMPT ---------------- */
    const attempt = await RepeatAttempt.create({
      questionId,
      userId,
      studentAudio: {
        public_id: req.file.filename,
        url: req.file.path
      },
      transcript: transcript || "",
      score: totalScore.toFixed(1),
      content: contentScore.toFixed(1),
      pronunciation: pronunciationScore.toFixed(1),
      fluency: fluencyScore.toFixed(1),
      wordAnalysis
    });

    return res.status(201).json({
      success: true,
      data: attempt
    });

  } catch (error) {
    console.error("CREATE ATTEMPT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
