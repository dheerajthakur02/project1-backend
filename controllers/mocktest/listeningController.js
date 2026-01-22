import Listening, { ListeningResult } from "../../models/mocktest/Listening.js";


export const createListening = async (req, res) => {
  try {
    const listening = new Listening(req.body);
    await listening.save();

    res.status(201).json({
      success: true,
      message: "Listening test created successfully",
      data: listening,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


export const getAllListenings = async (req, res) => {
  try {
    const listenings = await Listening.find()
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: listenings.length,
      data: listenings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===================== GET LISTENING BY ID ===================== */
export const getListeningById = async (req, res) => {
  try {
    const { id } = req.params;

    const listeningSection = await Listening.findById(id)
      .populate("repeatSentenceQuestions")
      .populate("reTellLectureQuestions")
      .populate("answerShortQuestion")
      .populate("summarizeGroupDiscussion")
      .populate("summarizeSpokenTextQuestions")
      .populate("multipleChoiceMultiple")
      .populate("fillInTheBlanks")
      .populate("highlightIncorrectSummary")
      .populate("multipleChoiceSingle")
      .populate("selectMissingWord")
      .populate("highLightIncorrectWords")
      .populate("writeFromDictation");

    if (!listeningSection) {
      return res.status(404).json({
        success: false,
        message: "Listening section not found",
      });
    }

    res.status(200).json({
      success: true,
      data: listeningSection,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch Listening section",
    });
  }
};



export const updateListening = async (req, res) => {
  try {
    const listening = await Listening.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!listening) {
      return res.status(404).json({
        success: false,
        message: "Listening test not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Listening test updated successfully",
      data: listening,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


export const deleteListening = async (req, res) => {
  try {
    const listening = await Listening.findByIdAndDelete(req.params.id);

    if (!listening) {
      return res.status(404).json({
        success: false,
        message: "Listening test not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Listening test deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



export const submitListeningResult = async (req, res) => {
  try {
    const { listeningId, scores, overallScore } = req.body;

    const result = new ListeningResult({
      user: req.user._id, // from auth middleware
      listeningId,
      scores,
      overallScore,
    });

    await result.save();

    res.status(201).json({
      success: true,
      message: "Listening result submitted successfully",
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMyListeningResults = async (req, res) => {
  try {
    const results = await ListeningResult.find({ user: req.user._id })
      .populate("listeningId", "title")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const getResultsByListeningId = async (req, res) => {
  try {
    const results = await ListeningResult.find({
      listeningId: req.params.listeningId,
    })
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const getListeningResultById = async (req, res) => {
  try {
    const result = await ListeningResult.findById(req.params.id)
      .populate("user", "name email")
      .populate("listeningId", "title");

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Result not found",
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
