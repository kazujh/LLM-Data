const ChatSession = require('../models/chatModel');
const llmService = require('../services/llmService');
const { getFileContent } = require('../services/fileService');

class ChatController {
    async createSession(req, res) {
        try {
            console.log('Creating new session with body:', req.body);
            const { userId, title } = req.body;
            const session = new ChatSession({ 
                userId: userId || 'testUser', 
                title: title || 'New Chat' 
            });
            await session.save();
            console.log('Session created:', session._id);
            res.status(201).json(session);
        } catch (error) {
            console.error('Create session error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async sendMessage(req, res) {
        try {
            console.log('Received message request:', req.body);
            const { sessionId, message, llmProvider, fileIds = [] } = req.body;
            
            // Validation
            if (!sessionId) {
                console.error('No sessionId provided');
                return res.status(400).json({ error: 'sessionId is required' });
            }
            if (!message) {
                console.error('No message provided');
                return res.status(400).json({ error: 'message is required' });
            }
            if (!llmProvider) {
                console.error('No llmProvider specified');
                return res.status(400).json({ error: 'llmProvider is required' });
            }

            // Get file contents
            let context = '';
            if (fileIds && fileIds.length > 0) {
                console.log('Processing files:', fileIds);
                try {
                    const fileContents = await Promise.all(
                        fileIds.map(async (fileId) => {
                            const content = await getFileContent(fileId);
                            return `File content:\n${content}\n---\n`;
                        })
                    );
                    context = fileContents.join('\n');
                    console.log('File context loaded');
                } catch (error) {
                    console.error('Error loading file contents:', error);
                }
            }

            // Get LLM response
            console.log('Requesting LLM response from:', llmProvider);
            let llmResponse;
            try {
                switch (llmProvider) {
                    case 'gemini':
                        llmResponse = await llmService.queryGemini(message, context);
                        break;
                    case 'claude':
                        llmResponse = await llmService.queryClaude(message, context);
                        break;
                    default:
                        throw new Error(`Invalid LLM provider: ${llmProvider}`);
                }
                console.log('Received LLM response');
            } catch (error) {
                console.error('LLM error:', error);
                return res.status(500).json({ 
                    error: `Error getting LLM response: ${error.message}` 
                });
            }

            // Save to session
            console.log('Saving to session:', sessionId);
            const session = await ChatSession.findById(sessionId);
            if (!session) {
                console.error('Session not found:', sessionId);
                return res.status(404).json({ error: 'Chat session not found' });
            }

            session.messages.push(
                { 
                    role: 'user', 
                    content: message, 
                    llmProvider,
                    fileReferences: fileIds 
                },
                { 
                    role: 'assistant', 
                    content: llmResponse, 
                    llmProvider 
                }
            );
            session.updatedAt = Date.now();
            await session.save();
            console.log('Session updated successfully');

            // Send response
            console.log('Sending response to client');
            res.json({ response: llmResponse });
        } catch (error) {
            console.error('Send message error:', error);
            res.status(500).json({ 
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }

    async getSessionHistory(req, res) {
        try {
            const { sessionId } = req.params;
            console.log('Getting history for session:', sessionId);
            const session = await ChatSession.findById(sessionId);
            if (!session) {
                console.error('Session not found:', sessionId);
                return res.status(404).json({ error: 'Chat session not found' });
            }
            res.json(session);
        } catch (error) {
            console.error('Get session history error:', error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new ChatController(); 