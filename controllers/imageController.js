import { ImageQuestion, ImageAttempt } from "../models/image.model.js"
import {cloudinary} from "../config/cloudinary.js";
// 1. Add New Question
// 1. Add New Question
export const createQuestion = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: "Image file is required" });
        }

        const uploaded = await cloudinary.uploader.upload(req.file.path, {
            folder: 'image-questions'
        });

        // Parse keywords if sent as string (from FormData)
        let parsedKeywords = [];
        if (req.body.keywords) {
            // Split by comma, trim whitespace
            parsedKeywords = req.body.keywords.split(',').map(k => k.trim()).filter(k => k);
        }

        const newQuestion = await ImageQuestion.create({
            title: req.body.title,
            imageUrl: uploaded.secure_url,
            cloudinaryId: uploaded.public_id,
            difficulty: req.body.difficulty || 'Medium',
            prepareTime: req.body.prepareTime || 35,
            answerTime: req.body.answerTime || 40,
            keywords: parsedKeywords,
            keywords: parsedKeywords,
            modelAnswer: req.body.modelAnswer || "",
            isPredictive: req.body.isPredictive || false,
        });

        res.status(201).json({ success: true, data: newQuestion });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// 2. Get All Questions (with user's last attempt summary)
import mongoose from "mongoose";

// 2. Get All Questions (Admin)
export const getAllQuestions = async (req, res) => {
    try {
        const questions = await ImageQuestion.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: questions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getImageQuestionsWithAttempts = async (req, res) => {
  try {
    const { userId } = req.params;

    /* ---------------- VALIDATE userId ---------------- */
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

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const questions = await ImageQuestion.aggregate([
      /* ---------------- TOTAL ATTEMPT COUNT ---------------- */
      {
        $lookup: {
          from: "imageattempts",
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

      /* ---------------- LAST 10 ATTEMPTS ---------------- */
      {
        $lookup: {
          from: "imageattempts",
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
                studentAudio: 1,
                createdAt: 1
              }
            }
          ],
          as: "lastAttempts"
        }
      },

      /* ---------------- FLAGS ---------------- */
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

      /* ---------------- CLEAN RESPONSE ---------------- */
      {
        $project: {
          attemptCountArr: 0
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      data: questions
    });

  } catch (error) {
    console.error("GET IMAGE QUESTIONS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};



import User from "../models/user.model.js";

export const getCommunityImageAttemptsByQuestion = async (req, res) => {
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

    const attempts = await ImageAttempt.aggregate([
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

      /* ---------------- FINAL RESPONSE SHAPE ---------------- */
      {
        $project: {
          userId: 1,
          "user.name": 1,
          score: 1,
          content: 1,
          transcript: 1,
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
    console.error("COMMUNITY IMAGE ATTEMPTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



// 3. Get Single Question with Last 5 Attempts
export const getQuestionById = async (req, res) => {
    try {
        const question = await ImageQuestion.findById(req.params.id).lean();
        if (!question) return res.status(404).json({ success: false, message: "Not found" });

        const lastAttempts = await ImageAttempt.find({ 
            questionId: req.params.id,
            userId: req.query.userId // Pass userId in query
        }).sort({ createdAt: -1 }).limit(5);

        res.status(200).json({ 
            success: true, 
            data: { ...question, lastAttempts } 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};



// Update Image Question
export const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await ImageQuestion.findById(id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    
    const title = req.body?.title;
    const prepareTime = req.body?.prepareTime;
    const answerTime = req.body?.answerTime;
    const difficulty = req.body?.difficulty;
    const keywords = req.body?.keywords;
    const modelAnswer = req.body?.modelAnswer;
    const isPredictive = req.body?.isPredictive;
  


    // ✅ If new image uploaded
    if (req.file) {
      // Delete old image from Cloudinary
      if (question.cloudinaryId) {
        await cloudinary.uploader.destroy(question.cloudinaryId);
      }

      // Upload new image
      const uploaded = await cloudinary.uploader.upload(req.file.path, {
        folder: 'image-questions'
      });


      question.imageUrl = uploaded.secure_url;
      question.cloudinaryId = uploaded.public_id;
    }

    // ✅ Update fields only if sent
    if (title !== undefined) question.title = title;
    if (prepareTime !== undefined) question.prepareTime = prepareTime;
    if (answerTime !== undefined) question.answerTime = answerTime;
    if (difficulty !== undefined) question.difficulty = difficulty;
    if (keywords !== undefined) question.keywords = keywords;
    if (modelAnswer !== undefined) question.modelAnswer = modelAnswer;

    await question.save();

    res.status(200).json({
      success: true,
      data: question
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// 5. Create Image Attempt (AI Evaluation Logic)
import stringSimilarity from "string-similarity";



export const deleteQuestion = async (req, res) => {
    try {
        const question = await ImageQuestion.findById(req.params.id);
        if (!question) {
            return res.status(404).json({ message: "Question not found" });
        }

        if (question.cloudinaryId) {
            await cloudinary.uploader.destroy(question.cloudinaryId);
        }

        await question.deleteOne();
        res.json({ message: "Deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


export const saveAttempt = async (req, res) => {
  try {
   
    const response = await ImageAttempt.create(req.body);


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


// Helper function to define common stop words
const getStopWords = () => new Set([
    'a', 'an', 'the', 'is', 'am', 'are', 'was', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'into', 'of', 'on', 'to', 'with',
    'and', 'or', 'but', 'not', 'no', 'this', 'that', 'these', 'those', 'it', 'its', 'he', 'she', 'they', 'we', 'you', 'your',
    'his', 'her', 'their', 'our', 'my', 'me', 'him', 'us', 'them', 'who', 'what', 'where', 'when', 'why', 'how', 'which', 'whom',
    'if', 'then', 'else', 'up', 'down', 'out', 'off', 'on', 'about', 'above', 'below', 'between', 'before', 'after', 'during',
    'through', 'under', 'over', 'around', 'each', 'every', 'some', 'any', 'all', 'few', 'many', 'more', 'most', 'other', 'such',
    'only', 'own', 'same', 'so', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'there', 'here',
    'also', 'much', 'about', 'against', 'among', 'amongst', 'cant', 'could', 'had', 'has', 'have', 'like', 'must', 'per', 'than',
    'until', 'upon', 'would', 'shall', 'may', 'might', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
    'nine', 'ten', 'zero', 'said', 'say', 'says', 'i', 'im', 'i m', 'percent', 'percentage', 'around', 'approximately' // Added numerical context words
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

export const createImageAttempt = async (req, res) => {
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
        const question = await ImageQuestion.findById(questionId);
        if (!question) {
            return res.status(404).json({ success: false, message: "Image question not found." });
        }

        const modelAnswer = question.modelAnswer || ""; // A full sentence description
        const keywords = question.keywords || [];       // Specific key objects/actions to mention

        if (!modelAnswer && keywords.length === 0) {
             return res.status(500).json({ success: false, message: "Image question is missing both model answer and keywords for scoring. Cannot evaluate content." });
        }

        /* ------------------- 3. Text Normalization ------------------- */
        const cleanText = (text) =>
            (text || "")
                .toLowerCase()
                .replace(/[.,\/#!$%^&\*;:{}=\-_`~()?'"‘’“”]/g, "")
                .replace(/\s{2,}/g, ' ')
                .trim();

        // Special cleaning for numbers: keep digits, convert "forty percent" to "40 percent" for consistency
        const cleanTextWithNumbers = (text) => {
            let cleaned = cleanText(text);
            // Basic number word to digit conversion (can be expanded)
            cleaned = cleaned.replace(/forty percent/g, '40 percent');
            cleaned = cleaned.replace(/sixty five/g, '65');
            cleaned = cleaned.replace(/seventy/g, '70');
            // Add more as needed
            return cleaned;
        }

        const studentClean = cleanTextWithNumbers(transcript);
        const modelClean = cleanTextWithNumbers(modelAnswer);

        const studentWordsRaw = studentClean.split(/\s+/).filter(Boolean);
        const modelWordsRaw = modelClean.split(/\s+/).filter(Boolean);

        const stopWords = getStopWords();
        const isContentWord = (word) => word.length > 2 && !stopWords.has(word) || /\d/.test(word); // Digits are always content words

        // Cleaned keywords for direct comparison and content scoring
        const cleanedKeywords = keywords.map(cleanTextWithNumbers).filter(Boolean);

        /* ------------------- 4. Advanced Content Analysis and Word Feedback ------------------- */
        const wordAnalysis = []; // Stores detailed word-by-word feedback for UI
        const usedStudentWordsIndicesForUI = new Set(); // Track student words used for UI feedback to avoid double-marking

        // Set to track unique content units (keywords or model answer content words/phrases) that were matched
        const contentUnitsMatchedForScoring = new Set();

        // --- Phase 1: Prioritize Keyword Matching for Content Score ---
        cleanedKeywords.forEach(keywordPhrase => {
            let keywordFound = false;
            let bestSimilarity = 0;
            let matchedStudentPhrase = "";
let keywordWords = '';
            // Strategy 1: Direct inclusion of the keyword phrase (cleaned) in the student's cleaned response
            if (studentClean.includes(keywordPhrase)) {
                keywordFound = true;
                matchedStudentPhrase = keywordPhrase;
                bestSimilarity = 1;
            } else {
                // Strategy 2: Fuzzy matching for multi-word keywords using N-grams
                keywordWords = keywordPhrase.split(' ');
                if (keywordWords.length > 1) {
                    const studentNgrams = generateNGrams(studentWordsRaw, keywordWords.length);
                    for (const sGram of studentNgrams) {
                        const similarity = stringSimilarity.compareTwoStrings(keywordPhrase, sGram);
                        if (similarity > bestSimilarity) {
                            bestSimilarity = similarity;
                            matchedStudentPhrase = sGram;
                        }
                    }
                } else { // Strategy 3: Fuzzy matching for single word keywords
                    for (const sWord of studentWordsRaw) {
                        const similarity = stringSimilarity.compareTwoStrings(keywordPhrase, sWord);
                        if (similarity > bestSimilarity) {
                            bestSimilarity = similarity;
                            matchedStudentPhrase = sWord;
                        }
                    }
                }
            }

            // If a keyword is found with high confidence (e.g., > 80% similarity for multi-word, > 90% for single-word)
            // Or if direct inclusion (bestSimilarity == 1)
            const requiredSimilarity = keywordWords.length > 1 ? 0.8 : 0.9;
            if (bestSimilarity >= requiredSimilarity) {
                contentUnitsMatchedForScoring.add(keywordPhrase); // Add original keyword to scoring set

                // For UI, mark the contributing student words
                const matchedStudentWords = matchedStudentPhrase.split(' ');
                studentWordsRaw.forEach((sWord, sIndex) => {
                    // Check if student word is part of the matched keyword, and hasn't been used yet
                    if (!usedStudentWordsIndicesForUI.has(sIndex) && matchedStudentWords.some(kw => stringSimilarity.compareTwoStrings(kw, sWord) > 0.7)) {
                        usedStudentWordsIndicesForUI.add(sIndex);
                    }
                });
            } else if (bestSimilarity > 0.6) { // Partial match for UI feedback or partial score credit
                 // Can add a "partial_match_keyword" status for UI if desired
                 // For content score, we'll keep it stricter for full credit, but this can be adjusted.
            } else {
                 wordAnalysis.push({ word: keywordPhrase, status: "missing" });
            }
        });

        // --- Phase 2: Model Answer Word/N-Gram Matching for UI feedback and secondary content score ---
        // This gives visual representation and catches relevant content not explicitly in keywords.
        const modelContentWords = modelWordsRaw.filter(isContentWord);
        const model2Grams = generateNGrams(modelContentWords, 2); // Common phrases
        const model3Grams = generateNGrams(modelContentWords, 3); // Longer phrases

        // Combine unique content words and phrases from model answer for thorough matching
        const modelContentUnits = new Set([...modelContentWords, ...model2Grams, ...model3Grams]);

        modelContentUnits.forEach(unit => {
            let foundMatch = false;
            const unitWords = unit.split(' ');
            let bestSimilarity = 0;
            let matchedStudentPhrase = "";

            if (unitWords.length === 1) { // Single word unit from model answer
                for (const sWord of studentWordsRaw) {
                    const similarity = stringSimilarity.compareTwoStrings(unit, sWord);
                    if (similarity > bestSimilarity) {
                        bestSimilarity = similarity;
                        matchedStudentPhrase = sWord;
                    }
                }
                if (bestSimilarity > 0.8) { // High similarity for a single word
                    foundMatch = true;
                }
            } else { // Multi-word unit (2-gram, 3-gram) from model answer
                const studentNgrams = generateNGrams(studentWordsRaw, unitWords.length);
                 for (const sGram of studentNgrams) {
                    const similarity = stringSimilarity.compareTwoStrings(unit, sGram);
                    if (similarity > bestSimilarity) {
                        bestSimilarity = similarity;
                        matchedStudentPhrase = sGram;
                    }
                }
                if (bestSimilarity > 0.7) { // Reasonable similarity for a phrase
                    foundMatch = true;
                }
            }

            if (foundMatch) {
                // Add to content score units IF it's a content unit and not already covered by a keyword
                if (!contentUnitsMatchedForScoring.has(unit)) {
                    contentUnitsMatchedForScoring.add(unit);
                }

                // For UI, mark the contributing student words, avoiding reuse
                const matchedStudentWords = matchedStudentPhrase.split(' ');
                studentWordsRaw.forEach((sWord, sIndex) => {
                    if (!usedStudentWordsIndicesForUI.has(sIndex) && matchedStudentWords.some(kw => stringSimilarity.compareTwoStrings(kw, sWord) > 0.7)) {
                        usedStudentWordsIndicesForUI.add(sIndex);
                        // Add to wordAnalysis if it's not already there for a keyword or another correct model word
                        const existingEntry = wordAnalysis.find(entry => entry.matchedByIndex === sIndex);
                        if (!existingEntry || existingEntry.status !== "correct") { // Ensure no overwrite of better match
                             wordAnalysis.push({ word: unitWords[0], status: "correct", studentMatch: sWord, matchedByIndex: sIndex });
                        }
                    }
                });
            } else {
                // For UI feedback, mark as missing if it's a content word and wasn't found
                if (isContentWord(unitWords[0])) { // Check the first word of the unit
                    wordAnalysis.push({ word: unit, status: "missing" });
                }
            }
        });


        // --- Phase 3: Identify 'extra' words spoken by the student for UI ---
        studentWordsRaw.forEach((studentWord, index) => {
            if (!usedStudentWordsIndicesForUI.has(index)) {
                const isMeaningfulExtra = isContentWord(studentWord);
                wordAnalysis.push({ word: studentWord, status: isMeaningfulExtra ? "extra_meaningful" : "extra_filler", originalIndex: index });
            }
        });


        /* ------------------- 5. Scoring (Content, Pronunciation, Fluency) ------------------- */

        // --- CONTENT SCORE (MAX 6) ---
        // Combine all potential content units (keywords, model answer words, and model answer phrases)
        const allReferenceContentUnits = new Set([
            ...cleanedKeywords,
            ...modelWordsRaw.filter(isContentWord),
            ...model2Grams.filter(gram => !stopWords.has(gram.split(' ')[0]) && !stopWords.has(gram.split(' ')[1])), // Filter n-grams if they contain stop words
            ...model3Grams.filter(gram => !stopWords.has(gram.split(' ')[0]) && !stopWords.has(gram.split(' ')[1]) && !stopWords.has(gram.split(' ')[2]))
        ]);
        const totalReferenceContentUnits = allReferenceContentUnits.size || 1;
        const contentCoverageRatio = contentUnitsMatchedForScoring.size / totalReferenceContentUnits;

        let contentScore = 0;
        if (contentCoverageRatio >= 0.9) contentScore = 6;
        else if (contentCoverageRatio >= 0.7) contentScore = 5; // Slightly more forgiving
        else if (contentCoverageRatio >= 0.5) contentScore = 4;
        else if (contentCoverageRatio >= 0.3) contentScore = 3;
        else if (contentCoverageRatio >= 0.1) contentScore = 2; // Capture some content
        else contentScore = 1; // Spoke but minimal relevant content
        contentScore = parseFloat(contentScore.toFixed(1));


        // --- PRONUNCIATION SCORE (MAX 5) ---
        const pronunciationSimilarity = stringSimilarity.compareTwoStrings(modelClean, studentClean);
        let pronunciationScore = pronunciationSimilarity * 5;
        pronunciationScore = parseFloat(Math.max(0, Math.min(5, pronunciationScore)).toFixed(1));


        // --- FLUENCY SCORE (MAX 5) ---
        const expectedWordsLength = modelWordsRaw.length || 1;
        const spokenWordsLength = studentWordsRaw.length || 1;

        const lengthRatio = expectedWordsLength > 0 ? spokenWordsLength / expectedWordsLength : 0;
        let fluencyScore = 0;

        // More generous ranges for descriptive tasks
        if (lengthRatio >= 0.7 && lengthRatio <= 1.4) fluencyScore = 5;
        else if (lengthRatio >= 0.5 && lengthRatio <= 1.6) fluencyScore = 4;
        else if (lengthRatio >= 0.3 && lengthRatio <= 1.8) fluencyScore = 3;
        else if (lengthRatio > 0) fluencyScore = 2;
        else fluencyScore = 1;

        // Stronger penalties for very short/long answers
        if (spokenWordsLength < (expectedWordsLength * 0.2) && expectedWordsLength > 0) fluencyScore = Math.max(1, fluencyScore - 2); // Less than 20%
        if (spokenWordsLength > (expectedWordsLength * 2.5) && expectedWordsLength > 0) fluencyScore = Math.max(1, fluencyScore - 1.5); // More than 250%

        fluencyScore = parseFloat(Math.max(0, Math.min(5, fluencyScore)).toFixed(1));


        // --- TOTAL SCORE (MAX 16, assuming 6+5+5) ---
        const totalScore = parseFloat((contentScore + pronunciationScore + fluencyScore).toFixed(1));


        /* ------------------- 6. Upload Audio to Cloudinary ------------------- */
        let audioUploadResult;
        try {
            audioUploadResult = await cloudinary.uploader.upload(req.file.path, {
                resource_type: "video",
                folder: "image-description-attempts"
            });
        } catch (uploadError) {
            console.error("Cloudinary Upload Error:", uploadError);
            return res.status(500).json({ success: false, message: "Failed to upload audio." });
        }


        /* ------------------- 7. Save Attempt to Database ------------------- */
        const attempt = await ImageAttempt.create({
            questionId,
            userId,
            transcript: transcript,
            studentAudio: {
                url: audioUploadResult.secure_url,
                public_id: audioUploadResult.public_id
            },
            score: totalScore,
            content: contentScore,
            pronunciation: pronunciationScore,
            fluency: fluencyScore,
            wordAnalysis
        });

        res.status(201).json({ success: true, data: attempt });

    } catch (error) {
        console.error("CREATE IMAGE DESCRIPTION ATTEMPT ERROR:", error);
        res.status(500).json({ success: false, message: error.message || "An internal server error occurred." });
    }
};