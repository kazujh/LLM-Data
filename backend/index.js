require('dotenv').config();
const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const fileRoutes = require('./routes/fileRoutes');
const chatRoutes = require('./routes/chatRoutes');
const { connectToMongoDB, closeMongoDB } = require('./services/dbService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/users', userRoutes);
app.use('/files', fileRoutes);
app.use('/chat', chatRoutes);

// Start server
app.listen(PORT, async () => {
    await connectToMongoDB();
    console.log(`Server running on port ${PORT}`);
});

// Cleanup
process.on('SIGINT', async () => {
    await closeMongoDB();
    console.log('MongoDB connection closed.');
    process.exit(0);
});
