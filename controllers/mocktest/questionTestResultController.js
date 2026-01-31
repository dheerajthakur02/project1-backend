import QuestionTestResult from "../../models/mocktest/QuestionTestResult.js";

// Get logged-in user's question test results
export const getUserQuestionTestResults = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const results = await QuestionTestResult.find({ user: userId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    console.error("Error fetching question test results:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single result by ID
export const getQuestionTestResultById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await QuestionTestResult.findById(id);

    if (!result) {
        return res.status(404).json({ success: false, message: "Result not found" });
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
