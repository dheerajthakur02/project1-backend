import RL from "../../../models/mocktest/QuestionTests/RL.js";
/* ===================== CREATE RL ===================== */
export const createRL = async (req, res) => {
  try {
    const { title, readAloudQuestions = [] } = req.body;

    const rl = new RL({
      title,
      readAloudQuestions,
    });

    await rl.save(); // 🔒 max 5 validated by schema

    res.status(201).json({
      success: true,
      message: "Read Aloud section created successfully",
      data: rl,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===================== GET ALL RL ===================== */
export const getAllRL = async (req, res) => {
  try {
    const rlSections = await RL.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: rlSections.length,
      data: rlSections,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch Read Aloud sections",
    });
  }
};

/* ===================== GET RL BY ID ===================== */
export const getRLById = async (req, res) => {
  try {
    const { id } = req.params;

    const rlSection = await RL.findById(id)
      .populate("readAloudQuestions");

    if (!rlSection) {
      return res.status(404).json({
        success: false,
        message: "Read Aloud section not found",
      });
    }

    res.status(200).json({
      success: true,
      data: rlSection,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch Read Aloud section",
    });
  }
};

/* ===================== UPDATE RL ===================== */
export const updateRL = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedRL = await RL.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true,
        runValidators: true, // 🔒 important
      }
    );

    if (!updatedRL) {
      return res.status(404).json({
        success: false,
        message: "Read Aloud section not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Read Aloud section updated successfully",
      data: updatedRL,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===================== DELETE RL (OPTIONAL) ===================== */
export const deleteRL = async (req, res) => {
  try {
    const { id } = req.params;

    const rl = await RL.findByIdAndDelete(id);

    if (!rl) {
      return res.status(404).json({
        success: false,
        message: "Read Aloud section not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Read Aloud section deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete Read Aloud section",
    });
  }
};
