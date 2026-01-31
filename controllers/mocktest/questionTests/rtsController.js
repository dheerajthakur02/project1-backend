import mongoose from "mongoose";
import RTS from "../../../models/mocktest/QuestionTests/RTS.js";
import { RespondSituationQuestion } from "../../../models/respondSituation.model.js";

export const createRTS = async (req, res) => {
  try {
    const { title, rtsQuestions = [] } = req.body;

    // ✅ Validate title
    if (!title) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    // ✅ Max 3 questions allowed
    if (rtsQuestions.length > 3) {
      return res.status(400).json({
        success: false,
        message: "RTS cannot have more than 3 questions",
      });
    }

    // ✅ Validate ObjectIds
    const invalidIds = rtsQuestions.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid RespondSituationQuestion IDs",
        invalidIds,
      });
    }

    // ✅ Remove duplicates
    const uniqueIds = [...new Set(rtsQuestions.map(String))];

    // ✅ Check if questions exist in DB
    const existingQuestions = await RespondSituationQuestion.find({ _id: { $in: uniqueIds } }).select("_id");
    if (existingQuestions.length !== uniqueIds.length) {
      return res.status(400).json({
        success: false,
        message: "Some RTS questions do not exist",
      });
    }

    // 🔥 Prevent reuse
    const alreadyUsed = await RTS.findOne({ rtsQuestions: { $in: uniqueIds } });
    if (alreadyUsed) {
      return res.status(400).json({
        success: false,
        message: "One or more questions already used in another RTS section",
        usedInTitle: alreadyUsed.title,
      });
    }

    // ✅ Create RTS
    const rts = new RTS({ title, rtsQuestions: uniqueIds });
    await rts.save();

    res.status(201).json({
      success: true,
      message: "RTS section created successfully",
      data: rts,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const getAllRTS = async (req, res) =>
  res.json({ data: await RTS.find() });

export const getRTSById = async (req, res) =>
  res.json({
    data: await RTS.findById(req.params.id).populate("rtsQuestions"),
  });

export const updateRTS = async (req, res) =>
  res.json({
    data: await RTS.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }),
  });

export const deleteRTS = async (req, res) => {
  await RTS.findByIdAndDelete(req.params.id);
  res.json({ success: true });
};


export const getUnusedRTSQuestions = async (req, res) => {
  try {
    const allRTSQuestions = await RespondSituationQuestion.find({});
    const existingRTSSections = await RTS.find({});

    const usedRTSQuestionIds = new Set();
    existingRTSSections.forEach(section => {
      section.rtsQuestions.forEach(id => usedRTSQuestionIds.add(id.toString()));
    });

    const unusedRTSQuestions = allRTSQuestions.filter(q =>
      !usedRTSQuestionIds.has(q._id.toString())
    );

    res.status(200).json({
      success: true,
      data: {
        rts: unusedRTSQuestions, // Key for frontend
      },
    });
  } catch (error) {
    console.error("Error fetching unused RTS questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unused RTS questions",
    });
  }
};