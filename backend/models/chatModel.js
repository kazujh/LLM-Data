const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    role: { type: String, required: true },
    content: { type: String, required: true },
    llmProvider: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    fileReferences: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }]
});

const chatSessionSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    title: String,
    messages: [messageSchema],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChatSession', chatSessionSchema); 