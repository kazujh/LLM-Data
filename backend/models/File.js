const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    name: String,
    data: Buffer,
    uploadDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('File', fileSchema); 