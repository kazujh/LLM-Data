const mongoose = require('mongoose');

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'aidata';

async function connectToMongoDB() {
    try {
        await mongoose.connect(`${uri}/${dbName}`, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
        });
        console.log('Connected to MongoDB successfully');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
}

function getDatabase() {
    return mongoose.connection.db;
}

async function closeMongoDB() {
    try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
    } catch (err) {
        console.error('Error closing MongoDB connection:', err);
    }
}

module.exports = { connectToMongoDB, getDatabase, closeMongoDB };