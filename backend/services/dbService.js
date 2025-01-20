const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;
let client;

async function connectToMongoDB() {
    try {
        client = new MongoClient(uri);
        await client.connect();
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
        process.exit(1);
    }
}

function getDatabase() {
    if (!client) throw new Error('MongoDB not initialized');
    return client.db(dbName);
}

async function closeMongoDB() {
    if (client) {
        await client.close();
    }
}

module.exports = { connectToMongoDB, getDatabase, closeMongoDB };