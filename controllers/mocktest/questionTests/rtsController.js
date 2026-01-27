import mongoose from "mongoose";
import RTS from "../../../models/mocktest/QuestionTests/RTS.js";
import { RTSQuestion } from "../../../models/rts.model.js";

export const createRTS = async (req, res) => {
  try {
    const { title, rtsQuestions = [] } = req.body;

    if (!title)
      return res.status(400).json({ message: "Title required" });

    if (rtsQuestions.length > 3)
      return res.status(400).json({ message: "Max 3 questions allowed" });

    const uniqueIds = [...new Set(rtsQuestions.map(String))];

    const used = await RTS.findOne({
      rtsQuestions: { $in: uniqueIds },
    });

    if (used)
      return res.status(400).json({
        message: "Question already used",
        usedIn: used.title,
      });

    const rts = await RTS.create({ title, rtsQuestions: uniqueIds });
    res.status(201).json({ success: true, data: rts });
  } catch (e) {
    res.status(500).json({ message: e.message });
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
