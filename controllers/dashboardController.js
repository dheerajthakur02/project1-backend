import Link from "mongoose"; 
import Attempt from "../models/attempt.model.js"; // Read Aloud
import RepeatAttempt from "../models/attemptRepeat.model.js"; // Repeat Sentence
import { WriteFromDictationAttempt } from "../models/listening/WriteFromDictation.js";
import { AttemptReadingReorder } from "../models/attemptReadingReorder.model.js";
import FullMockTestResult from "../models/mocktest/FullMockTestResult.js";

import { RetellLectureAttempt } from "../models/retell.model.js"; // Retell Lecture
import { ShortAnswerAttempt } from "../models/shortAnswer.model.js"; // Answer Short Question
import { SummarizeWrittenAttempt } from "../models/writing/SummarizeText.js"; // Summarize Written Text
import { EssayAttempt } from "../models/writing/Essay.js"; // Essay
import { ImageAttempt } from "../models/image.model.js"; // Describe Image

import { AttemptReadingFIBDropdown } from "../models/attemptReadingFIBDropdown.model.js";
import { AttemptReadingFIBDragDrop } from "../models/attemptReadingFIBDragDrop.model.js";
import { AttemptReadingMultiChoiceMultiAnswer } from "../models/attemptReadingMultiChoiceMultiAnswer.model.js";
import { AttemptReadingMultiChoiceSingleAnswer } from "../models/attemptReadingMultiChoiceSingleAnswer.model.js";

// --- Question Models Imports ---
import ReadAloud from "../models/readAloud.model.js";
import RepeatQuestion from "../models/repeat.model.js";
import { ImageQuestion } from "../models/image.model.js";
import { RetellLectureQuestion } from "../models/retell.model.js";
import { ShortAnswerQuestion } from "../models/shortAnswer.model.js";
import { SummarizeGroupQuestion } from "../models/summarizeGroup.model.js";
import { RespondSituationQuestion } from "../models/respondSituation.model.js";

import { SummarizeTextQuestion } from "../models/writing/SummarizeText.js";
import { WriteEssayQuestion } from "../models/writing/Essay.js";

import { ReadingFIBDropdown } from "../models/readingFIBDropdown.model.js";
import { ReadingMultiChoiceMultiAnswer } from "../models/readingMultiChoiceMultiAnswer.model.js";
import { ReadingMultiChoiceSingleAnswer } from "../models/readingMultiChoiceSingleAnswer.model.js";
import { ReadingFIBDragDrop } from "../models/readingFIBDragDrop.model.js";
import { ReadingReorder } from "../models/readingReorder.model.js";

import { SSTQuestion } from "../models/listening/SSTQuestion.js";
import { ListeningMultiChoiceMultiAnswer } from "../models/listening/ListeningMultiChoiceMultiAnswer.js";
import { ListeningFIBQuestion } from "../models/listening/ListeningFIBQuestion.js";
import { HighlightSummaryQuestion } from "../models/listening/HCSQuestion.js";
import { ChooseSingleAnswerQuestion } from "../models/listening/ChooseSingleAnswer.js";
import { SelectMissingWordQuestion } from "../models/listening/SelectMissingWord.js";
import { HIWQuestion } from "../models/listening/HIW.js";
import { WriteFromDictationQuestion } from "../models/listening/WriteFromDictation.js";

// --- Attempt Models (Additional Imports if needed) ---
import { ListeningMultiChoiceMultiAnswerAttempt } from "../models/listening/ListeningMultiChoiceMultiAnswer.js";
import { ListeningFIBAttempt } from "../models/listening/ListeningFIBQuestion.js";
import { HighlightSummaryAttempt } from "../models/listening/HCSQuestion.js";
import { ChooseSingleAnswerAttempt } from "../models/listening/ChooseSingleAnswer.js";
import { SelectMissingWordAttempt } from "../models/listening/SelectMissingWord.js";
import { HIWAttempt } from "../models/listening/HIW.js";

// Missing Attempts
import { SummarizeGroupAttempt } from "../models/summarizeGroup.model.js";
import { RespondSituationAttempt } from "../models/respondSituation.model.js";
import { SSTAttempt } from "../models/listening/SSTQuestion.js";





// --- Helper Function for Calculating Stats ---
const calculatePracticeStatsHelper = async (userId) => {
    // Helper: Get counts for a list of Module pairs [{ q: QuestionModel, a: AttemptModel }]
    const calculateStats = async (modules) => {
        let total = 0;
        let practiced = 0;

        for (const mod of modules) {
            const qCount = await mod.q.countDocuments();
            
            // Dynamic Foreign Key Detection
            // Check if the Attempt model has 'paragraphId' in its schema, otherwise default to 'questionId'
            const foreignKey = mod.a.schema.path('paragraphId') ? 'paragraphId' : 'questionId';
            
            const aCount = await mod.a.distinct(foreignKey, { userId });
            
            total += qCount;
            practiced += aCount.length;
        }
        return { total, practiced };
    };

    // 1. Speaking
    const speakingModules = [
        { q: ReadAloud, a: Attempt },
        { q: RepeatQuestion, a: RepeatAttempt },
        { q: ImageQuestion, a: ImageAttempt },
        { q: RetellLectureQuestion, a: RetellLectureAttempt },
        { q: ShortAnswerQuestion, a: ShortAnswerAttempt },
        { q: SummarizeGroupQuestion, a: SummarizeGroupAttempt },
        { q: RespondSituationQuestion, a: RespondSituationAttempt }
    ];
    const speakingStats = await calculateStats(speakingModules);

    // 2. Writing
    const writingModules = [
        { q: SummarizeTextQuestion, a: SummarizeWrittenAttempt },
        { q: WriteEssayQuestion, a: EssayAttempt }
    ];
    const writingStats = await calculateStats(writingModules);

    // 3. Reading
    const readingModules = [
        { q: ReadingFIBDropdown, a: AttemptReadingFIBDropdown },
        { q: ReadingMultiChoiceMultiAnswer, a: AttemptReadingMultiChoiceMultiAnswer },
        { q: ReadingMultiChoiceSingleAnswer, a: AttemptReadingMultiChoiceSingleAnswer },
        { q: ReadingFIBDragDrop, a: AttemptReadingFIBDragDrop },
        { q: ReadingReorder, a: AttemptReadingReorder }
    ];
    const readingStats = await calculateStats(readingModules);

    // 4. Listening
    const listeningModules = [
        { q: SSTQuestion, a: SSTAttempt },
        { q: ListeningMultiChoiceMultiAnswer, a: ListeningMultiChoiceMultiAnswerAttempt },
        { q: ListeningFIBQuestion, a: ListeningFIBAttempt },
        { q: HighlightSummaryQuestion, a: HighlightSummaryAttempt },
        { q: ChooseSingleAnswerQuestion, a: ChooseSingleAnswerAttempt },
        { q: SelectMissingWordQuestion, a: SelectMissingWordAttempt },
        { q: HIWQuestion, a: HIWAttempt },
        { q: WriteFromDictationQuestion, a: WriteFromDictationAttempt }
    ];
    const listeningStats = await calculateStats(listeningModules);

    return {
        speaking: speakingStats,
        writing: writingStats,
        reading: readingStats,
        listening: listeningStats
    };
};


export const getDashboardData = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    // --- 1. Fetch History from various modules (Limit 5 each to keep it fast) ---
    // Helper for fetching
    const fetchRecent = (Model, sortKey = 'createdAt') => Model.find({ userId }).sort({ [sortKey]: -1 }).limit(5).lean();

    const allResults = await Promise.all([
        Attempt.find({ userId }).sort({ date: -1 }).limit(5).lean(),
        RepeatAttempt.find({ userId }).sort({ date: -1 }).limit(5).lean(),
        WriteFromDictationAttempt.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),
        AttemptReadingReorder.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),
        
        fetchRecent(RetellLectureAttempt),
        fetchRecent(ShortAnswerAttempt),
        fetchRecent(SummarizeWrittenAttempt),
        fetchRecent(EssayAttempt),
        fetchRecent(ImageAttempt),
        
        fetchRecent(AttemptReadingFIBDropdown),
        fetchRecent(AttemptReadingFIBDragDrop),
        fetchRecent(AttemptReadingMultiChoiceMultiAnswer),
        fetchRecent(AttemptReadingMultiChoiceSingleAnswer),

        // Added Missing Listening & Speaking Modules
        fetchRecent(SSTAttempt),
        fetchRecent(ListeningMultiChoiceMultiAnswerAttempt),
        fetchRecent(ListeningFIBAttempt),
        fetchRecent(HighlightSummaryAttempt),
        fetchRecent(ChooseSingleAnswerAttempt),
        fetchRecent(SelectMissingWordAttempt),
        fetchRecent(HIWAttempt),
        fetchRecent(SummarizeGroupAttempt),
        fetchRecent(RespondSituationAttempt)
    ]);

    const [
        raAttempts, rsAttempts, wfdAttempts, roAttempts,
        rlAttempts, asqAttempts, swtAttempts, essayAttempts, diAttempts,
        rfibdAttempts, rfibddAttempts, rmcmaAttempts, rmcsaAttempts,
        sstAttempts, lmcmaAttempts, lfibAttempts, hcsAttempts, 
        lcsaAttempts, smwAttempts, hiwAttempts, sgdAttempts, rtsAttempts
    ] = allResults;

    // --- 2. Normalize Data ---
    const normalize = (item, type, label, scoreKey = 'score', dateKey = 'date') => ({
      id: item._id,
      date: item[dateKey] || item.createdAt, 
      type, 
      label, 
      score: item[scoreKey] || 0,
      totalQuestions: 1 
    });

    const normalizedHistory = [
        ...raAttempts.map(a => normalize(a, 'RA', 'Read Aloud')),
        ...rsAttempts.map(a => normalize(a, 'RS', 'Repeat Sentence')),
        ...wfdAttempts.map(a => normalize(a, 'WFD', 'Write From Dictation', 'totalScore', 'createdAt')),
        ...roAttempts.map(a => normalize(a, 'RO', 'Reorder Paragraphs', 'score', 'createdAt')),
        
        ...rlAttempts.map(a => normalize(a, 'RL', 'Retell Lecture', 'score', 'createdAt')),
        ...asqAttempts.map(a => normalize(a, 'ASQ', 'Answer Short Question', 'score', 'createdAt')),
        ...swtAttempts.map(a => normalize(a, 'SWT', 'Summarize Written Text', 'score', 'createdAt')),
        ...essayAttempts.map(a => normalize(a, 'WE', 'Write Essay', 'score', 'createdAt')),
        ...diAttempts.map(a => normalize(a, 'DI', 'Describe Image', 'score', 'createdAt')),

        ...rfibdAttempts.map(a => normalize(a, 'RFIB-D', 'Reading FIB Dropdown', 'score', 'createdAt')),
        ...rfibddAttempts.map(a => normalize(a, 'RFIB-DD', 'Reading FIB Drag & Drop', 'score', 'createdAt')),
        ...rmcmaAttempts.map(a => normalize(a, 'R-MCQ-M', 'Reading MCQ Multi', 'score', 'createdAt')),
        ...rmcsaAttempts.map(a => normalize(a, 'R-MCQ-S', 'Reading MCQ Single', 'score', 'createdAt')),

        // Normalizing Missing Modules
        ...sstAttempts.map(a => normalize(a, 'SST', 'Summarize Spoken Text', 'score', 'createdAt')),
        ...lmcmaAttempts.map(a => normalize(a, 'L-MCQ-M', 'Listening MCQ Multi', 'score', 'createdAt')),
        ...lfibAttempts.map(a => normalize(a, 'LFIB', 'Listening FIB', 'score', 'createdAt')),
        ...hcsAttempts.map(a => normalize(a, 'HCS', 'Highlight Correct Summary', 'score', 'createdAt')),
        ...lcsaAttempts.map(a => normalize(a, 'L-MCQ-S', 'Listening MCQ Single', 'score', 'createdAt')),
        ...smwAttempts.map(a => normalize(a, 'SMW', 'Select Missing Word', 'score', 'createdAt')),
        ...hiwAttempts.map(a => normalize(a, 'HIW', 'Highlight Incorrect Words', 'score', 'createdAt')),
        ...sgdAttempts.map(a => normalize(a, 'SGD', 'Summarize Group Discussion', 'score', 'createdAt')),
        ...rtsAttempts.map(a => normalize(a, 'RTS', 'Respond to Situation', 'score', 'createdAt')),
    ];

    // --- 3. Sort and Slice for Final History ---
    const history = normalizedHistory
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 50); // increased limit for 'View All' purposes

    // --- 4. Calculate Average Mock Score ---
    const mockResults = await FullMockTestResult.find({ 
        user: userId, 
        status: 'completed' 
    }).select('overallScore');

    let mockScore = 0;
    if (mockResults.length > 0) {
        const totalScore = mockResults.reduce((sum, r) => sum + (r.overallScore || 0), 0);
        mockScore = Math.round(totalScore / mockResults.length);
    }

    // --- 5. Calculate Practice Stats ---
    const practiceStats = await calculatePracticeStatsHelper(userId);


    res.status(200).json({
      success: true,
      data: {
        history,
        mockScore,
        stats: practiceStats
      }
    });

  } catch (error) {
    console.error("Dashboard Data Fetch Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch dashboard data" });
  }
};


export const getPracticeStats = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const data = await calculatePracticeStatsHelper(userId);

        res.status(200).json({
            success: true,
            data
        });

    } catch (error) {
        console.error("Practice Stats Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch practice stats" });
    }
};
