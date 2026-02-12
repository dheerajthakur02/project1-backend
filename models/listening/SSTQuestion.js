import e from 'express';
import mongoose from 'mongoose';

const SSTQuestionSchema = new mongoose.Schema({
    title: String,
    audioUrl: String,
        transcript: {
        type: String,
        required: true,
    },
    answer: String,
    cloudinaryId: String,
    keywords: [String], // Important for content scoring
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
    isPredictive: { type: Boolean, default: false }
});


const SSTAttemptSchema = new mongoose.Schema({
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'SSTQuestion' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    summaryText: String,
    wordCount: Number,
    scores: {
        content: Number,    // Max 4
        form: Number,       // Max 2
        grammar: Number,    // Max 2
        vocabulary: Number, // Max 2
        spelling: Number,   // Max 2
        convention: Number  // Average of Content + Form
    },
    totalScore: Number,      // Max 12
    overallScore: Number,    // Scaled to 90
    timeTaken: Number,
    createdAt: { type: Date, default: Date.now }
});


export const SSTAttempt = mongoose.model('SSTAttempt', SSTAttemptSchema);
export const SSTQuestion = mongoose.model('SSTQuestion', SSTQuestionSchema);
