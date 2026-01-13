import ReadAloud from "../models/readAloud.model.js";

export const createReadAloud = async (req, res) => {
  try {
    const readAloud = await ReadAloud.create(req.body);
    res.status(201).json({
      success: true,
      data: readAloud,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllReadAloud = async (req, res) => {
  try {
    const readAlouds = await ReadAloud.find();
    res.status(200).json({
      success: true,
      data: readAlouds,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getReadAloudById = async (req, res) => {
  try {
    const readAloud = await ReadAloud.findById(req.params.id);

    if (!readAloud) {
      return res.status(404).json({
        success: false,
        message: "ReadAloud not found",
      });
    }

    // Find adjacent questions
    const nextQuestion = await ReadAloud.findOne({ _id: { $gt: req.params.id } }).sort({ _id: 1 }).select('_id');
    const prevQuestion = await ReadAloud.findOne({ _id: { $lt: req.params.id } }).sort({ _id: -1 }).select('_id');

    res.status(200).json({
      success: true,
      data: {
        ...readAloud.toObject(),
        nextId: nextQuestion ? nextQuestion._id : null,
        prevId: prevQuestion ? prevQuestion._id : null
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateReadAloud = async (req, res) => {
  try {
    const readAloud = await ReadAloud.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!readAloud) {
      return res.status(404).json({
        success: false,
        message: "ReadAloud not found",
      });
    }

    res.status(200).json({
      success: true,
      data: readAloud,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteReadAloud = async (req, res) => {
  try {
    const readAloud = await ReadAloud.findByIdAndDelete(req.params.id);

    if (!readAloud) {
      return res.status(404).json({
        success: false,
        message: "ReadAloud not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "ReadAloud deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
