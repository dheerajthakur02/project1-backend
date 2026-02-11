
import mongoose from "mongoose";
import { cloudinary } from "../../config/cloudinary.js";
import { HIWAttempt, HIWQuestion } from "../../models/listening/HIW.js";

// @route   POST /api/hiw

export const createHIWQuestion = async (req, res) => {
  try {
    const { title, content, mistakes, difficulty } = req.body;

     if (!req.file) {
      return res.status(400).json({ success: false, message: "Audio is required" });
    }

     // 4. Upload to Cloudinary
    const audio = await cloudinary.uploader.upload(req.file.path, { resource_type: "video" });

    // 5. Transcribe
    let finalTranscript = req.body.transcript;
    // HIW usually relies on "content" as the transcript, but we might want a separate clean transcript field if "content" has other formatting, 
    // OR we can just use "content" as the base. 
    // However, for consistency with other modules, we are adding a specific "transcript" field which might differ or be the same as content.
    // In HIW, "content" IS the transcript usually, but let's stick to the pattern requested: "make the transcript field required".
    
    // If no manual transcript, we could auto-transcribe, but HIW *requires* text content to generate mistakes from. 
    // The "content" field IS the text. 
    // The user request says "make the transcript field required". 
    // In HIW, the "content" IS the text displayed to the user. The audio should match it (mostly).
    // The "Transcribe" button usually shows the *correct* full text.
    // Let's assume user wants a specific 'transcript' field separate from 'content' (which is the question text) 
    // OR more likely, they want to explicitly store a transcript for the "Transcribe" feature.
    
    if (!finalTranscript) {
        // If not provided, we can try to use 'content' as fallback or auto-transcribe.
        // Given the requirement "make transcript field required", we expect it from body.
        finalTranscript = content; 
    }

    const newQuestion = await HIWQuestion.create({
      title,
      content,
      mistakes: typeof mistakes === "string" ? JSON.parse(mistakes) : mistakes,
      audioUrl: audio?.secure_url,
      cloudinaryId: audio?.public_id,
      transcript: finalTranscript,
      difficulty,
      isPredictive: req.body.isPredictive || false
    });

    res.status(201).json({
      success: true,
      data: newQuestion
    });

  } catch (error) {
    console.error("Create HIW Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// @desc    Update HIW Question
// @route   PUT /api/hiw/:id

export const updateHIWQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    let question = await HIWQuestion.findById(id);

    if (!question) {
      if (req.file) fs.unlinkSync(req.file.path); 
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    // Build update object
    const updateData = { ...req.body };
    
    // --- FIX: Handle mistakes array if sent as string from FormData ---
    if (req.body.mistakes) {
      try {
        updateData.mistakes = typeof req.body.mistakes === "string" 
          ? JSON.parse(req.body.mistakes) 
          : req.body.mistakes;
      } catch (e) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, message: "Invalid mistakes format" });
      }
    }

    // Handle Audio Update
    let finalTranscript = req.body.transcript;
    console.log(finalTranscript)
    
    if (req.file) {
      // 1. Delete old audio
      if (question.cloudinaryId && question.cloudinaryId !== "cloudinaryId placeholder") {
        await cloudinary.uploader.destroy(question.cloudinaryId, { resource_type: "video" });
      }

      // 2. Upload new audio
      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "video",
        folder: "hiw_audio",
      });

      updateData.audioUrl = result.secure_url;
      updateData.cloudinaryId = result.public_id;

      // 3. Delete temp file from local server
      fs.unlinkSync(req.file.path);
    }
    
    if (finalTranscript !== undefined) updateData.transcript = finalTranscript;
    if (req.body.isPredictive !== undefined) question.isPredictive = req.body.isPredictive;

    // Update the document
    const updatedQuestion = await HIWQuestion.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: updatedQuestion });
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path); // Cleanup on error
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCommunityAttempts = async (req, res) => {
  try {
    const { questionId } = req.params;

    if (!questionId) {
      return res.status(400).json({
        success: false,
        message: "questionId is required",
      });
    }

    const data = await HIWAttempt.aggregate([
      {
        $match: {
          questionId: new mongoose.Types.ObjectId(questionId),
        },
      },

      // Sort latest attempts first
      { $sort: { createdAt: -1 } },

      // Group attempts per user
      {
        $group: {
          _id: "$userId",
          attempts: { $push: "$$ROOT" },
        },
      },

      // Limit to 15 attempts per user
      {
        $project: {
          userId: "$_id",
          attempts: { $slice: ["$attempts", 15] },
          _id: 0,
        },
      },

      // Optional: sort users by most recent attempt
      {
        $sort: {
          "attempts.0.createdAt": -1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("COMMUNITY ATTEMPTS ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all HIW Questions
// @route   GET /api/hiw
// export const getHIWQuestions = async (req, res) => {
//   try {
//     const questions = await HIWQuestion.find().sort({ createdAt: -1 });
//     res.status(200).json({ success: true, count: questions.length, data: questions });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };
export const getHIWQuestions  = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      const questions = await HIWQuestion.find().sort({ createdAt: -1 });
      return res.status(200).json({
        success: true,
        count: questions.length,
        data: questions,
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const questions = await HIWQuestion.aggregate([
      // 1️⃣ Count total attempts by this user per question
      {
        $lookup: {
          from: "hiwattempts", // Mongo collection name
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

      // 2️⃣ Get last 10 attempts for this user per question
      {
        $lookup: {
          from: "hiwattempts",
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
                selectedIndices: 1,
                score: 1,
                correctCount: 1,
                wrongCount: 1,
                missedCount: 1,
                timeTaken: 1,
                createdAt: 1,
              },
            },
          ],
          as: "lastAttempts",
        },
      },

      // 3️⃣ Add derived fields
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

      // 4️⃣ Cleanup
      {
        $project: {
          attemptCountArr: 0,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      count: questions.length,
      data: questions,
    });
  } catch (error) {
    console.error("GET HIW QUESTIONS WITH ATTEMPTS ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteQuestion = async (req, res) => {
  try {
    const question = await HIWQuestion.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    await cloudinary.uploader.destroy(question.cloudinaryId, {
      resource_type: "video",
    });

    await question.deleteOne();
    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



export const submitHIWAttempt = async (req, res) => {
  try {
    const { questionId, userId, selectedIndices, timeTaken } = req.body;
  
    const question = await HIWQuestion.findById(questionId);

    const mistakeIndices = question.mistakes.map(m => m.index);
    
    // 1. Correct Words: User clicked a word that is actually a mistake
    const correctCount = selectedIndices.filter(idx => mistakeIndices.includes(idx+1)).length;

    // 2. Wrong Words: User clicked a word that was correct in the audio (Penalty)
    const wrongCount = selectedIndices.filter(idx => !mistakeIndices.includes(idx+1)).length;

    // 3. Missed Words: Actual mistakes the user failed to click
    const missedCount = mistakeIndices.filter(idx => !selectedIndices.includes(idx+1)).length;

    // PTE Score Calculation
    const score = Math.max(0, correctCount - wrongCount);

    const attempt = await HIWAttempt.create({
      questionId,
      userId,
      selectedIndices,
      score,
      correctCount,
      wrongCount,
      missedCount,
      timeTaken
    });

    res.status(200).json({
      success: true,
      data: {
        score,
        correctCount,
        wrongCount,
        missedCount,
        mistakes: question.mistakes // Sending back for frontend analysis UI
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};