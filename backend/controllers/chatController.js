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
            const { sessionId, message, llmProvider, fileIds = [] } = req.body;
            console.log('Processing message with files:', fileIds);
            
            if (!sessionId || !message || !llmProvider) {
                return res.status(400).json({ 
                    error: 'sessionId, message, and llmProvider are required' 
                });
            }

            // Get file contents
            let context = '';
            if (fileIds && fileIds.length > 0) {
                try {
                    const fileContents = await Promise.all(
                        fileIds.map(async (fileId) => {
                            const content = await getFileContent(fileId);
                            return `File content:\n${content}\n---\n`;
                        })
                    );
                    context = fileContents.join('\n');
                    console.log('File context loaded:', context.substring(0, 100) + '...');
                } catch (error) {
                    console.error('Error loading file contents:', error);
                }
            }

            // Get LLM response
            let llmResponse;
            try {
                const fullPrompt = context 
                    ? `Context from uploaded files:\n${context}\n\nUser question: ${message}`
                    : message;
                
                console.log('Sending to LLM with context:', !!context);
                
                switch (llmProvider) {
                    case 'gemini':
                        llmResponse = await llmService.queryGemini(fullPrompt);
                        break;
                    case 'claude':
                        llmResponse = await llmService.queryClaude(fullPrompt);
                        break;
                    default:
                        throw new Error('Invalid LLM provider');
                }
            } catch (error) {
                console.error('LLM error:', error);
                throw new Error(`Error getting LLM response: ${error.message}`);
            }

            // Save to session
            const session = await ChatSession.findById(sessionId);
            if (!session) {
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

            console.log('Sending LLM response to client');
            res.json({ response: llmResponse });
        } catch (error) {
            console.error('Send message error:', error);
            res.status(500).json({ error: error.message });
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