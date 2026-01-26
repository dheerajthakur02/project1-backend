import FullMockTest from "../../models/mocktest/FullMockTest.js";
import FullMockTestResult from "../../models/mocktest/FullMockTestResult.js"; // Result Model
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { compareStrings } from "./speakingController.js";

// Speaking Models
import ReadAloud from "../../models/readAloud.model.js";
import RepeatSentence from "../../models/repeat.model.js";
import { ImageQuestion as DescribeImage } from "../../models/image.model.js";
import { RetellLectureQuestion as ReTellLecture } from "../../models/retell.model.js";
import { ShortAnswerQuestion as AnswerShortQuestion } from "../../models/shortAnswer.model.js";

// Writing Models
import { SummarizeTextQuestion as SummarizeWrittenText } from "../../models/writing/SummarizeText.js";
import { WriteEssayQuestion as WriteEssay } from "../../models/writing/Essay.js";

// Reading Models
import { ReadingFIBDropdown } from "../../models/readingFIBDropdown.model.js";
import { ReadingMultiChoiceMultiAnswer as ReadingMultiChoiceMulti } from "../../models/readingMultiChoiceMultiAnswer.model.js";
import { ReadingReorder } from "../../models/readingReorder.model.js";
import { ReadingFIBDragDrop } from "../../models/readingFIBDragDrop.model.js";
import { ReadingMultiChoiceSingleAnswer as ReadingMultiChoiceSingle } from "../../models/readingMultiChoiceSingleAnswer.model.js";

// Listening Models
import { SSTQuestion as SummarizeSpokenText } from "../../models/listening/SSTQuestion.js";
import { ListeningMultiChoiceMultiAnswer as ListeningMultiChoiceMulti } from "../../models/listening/ListeningMultiChoiceMultiAnswer.js";
import { ListeningFIBQuestion as ListeningFIB } from "../../models/listening/ListeningFIBQuestion.js";
import { HighlightSummaryQuestion as HighlightCorrectSummary } from "../../models/listening/HCSQuestion.js";
import { ChooseSingleAnswerQuestion as ListeningMultiChoiceSingle } from "../../models/listening/ChooseSingleAnswer.js";
import { SelectMissingWordQuestion as SelectMissingWord } from "../../models/listening/SelectMissingWord.js";
import { HIWQuestion as HighlightIncorrectWords } from "../../models/listening/HIW.js";
import { WriteFromDictationQuestion as WriteFromDictation } from "../../models/listening/WriteFromDictation.js";

const QUESTION_COUNTS = {
  // Speaking
  readAloud: 6,
  repeatSentence: 10,
  describeImage: 6,
  reTellLecture: 3,
  answerShortQuestion: 10,
  // Writing
  summarizeWrittenText: 2,
  writeEssay: 1, // Usually 1 or 2
  // Reading
  fillInTheBlanksDropdown: 5,
  multipleChoiceMultiple: 2,
  reOrderParagraphs: 2,
  fillInTheBlanksDragDrop: 4,
  multipleChoiceSingle: 2,
  // Listening
  summarizeSpokenText: 2,
  listeningMultiChoiceMultiple: 2,
  listeningFIB: 2,
  highlightCorrectSummary: 2,
  listeningMultiChoiceSingle: 2,
  selectMissingWord: 2,
  highlightIncorrectWords: 2,
  writeFromDictation: 3
};


const getUniqueQuestions = async (Model, count, usedIds) => {
  // 1. Try to find unique
  const uniqueQuestions = await Model.aggregate([
    { $match: { _id: { $nin: usedIds } } },
    { $sample: { size: count } }
  ]);

  if (uniqueQuestions.length === count) {
    return uniqueQuestions.map(q => q._id);
  }

  // 2. If not enough, fill with any randoms (Fallback)
  console.warn(`[FullMockTest] Not enough unique questions for ${Model.modelName}. Wanted ${count}, got ${uniqueQuestions.length} unique.`);
  
  const needed = count - uniqueQuestions.length;
  // Get more, excluding the ones we just picked (but allowing historically used ones)
  const currentPickedIds = uniqueQuestions.map(q => q._id);
  
  const fallbackQuestions = await Model.aggregate([
    { $match: { _id: { $nin: currentPickedIds } } },
    { $sample: { size: needed } }
  ]);

  return [...currentPickedIds, ...fallbackQuestions.map(q => q._id)];
};

/**
 * 🔒 HELPER: Resolve Questions
 * - If manualSection is provided (User explicit override): use strictly provided IDs or empty.
 * - If manualSection is missing (undefined): use Auto-Generation.
 */
const resolveIds = async (manualSection, key, Model, count, usedIds) => {
  if (manualSection && typeof manualSection === 'object') {
    const ids = manualSection[key];
    return Array.isArray(ids) ? ids : [];
  }
  return await getUniqueQuestions(Model, count, usedIds);
};


export const createFullMockTest = async (req, res) => {
  try {
    // 1. Gather all previously used question IDs from existing Full Mock Tests
    //    We only care about uniqueness relative to *other Full Mock Tests*.
    const allExistingTests = await FullMockTest.find().lean();
    
    let usedIds = [];
    allExistingTests.forEach(test => {
      // Speaking
      usedIds.push(...(test.speaking.readAloud || []));
      usedIds.push(...(test.speaking.repeatSentence || []));
      usedIds.push(...(test.speaking.describeImage || []));
      usedIds.push(...(test.speaking.reTellLecture || []));
      usedIds.push(...(test.speaking.answerShortQuestion || []));
      // Writing
      usedIds.push(...(test.writing.summarizeWrittenText || []));
      usedIds.push(...(test.writing.writeEssay || []));
      // Reading
      usedIds.push(...(test.reading.fillInTheBlanksDropdown || []));
      usedIds.push(...(test.reading.multipleChoiceMultiple || []));
      usedIds.push(...(test.reading.reOrderParagraphs || []));
      usedIds.push(...(test.reading.fillInTheBlanksDragDrop || []));
      usedIds.push(...(test.reading.multipleChoiceSingle || []));
      // Listening
      usedIds.push(...(test.listening.summarizeSpokenText || []));
      usedIds.push(...(test.listening.multipleChoiceMultiple || []));
      usedIds.push(...(test.listening.fillInTheBlanks || []));
      usedIds.push(...(test.listening.highlightCorrectSummary || []));
      usedIds.push(...(test.listening.multipleChoiceSingle || []));
      usedIds.push(...(test.listening.selectMissingWord || []));
      usedIds.push(...(test.listening.highlightIncorrectWords || []));
      usedIds.push(...(test.listening.writeFromDictation || []));
    });

    // Deduplicate usedIds (optimization)
    const uniqueUsedIds = [...new Set(usedIds.map(id => id.toString()))].map(id => new String(id)); 

    // 2. Fetch Questions for each section
    const { speaking, writing, reading, listening } = req.body;

    // -- Speaking --
    const ra = await resolveIds(speaking, 'readAloud', ReadAloud, QUESTION_COUNTS.readAloud, usedIds);
    const rs = await resolveIds(speaking, 'repeatSentence', RepeatSentence, QUESTION_COUNTS.repeatSentence, usedIds);
    const di = await resolveIds(speaking, 'describeImage', DescribeImage, QUESTION_COUNTS.describeImage, usedIds);
    const rl = await resolveIds(speaking, 'reTellLecture', ReTellLecture, QUESTION_COUNTS.reTellLecture, usedIds);
    const asq = await resolveIds(speaking, 'answerShortQuestion', AnswerShortQuestion, QUESTION_COUNTS.answerShortQuestion, usedIds);

    // -- Writing --
    const swt = await resolveIds(writing, 'summarizeWrittenText', SummarizeWrittenText, QUESTION_COUNTS.summarizeWrittenText, usedIds);
    const essay = await resolveIds(writing, 'writeEssay', WriteEssay, QUESTION_COUNTS.writeEssay, usedIds);

    // -- Reading --
    const fibR = await resolveIds(reading, 'fillInTheBlanksDropdown', ReadingFIBDropdown, QUESTION_COUNTS.fillInTheBlanksDropdown, usedIds);
    const fibRW = await resolveIds(reading, 'fillInTheBlanksDragDrop', ReadingFIBDragDrop, QUESTION_COUNTS.fillInTheBlanksDragDrop, usedIds); 
    const mcqmR = await resolveIds(reading, 'multipleChoiceMultiple', ReadingMultiChoiceMulti, QUESTION_COUNTS.multipleChoiceMultiple, usedIds);
    const ro = await resolveIds(reading, 'reOrderParagraphs', ReadingReorder, QUESTION_COUNTS.reOrderParagraphs, usedIds);
    const mcqsR = await resolveIds(reading, 'multipleChoiceSingle', ReadingMultiChoiceSingle, QUESTION_COUNTS.multipleChoiceSingle, usedIds);

    // -- Listening --
    const sst = await resolveIds(listening, 'summarizeSpokenText', SummarizeSpokenText, QUESTION_COUNTS.summarizeSpokenText, usedIds);
    const mcqmL = await resolveIds(listening, 'multipleChoiceMultiple', ListeningMultiChoiceMulti, QUESTION_COUNTS.listeningMultiChoiceMultiple, usedIds);
    const fibL = await resolveIds(listening, 'fillInTheBlanks', ListeningFIB, QUESTION_COUNTS.listeningFIB, usedIds);
    const hcs = await resolveIds(listening, 'highlightCorrectSummary', HighlightCorrectSummary, QUESTION_COUNTS.highlightCorrectSummary, usedIds);
    const mcqsL = await resolveIds(listening, 'multipleChoiceSingle', ListeningMultiChoiceSingle, QUESTION_COUNTS.listeningMultiChoiceSingle, usedIds);
    const smw = await resolveIds(listening, 'selectMissingWord', SelectMissingWord, QUESTION_COUNTS.selectMissingWord, usedIds);
    const hiw = await resolveIds(listening, 'highlightIncorrectWords', HighlightIncorrectWords, QUESTION_COUNTS.highlightIncorrectWords, usedIds);
    const wfd = await resolveIds(listening, 'writeFromDictation', WriteFromDictation, QUESTION_COUNTS.writeFromDictation, usedIds);


    // 3. Create the Test Object
    const newTest = new FullMockTest({
      title: req.body.title,
      speaking: {
        readAloud: ra,
        repeatSentence: rs,
        describeImage: di,
        reTellLecture: rl,
        answerShortQuestion: asq
      },
      writing: {
        summarizeWrittenText: swt,
        writeEssay: essay
      },
      reading: {
        fillInTheBlanksDropdown: fibR,
        multipleChoiceMultiple: mcqmR,
        reOrderParagraphs: ro,
        fillInTheBlanksDragDrop: fibRW,
        multipleChoiceSingle: mcqsR
      },
      listening: {
        summarizeSpokenText: sst,
        multipleChoiceMultiple: mcqmL,
        fillInTheBlanks: fibL,
        highlightCorrectSummary: hcs,
        multipleChoiceSingle: mcqsL,
        selectMissingWord: smw,
        highlightIncorrectWords: hiw,
        writeFromDictation: wfd
      }
    });

    await newTest.save();

    res.status(201).json({
      success: true,
      message: "Full Mock Test created successfully",
      data: newTest
    });

  } catch (error) {
    console.error("Error creating full mock test:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllFullMockTests = async (req, res) => {
  try {
    const tests = await FullMockTest.find().sort({ createdAt: -1 }).select("title isActive createdAt");
    res.status(200).json({ success: true, count: tests.length, data: tests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getFullMockTestById = async (req, res) => {
  try {
    const test = await FullMockTest.findById(req.params.id)
      // Speaking
      .populate("speaking.readAloud")
      .populate("speaking.repeatSentence")
      .populate("speaking.describeImage")
      .populate("speaking.reTellLecture")
      .populate("speaking.answerShortQuestion")
      // Writing
      .populate("writing.summarizeWrittenText")
      .populate("writing.writeEssay")
      // Reading
      .populate("reading.fillInTheBlanksDropdown")
      .populate("reading.multipleChoiceMultiple")
      .populate("reading.reOrderParagraphs")
      .populate("reading.fillInTheBlanksDragDrop")
      .populate("reading.multipleChoiceSingle")
      // Listening
      .populate("listening.summarizeSpokenText")
      .populate("listening.multipleChoiceMultiple")
      .populate("listening.fillInTheBlanks")
      .populate("listening.highlightCorrectSummary")
      .populate("listening.multipleChoiceSingle")
      .populate("listening.selectMissingWord")
      .populate("listening.highlightIncorrectWords")
      .populate("listening.writeFromDictation");

    if (!test) return res.status(404).json({ success: false, message: "Test not found" });

    res.status(200).json({ success: true, data: test });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ============================================================
   SCORING HELPERS (Adapted from Practice Controllers)
============================================================ */

const calculateEssayScore = (userText, question) => {
    if (!userText) return { score: 0, maxScore: 15 };
    
    const words = userText.trim().split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    let form = 0;
    if (wordCount >= 200 && wordCount <= 300) form = 2; 
    else if ((wordCount >= 120 && wordCount < 200) || (wordCount > 300 && wordCount <= 380)) form = 1;

    let content = 0;
    const keywords = question.keywords || [];
    if (keywords.length > 0) {
        const found = keywords.filter(k => userText.toLowerCase().includes(k.toLowerCase()));
        const coverage = found.length / keywords.length;
        if (coverage > 0.5) content = 3;
        else if (coverage > 0.2) content = 2;
        else if (coverage > 0) content = 1;
    } else {
        content = wordCount > 100 ? 3 : 1; 
    }

    let grammar = 2;
    let spelling = 2;
    let vocabulary = 2;
    if (wordCount < 100) { grammar = 1; vocabulary = 1; }
    
    let structure = userText.split('\n').length >= 3 ? 2 : 1;
    let general = 2;

    const rawScore = form + content + grammar + spelling + vocabulary + structure + general;
    return { score: rawScore, maxScore: 15 };
};

const calculateSSTScore = (userText, question) => {
    if (!userText) return { score: 0, maxScore: 10 };

    const words = userText.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    let form = 0;
    if (wordCount >= 50 && wordCount <= 70) form = 2;
    else if ((wordCount >= 40 && wordCount < 50) || (wordCount > 70 && wordCount <= 100)) form = 1;

    let content = 0;
    const targetWords = (question.answer || "").toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const uniqueTarget = [...new Set(targetWords)];
    const matches = uniqueTarget.filter(w => userText.toLowerCase().includes(w));
    const ratio = uniqueTarget.length > 0 ? matches.length / uniqueTarget.length : 0;
    
    if (ratio > 0.6) content = 2;
    else if (ratio > 0.3) content = 1;

    let grammar = /^[A-Z]/.test(userText) && /[.!?]$/.test(userText.trim()) ? 2 : 1;
    let spelling = 2;
    let vocabulary = 2;

    return { score: form + content + grammar + spelling + vocabulary, maxScore: 10 };
};

const calculateSimpleMatch = (userAns, question) => {
    if (!userAns) return { score: 0, maxScore: 10 };
    if (typeof userAns === 'string' && typeof question.answer === 'string') {
        const u = userAns.toLowerCase().trim();
        const a = question.answer.toLowerCase().trim();
        return u === a ? { score: 10, maxScore: 10 } : { score: 0, maxScore: 10 };
    }
    return { score: 0, maxScore: 10 };
};

const calculateReadingFIB = (userAns, question) => {
    if (!userAns) return { score: 0, maxScore: question.blanks?.length || 5 };
    let score = 0;
    let max = 0;

    if (question.blanks && Array.isArray(question.blanks)) {
        max = question.blanks.length;
        question.blanks.forEach(b => {
             const uVal = userAns[b.index] || userAns[b.index.toString()];
             if (uVal === b.correctAnswer) score += 1;
        });
    } else if (question.transcript) {
        max = 5; 
    }
    return { score, maxScore: max };
};
export const submitFullMockTest = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("[SubmitFullMock] User found:", req.user);
    if (!req.user || (!req.user._id && !req.user.id)) {
        return res.status(401).json({ success: false, message: "User not authenticated or ID missing in request." });
    }
    const userId = req.user._id || req.user.id;
    let answers = [];

    // 1. Parse Answers
    console.log("Raw answers type:", typeof req.body.answers);
    try {
      if (typeof req.body.answers === 'string') {
        answers = JSON.parse(req.body.answers);
      } else {
        answers = req.body.answers;
      }
      
      if (!Array.isArray(answers)) {
          console.error("Parsed answers is not an array:", answers);
          return res.status(400).json({ success: false, message: "Parsed answers must be an array" });
      }
    } catch (e) {
      console.error("Answer parsing error:", e);
      return res.status(400).json({ success: false, message: "Invalid answers format" });
    }

    // 2. Fetch Test Data (Populating critical sections for scoring)
    const testData = await FullMockTest.findById(id)
      .populate("speaking.readAloud")
      .populate("speaking.repeatSentence") 
      .populate("speaking.describeImage")
      .populate("speaking.reTellLecture")
      .populate("speaking.answerShortQuestion")
      // Writing
      .populate("writing.summarizeWrittenText")
      .populate("writing.writeEssay")
      // Reading
      .populate("reading.fillInTheBlanksDropdown")
      .populate("reading.multipleChoiceMultiple")
      .populate("reading.reOrderParagraphs")
      .populate("reading.fillInTheBlanksDragDrop")
      .populate("reading.multipleChoiceSingle")
      // Listening
      .populate("listening.summarizeSpokenText")
      .populate("listening.multipleChoiceMultiple")
      .populate("listening.fillInTheBlanks")
      .populate("listening.highlightCorrectSummary")
      .populate("listening.multipleChoiceSingle")
      .populate("listening.selectMissingWord")
      .populate("listening.highlightIncorrectWords")
      .populate("listening.writeFromDictation");

    if (!testData) return res.status(404).json({ success: false, message: "Test not found" });

    // 3. Process Answers
    // We will build the result structure matching FullMockTestResult schema
    const resultPayload = {
      user: userId,
      fullMockTestId: id,
      speaking: { score: 0, answers: [] },
      writing: { score: 0, answers: [] },
      reading: { score: 0, answers: [] },
      listening: { score: 0, answers: [] }
    };

    // Flatten all questions for easy lookup
    const allQuestionsMap = new Map();
    const addToMap = (list) => (list || []).forEach(q => allQuestionsMap.set(q._id.toString(), q));

    addToMap(testData.speaking.readAloud);
    addToMap(testData.speaking.repeatSentence);
    addToMap(testData.speaking.describeImage);
    addToMap(testData.speaking.reTellLecture);
    addToMap(testData.speaking.answerShortQuestion);
    // Writing
    addToMap(testData.writing.summarizeWrittenText);
    addToMap(testData.writing.writeEssay);
    // Reading
    addToMap(testData.reading.fillInTheBlanksDropdown);
    addToMap(testData.reading.multipleChoiceMultiple);
    addToMap(testData.reading.reOrderParagraphs);
    addToMap(testData.reading.fillInTheBlanksDragDrop);
    addToMap(testData.reading.multipleChoiceSingle);
    // Listening
    addToMap(testData.listening.summarizeSpokenText);
    addToMap(testData.listening.multipleChoiceMultiple);
    addToMap(testData.listening.fillInTheBlanks);
    addToMap(testData.listening.highlightCorrectSummary);
    addToMap(testData.listening.multipleChoiceSingle);
    addToMap(testData.listening.selectMissingWord);
    addToMap(testData.listening.highlightIncorrectWords);
    addToMap(testData.listening.writeFromDictation);

    // Helper to upload if exists
    const uploadAudio = async (questionId) => {
        // req.files is array if upload.any() used.
        // Frontend must Append file with name `audio_${questionId}`
        const file = (req.files || []).find(f => f.fieldname === `audio_${questionId}`);
        if (file) {
            try {
                const uploadRes = await cloudinary.uploader.upload(file.path, {
                    resource_type: "auto",
                    folder: "pte_mock_test"
                });
                // Cleanup local
                fs.unlink(file.path, (err) => { if(err) console.error("Failed to delete temp file:", err); });
                return uploadRes.secure_url;
            } catch (err) {
                console.error("Cloudinary upload failed", err);
                return null;
            }
        }
        return null;
    };

    // Parallel processing of answers
    for (const ans of answers) {
       // Identify Section
       // We can map type to section
       let section = "speaking";
       if (["SWT", "ESSAY"].includes(ans.type)) section = "writing";
       if (["FIB_R", "MCM", "RO", "FIB_RW", "MCS", "FIB_DD"].includes(ans.type)) section = "reading";
       if (["SST", "MCQ_L_M", "FIB_L", "HCS", "MCQ_L_S", "SMW", "HIW", "WFD"].includes(ans.type)) section = "listening";
       // Note: Frontend types might vary (e.g. READ_ALOUD vs RA). Assuming Frontend types match logic below.

       const processedAnswer = {
           questionId: ans.questionId,
           type: ans.type,
           userAnswer: ans.answer || ans.transcript || "",
           score: 0,
           maxScore: 10, // Default
           audioUrl: null
       };

       // Upload Audio if applicable
       if (["READ_ALOUD", "REPEAT_SENTENCE", "DESCRIBE_IMAGE", "RE_TELL_LECTURE"].includes(ans.type)) {
           processedAnswer.audioUrl = await uploadAudio(ans.questionId);
       }

/* ============================================================
   [REMOVED IN-LOOP HELPER DEFINITIONS]
============================================================ */

/* ============================================================ */

       // Scoring Logic (Refactored)
       const originalQ = allQuestionsMap.get(ans.questionId);
       
       if (originalQ) {
           // --- WRITING ---
           if (ans.type === "ESSAY" || ans.type === "WRITE_ESSAY") {
               const { score, maxScore } = calculateEssayScore(processedAnswer.userAnswer, originalQ);
               processedAnswer.score = score;
               processedAnswer.maxScore = maxScore;
           }
           else if (ans.type === "SWT" || ans.type === "SUMMARIZE_WRITTEN_TEXT") {
               // Similar to Essay but simpler
                const { score: sstScore } = calculateSSTScore(processedAnswer.userAnswer, originalQ); // Reuse SST logic for SWT roughly
                processedAnswer.score = sstScore; // SWT usually max 7 in PTE, SST is 10. Close enough for mock.
                processedAnswer.maxScore = 10;
           }

           // --- LISTENING ---
           else if (ans.type === "SST") {
               const { score, maxScore } = calculateSSTScore(processedAnswer.userAnswer, originalQ);
               processedAnswer.score = score;
               processedAnswer.maxScore = maxScore;
           }
           else if (["WFD", "WRITE_FROM_DICTATION"].includes(ans.type)) {
                // WFD is word matching
                const target = (originalQ.transcript || originalQ.text || "").toLowerCase().split(/\s+/);
                const userWords = (processedAnswer.userAnswer || "").toLowerCase().split(/\s+/);
                const matches = target.filter(w => userWords.includes(w)).length;
                processedAnswer.score = matches;
                processedAnswer.maxScore = target.length;
           }

           // --- READING / LISTENING FIB ---
           else if (["FIB_R", "FIB_RW", "FIB_L", "FIB_DD", "ReadingFIBDropdown", "ReadingFIBDragDrop"].includes(ans.type)) {
                // Use processedAnswer.userAnswer which contains the answer
                const { score, maxScore } = calculateReadingFIB(processedAnswer.userAnswer, originalQ);
                processedAnswer.score = score;
                processedAnswer.maxScore = maxScore;
           }

           // --- MCQs ---
           else if (["MCM", "MCS", "MCQ_L_M", "MCQ_L_S", "SMW", "HCS"].includes(ans.type)) {
               // Basic exact match for now. Real MCQ-M has negative marking usually.
               // Check if answer matches originalQ.correctAnswer/options
               // Assuming simple 1 point for correct
               const finalAns = processedAnswer.userAnswer;
               // Compare as JSON if object/array, or string
               const isCorrect = (JSON.stringify(finalAns) === JSON.stringify(originalQ.correctAnswer) || finalAns === originalQ.answer);
               processedAnswer.score = isCorrect ? 1 : 0;
               processedAnswer.maxScore = 1;
           }

           // --- SPEAKING (Simulation / Keyword) ---
           else if (["READ_ALOUD", "REPEAT_SENTENCE", "DESCRIBE_IMAGE", "RE_TELL_LECTURE"].includes(ans.type)) {
                 const text = originalQ.text || originalQ.content || "";
                 if (processedAnswer.userAnswer && text) {
                     // If transcript avail, compare
                     processedAnswer.score = compareStrings(text, processedAnswer.userAnswer);
                 } else {
                     // Audio Simulation
                     processedAnswer.score = processedAnswer.audioUrl ? Math.floor(Math.random() * 10) + 5 : 0;
                 }
                 processedAnswer.maxScore = 15;
           }
           else {
               // Default Fallback
               processedAnswer.score = 0;
           }

       } else {
           console.warn("Question not found for scoring:", ans.questionId);
           processedAnswer.score = 0;
       }

       resultPayload[section].answers.push(processedAnswer);
       resultPayload[section].score += processedAnswer.score;
    }

    console.log("Processed answers. Calculating overall score...");

    // Calculate Overall (Average of sections or Sum? PTE uses complex algorithm. We'll use Sum for now)
    resultPayload.overallScore = 
        (resultPayload.speaking.score || 0) + 
        (resultPayload.writing.score || 0) + 
        (resultPayload.reading.score || 0) + 
        (resultPayload.listening.score || 0);

    console.log("Saving resultPayload...", JSON.stringify(resultPayload, null, 2));

    // Save
    const finalResult = new FullMockTestResult(resultPayload);
    await finalResult.save();
    console.log("Result saved successfully.");

    res.status(200).json({ success: true, message: "Test submitted successfully", data: finalResult });

  } catch (error) {
    console.error("Submit Error Stack:", error.stack); // Log full stack
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserFullMockTestResults = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const results = await FullMockTestResult.find({ user: userId })
      .populate("fullMockTestId", "title")
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
