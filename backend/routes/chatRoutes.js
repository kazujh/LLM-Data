const express = require('express');
const chatController = require('../controllers/chatController');

const router = express.Router();

router.post('/sessions', chatController.createSession);
router.post('/messages', chatController.sendMessage);
router.get('/sessions/:sessionId', chatController.getSessionHistory);

module.exports = router; 