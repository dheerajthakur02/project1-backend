import mongoose from 'mongoose';

const WriteFromDictationQuestionSchema = new mongoose.Schema({
    title: String,
    audioUrl: String,
    transcript: String, // The correct sentence
    cloudinaryId: String,
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
    isPredictive: { type: Boolean, default: false }
});


const WriteFromDictationAttemptSchema = new mongoose.Schema({
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'WriteFromDictationQuestion' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    studentTranscript: String,
    wordAnalysis: [{
        word: String,
        status: { type: String, enum: ['correct', 'incorrect', 'missing', 'extra'] }
    }],
    scores: {
        listening: Number,
        writing: Number
    },
    totalScore: Number, // Scaled to 10
    timeTaken: Number,
    createdAt: { type: Date, default: Date.now }
});


export const WriteFromDictationAttempt = mongoose.model('WriteFromDictationAttempt', WriteFromDictationAttemptSchema);
export const WriteFromDictationQuestion = mongoose.model('WriteFromDictationQuestion', WriteFromDictationQuestionSchema);
