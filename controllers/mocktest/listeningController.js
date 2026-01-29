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
    const { listeningId, answers, userId } = req.body; // Expect answers array now
    // answers: [{ questionId, type, answer }]

    if (!answers || !Array.isArray(answers)) {
         // Fallback to old behavior if 'scores' passed? No, force new behavior.
         return res.status(400).json({ success: false, message: "Invalid answers format" });
    }

    const test = await Listening.findById(listeningId)
      .populate("summarizeSpokenTextQuestions")
      .populate("multipleChoiceMultiple")
      .populate("fillInTheBlanks")
      .populate("highlightIncorrectSummary")
      .populate("multipleChoiceSingle")
      .populate("selectMissingWord")
      .populate("highLightIncorrectWords")
      .populate("writeFromDictation");
      
    if (!test) return res.status(404).json({ success: false, message: "Test not found" });

    // Helper
    const allQ = [
        ...test.summarizeSpokenTextQuestions,
        ...test.multipleChoiceMultiple,
        ...test.fillInTheBlanks,
        ...test.highlightIncorrectSummary,
        ...test.multipleChoiceSingle,
        ...test.selectMissingWord,
        ...test.highLightIncorrectWords,
        ...test.writeFromDictation
    ];
    const findQ = (id) => allQ.find(q => q._id.toString() === id);

    let totalScore = 0;
    const scores = [];

    for (const ans of answers) {
        const q = findQ(ans.questionId);
        let score = 0;
        let max = 1;
        
        if (q) {
            if (ans.type === "SST") {
                // Form + Content + Grammar
                const words = (ans.answer || "").split(" ").length;
                if (words >= 40 && words <= 100) score = 10; 
                else score = 0;
                max = 10;
            } else if (ans.type === "WFD") {
                const transcript = (q.transcript || "").toLowerCase().split(" ");
                const userWords = (ans.answer || "").toLowerCase().split(" ");
                let hits = 0;
                transcript.forEach(w => { if(userWords.includes(w)) hits++; });
                score = hits;
                max = transcript.length;
            } else if (["FIB_L", "HIW"].includes(ans.type)) {
                 // HIW: array of words. FIB: object/array
                 if (ans.type === "HIW" && Array.isArray(ans.answer)) {
                     // +1 correct, -1 incorrect
                     // Mock logic: just count intersects with some "correctOptions" field if exists, 
                     // or assume q.incorrectWords is the key
                     const correct = q.incorrectWords || []; // Schema specific
                     let hits = 0;
                     ans.answer.forEach(w => { if(correct.includes(w)) hits++; else hits--; });
                     score = Math.max(0, hits);
                     max = correct.length;
                 } else if (ans.type === "FIB_L") {
                    // Object { 0: "word", 1: "word" }
                    // Compare with q.blanks or q.answers
                    score = 5; // Placeholder
                    max = 5;
                 }
            } else {
                // MCQs
                 if (ans.answer === q.correctAnswer) score = 1;
            }
        }

        scores.push({
            questionId: ans.questionId,
            questionType: ans.type,
            score: score,
            maxScore: max
        });
        totalScore += score;
    }

    const result = new ListeningResult({
      user: req.user?._id || userId, 
      testId: listeningId, // Renamed
      testModel: 'Listening', // Default
      scores,
      overallScore: totalScore,
    });

    await result.save();

    res.status(201).json({
      success: true,
      message: "Listening result submitted successfully",
      data: result,
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMyListeningResults = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const results = await ListeningResult.find({ user: userId })
      .populate("testId", "title name")
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
      testId: req.params.listeningId, // Query by testId
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
      .populate("testId", "title");

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
