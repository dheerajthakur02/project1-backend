import mongoose from "mongoose";
import WFD from "../../../models/mocktest/QuestionTests/WFD.js";
import { WriteFromDictationQuestion } from "../../../models/listening/WriteFromDictation.js";

export const createWFD = async (req, res) => {
  try {
    const { title, WriteFromDictationQuestions = [] } = req.body;

    if (!title)
      return res.status(400).json({ message: "Title required" });

    if (WriteFromDictationQuestions.length > 3)
      return res.status(400).json({ message: "Max 3 questions allowed" });

    const uniqueIds = [...new Set(WriteFromDictationQuestions.map(String))];

    const used = await WFD.findOne({
      WriteFromDictationQuestions: { $in: uniqueIds },
    });

    if (used)
      return res.status(400).json({
        message: "Question already used",
        usedIn: used.title,
      });

    const wfd = await WFD.create({ title, WriteFromDictationQuestions: uniqueIds });
    res.status(201).json({ success: true, data: wfd });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const getAllWFD = async (req, res) =>
  res.json({ data: await WFD.find() });

export const getWFDById = async (req, res) =>
  res.json({
    data: await WFD.findById(req.params.id).populate("WriteFromDictationQuestions"),
  });

export const updateWFD = async (req, res) =>
  res.json({
    data: await WFD.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }),
  });

export const deleteWFD = async (req, res) => {
  await WFD.findByIdAndDelete(req.params.id);
  res.json({ success: true });
};
