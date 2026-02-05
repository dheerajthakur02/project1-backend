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

export const createImageAttempt = async (req, res) => {
  try {
    let { questionId, userId, transcript } = req.body;

    /* ---------------- VALIDATE USER ---------------- */
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId"
      });
    }
    userId = new mongoose.Types.ObjectId(userId);

    /* ---------------- VALIDATE QUESTION ---------------- */
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
    const question = await ImageQuestion.findById(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Image question not found"
      });
    }

    const modelAnswer = question.modelAnswer || "";
    const keywords = question.keywords || [];

    /* ---------------- TEXT NORMALIZATION ---------------- */
    const clean = (text) =>
      (text || "")
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
        .trim();

    const studentClean = clean(transcript);
    const modelClean = clean(modelAnswer);

    const studentWords = studentClean.split(/\s+/).filter(Boolean);

    /* ---------------- CONTENT SCORE (MAX 6) ---------------- */
    let keywordMatches = 0;
    keywords.forEach(keyword => {
      if (studentClean.includes(clean(keyword))) {
        keywordMatches++;
      }
    });

    const keywordRatio =
      keywords.length === 0 ? 0 : keywordMatches / keywords.length;

    let contentScore = 0;
    if (keywordRatio >= 0.9) contentScore = 6;
    else if (keywordRatio >= 0.7) contentScore = 5;
    else if (keywordRatio >= 0.5) contentScore = 4;
    else if (keywordRatio >= 0.3) contentScore = 3;
    else if (keywordRatio > 0) contentScore = 2;
    else contentScore = 1;

    /* ---------------- PRONUNCIATION SCORE (MAX 5) ---------------- */
    const pronunciationScore =
      stringSimilarity.compareTwoStrings(studentClean, modelClean) * 5;

    /* ---------------- FLUENCY SCORE (MAX 5) ---------------- */
    const expectedLength = modelClean.split(/\s+/).length || 1;
    const spokenLength = studentWords.length || 1;

    const fluencyScore =
      (Math.min(spokenLength, expectedLength) /
        Math.max(spokenLength, expectedLength)) * 5;

    /* ---------------- TOTAL SCORE (MAX 16) ---------------- */
    const totalScore =
      contentScore + pronunciationScore + fluencyScore;

    /* ---------------- SAVE ATTEMPT ---------------- */
    const attempt = await ImageAttempt.create({
      questionId,
      userId,
      transcript: transcript || "",
      studentAudio: {
        public_id: req.file.filename,
        url: req.file.path
      },
      score: totalScore.toFixed(1),
      content: contentScore.toFixed(1),
      pronunciation: pronunciationScore.toFixed(1),
      fluency: fluencyScore.toFixed(1)
    });

    return res.status(201).json({
      success: true,
      data: attempt
    });

  } catch (error) {
    console.error("CREATE IMAGE ATTEMPT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

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
