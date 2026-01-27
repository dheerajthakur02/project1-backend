import mongoose from "mongoose";
import FIBL from "../../../models/mocktest/QuestionTests/FIBL.js";
import { FIBLQuestion } from "../../../models/fibl.model.js";

export const createFIBL = async (req, res) => {
  try {
    const { title, fiblQuestions = [] } = req.body;

    if (!title)
      return res.status(400).json({ success: false, message: "Title required" });

    if (fiblQuestions.length > 2)
      return res.status(400).json({
        success: false,
        message: "Max 2 questions allowed",
      });

    const invalidIds = fiblQuestions.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );
    if (invalidIds.length)
      return res.status(400).json({ success: false, invalidIds });

    const uniqueIds = [...new Set(fiblQuestions.map(String))];

    const existing = await FIBLQuestion.find({
      _id: { $in: uniqueIds },
    });

    if (existing.length !== uniqueIds.length) {
      return res.status(400).json({
        success: false,
        message: "Some questions do not exist",
      });
    }

    const alreadyUsed = await FIBL.findOne({
      fiblQuestions: { $in: uniqueIds },
    });

    if (alreadyUsed) {
      return res.status(400).json({
        success: false,
        message: "Question already used in another FIB-L",
        usedIn: alreadyUsed.title,
      });
    }

    const fibl = await FIBL.create({ title, fiblQuestions: uniqueIds });

    res.status(201).json({ success: true, data: fibl });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const getAllFIBL = async (req, res) => {
  const data = await FIBL.find().sort({ createdAt: -1 });
  res.json({ success: true, data });
};

export const getFIBLById = async (req, res) => {
  const data = await FIBL.findById(req.params.id).populate("fiblQuestions");
  if (!data)
    return res.status(404).json({ success: false, message: "Not found" });
  res.json({ success: true, data });
};

export const updateFIBL = async (req, res) => {
  const updated = await FIBL.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  res.json({ success: true, data: updated });
};

export const deleteFIBL = async (req, res) => {
  await FIBL.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: "Deleted successfully" });
};
