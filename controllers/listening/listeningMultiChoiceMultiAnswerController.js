import { ListeningMultiChoiceMultiAnswer, ListeningMultiChoiceMultiAnswerAttempt } from "../../models/listening/ListeningMultiChoiceMultiAnswer.js";
import { cloudinary } from "../../config/cloudinary.js";
import mongoose from "mongoose";

// Add a new question
export const addQuestion = async (req, res) => {
  try {
    const { title, question, options, correctOptions, difficulty, transcript, isPredictive } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Audio file is required" });
    }

    // correctOptions and options might come as stringified JSON if sent via FormData
    let parsedOptions = options;
    if (typeof options === "string") {
        try { parsedOptions = JSON.parse(options); } catch (e) { parsedOptions = [options]; }
    }

    let parsedCorrectOptions = correctOptions;
    if (typeof correctOptions === "string") {
        try { parsedCorrectOptions = JSON.parse(correctOptions); } catch (e) { parsedCorrectOptions = [correctOptions]; }
    }

    // Upload audio
    const audio = await cloudinary.uploader.upload(req.file.path, { resource_type: "video" });

    const newQuestion = await ListeningMultiChoiceMultiAnswer.create({
      title,
      audioUrl: audio.secure_url,
      cloudinaryId: audio.public_id,
      transcript: transcript || "", // Optional
      question,
      options: parsedOptions,
      correctOptions: parsedCorrectOptions,

      difficulty: difficulty || "Medium",
      isPredictive: isPredictive || false
    });

    res.status(201).json({
      success: true,
      data: newQuestion,
      message: "Listening Multi Choice Multi Answer Question added successfully",
    });
  } catch (error) {
    console.error("ADD LISTENING MCM QUESTION ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get questions with user attempts status
export const getQuestions = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Fetch all questions
    const questions = await ListeningMultiChoiceMultiAnswer.find().lean();

    // Fetch user attempts to add status
    const questionsWithStatus = await Promise.all(
      questions.map(async (question) => {
        if (userId) {
            // Check attempts for this question
          const attempts = await ListeningMultiChoiceMultiAnswerAttempt.find({
            userId,
            questionId: question._id,
          }).sort({ createdAt: -1 });
          const attemptCount = attempts.length;
          const status = attemptCount > 0 ? `Practiced (${attemptCount})` : "Not Practiced";
          
          // Attach last attempt score if needed, or just status
           return { ...question, status, attemptCount, lastAttempts: attempts };
        }
        return { ...question, status: "Not Practiced", attemptCount: 0 };
      })
    );

    res.status(200).json({ success: true, data: questionsWithStatus });
  } catch (error) {
    console.error("GET LISTENING MCM QUESTIONS ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single question by ID
export const getQuestionById = async (req, res) => {
  try {
    const question = await ListeningMultiChoiceMultiAnswer.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }
    res.status(200).json({ success: true, data: question });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteQuestion = async (req, res) => {
  try {
    const question = await ListeningMultiChoiceMultiAnswer.findById(req.params.id);
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

// Submit an attempt
export const submitAttempt = async (req, res) => {
  try {
    const { userId, questionId, userSelectedOptions, timeTaken } = req.body;

    const question = await ListeningMultiChoiceMultiAnswer.findById(questionId);
    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    // Scoring Logic: +1 for correct, -1 for incorrect. Min 0.
    const correctOptionsSet = new Set(question.correctOptions);
    let correctCount = 0;
    let incorrectCount = 0;

    userSelectedOptions.forEach(option => {
      // Comparison should ideally be robust (trim/lowercase) but Reading module seems to do exact match on string/ID
      // Assuming options are strings.
      if (correctOptionsSet.has(option)) {
        correctCount++;
      } else {
        incorrectCount++;
      }
    });

    let rawScore = correctCount - incorrectCount;
    // Ensure score is not negative
    const score = Math.max(0, rawScore);
    const maxScore = question.correctOptions.length;

    const newAttempt = await ListeningMultiChoiceMultiAnswerAttempt.create({
      userId,
      questionId,
      userAnswers: userSelectedOptions,
      score,
      maxScore,
      timeTaken: timeTaken || 0
    });

    res.status(201).json({
      success: true,
      data: newAttempt,
      attempt: newAttempt, // Dual return for compatibility
      message: "Attempt submitted successfully",
    });
  } catch (error) {
    console.error("SUBMIT LISTENING MCM ATTEMPT ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// Get community attempts (Listening MCM) – max 15 latest per user
export const getListeningMCMCommunityAttempts = async (req, res) => {
  const {questionId} = req.params
  try {
    const attempts = await ListeningMultiChoiceMultiAnswerAttempt.aggregate([
      {
              $match: {
                questionId: new mongoose.Types.ObjectId(questionId),
              },
            },
      

      // 1️⃣ Sort latest attempts first
      { $sort: { createdAt: -1 } },

      // 2️⃣ Group attempts per user
      {
        $group: {
          _id: "$userId",
          attempts: { $push: "$$ROOT" }
        }
      },

      // 3️⃣ Limit each user to 15 attempts
      {
        $project: {
          attempts: { $slice: ["$attempts", 15] }
        }
      },

      // 4️⃣ Flatten attempts
      { $unwind: "$attempts" },

      // 5️⃣ Replace root
      { $replaceRoot: { newRoot: "$attempts" } },

      // 6️⃣ Populate user
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },

      // 7️⃣ Populate question
      {
        $lookup: {
          from: "listeningmultichoicemultianswers",
          localField: "questionId",
          foreignField: "_id",
          as: "question"
        }
      },
      { $unwind: "$question" },

      // 8️⃣ Final shape
      {
        $project: {
          userId: 1,
          questionId: 1,
          userAnswers: 1,
          score: 1,
          maxScore: 1,
          timeTaken: 1,
          createdAt: 1,

          "user.name": 1,
          "user.avatar": 1,

          "question.title": 1,
          "question.audioUrl": 1
        }
      },
        {
        $sort: {
          "attempts.0.createdAt": -1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      count: attempts.length,
      data: attempts
    });
  } catch (error) {
    console.error("GET LISTENING MCM COMMUNITY ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// @desc    Update MCMA Question
// @route   PUT /api/listening-multi-choice-multi-answer/:id
export const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, question, options, correctOptions, difficulty, transcript } = req.body;

    const existingQuestion = await ListeningMultiChoiceMultiAnswer.findById(id);

    if (!existingQuestion) {
      if (req.file) fs.unlinkSync(req.file.path); // Cleanup temp file if question doesn't exist
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    // 1. Prepare Update Object
    let updateData = {};
    if (title !== undefined) updateData.title = title;
    if (question !== undefined) updateData.question = question;
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (transcript !== undefined) updateData.transcript = transcript;
    if (req.body.isPredictive !== undefined) updateData.isPredictive = req.body.isPredictive;

    // 2. Parse Options (FormData sends arrays as stringified JSON)
    if (options) {
      try {
        updateData.options = typeof options === "string" ? JSON.parse(options) : options;
      } catch (e) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, message: "Invalid format for options" });
      }
    }

    // 3. Parse Correct Options
    if (correctOptions) {
      try {
        updateData.correctOptions = typeof correctOptions === "string" ? JSON.parse(correctOptions) : correctOptions;
      } catch (e) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, message: "Invalid format for correctOptions" });
      }
    }

    // 4. Handle Audio File Update
    if (req.file) {
      // Delete old audio from Cloudinary
      if (existingQuestion.cloudinaryId) {
        try {
          await cloudinary.uploader.destroy(existingQuestion.cloudinaryId, { resource_type: "video" });
        } catch (err) {
          console.error("Cloudinary Delete Error:", err);
          // We continue anyway to update with the new file
        }
      }

      // Upload new audio
      const audio = await cloudinary.uploader.upload(req.file.path, { resource_type: "video" });
      
      updateData.audioUrl = audio.secure_url;
      updateData.cloudinaryId = audio.public_id;

      // Delete temporary local file
      fs.unlinkSync(req.file.path);
    }

    // 5. Update in Database
    const updatedQuestion = await ListeningMultiChoiceMultiAnswer.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: updatedQuestion,
      message: "Question updated successfully",
    });

  } catch (error) {
    // Cleanup local file if error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error("UPDATE LISTENING MCM QUESTION ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};