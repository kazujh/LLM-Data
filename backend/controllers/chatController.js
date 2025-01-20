const ChatSession = require('../models/chatModel');
const llmService = require('../services/llmService');
const { getFileContent } = require('../services/fileService');

class ChatController {
    async createSession(req, res) {
        try {
            const { userId, title } = req.body;
            const session = new ChatSession({ userId, title });
            await session.save();
            res.status(201).json(session);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async sendMessage(req, res) {
        try {
            const { sessionId, message, llmProvider, fileIds } = req.body;
            
            // Get file contents if fileIds are provided
            let context = '';
            if (fileIds && fileIds.length > 0) {
                const fileContents = await Promise.all(
                    fileIds.map(fileId => getFileContent(fileId))
                );
                context = fileContents.join('\n\n');
            }

            // Get LLM response
            let llmResponse;
            switch (llmProvider) {
                case 'gemini':
                    llmResponse = await llmService.queryGemini(message, context);
                    break;
                case 'gpt':
                    llmResponse = await llmService.queryGPT(message, context);
                    break;
                case 'claude':
                    llmResponse = await llmService.queryClaude(message, context);
                    break;
                default:
                    throw new Error('Invalid LLM provider');
            }

            // Save messages to session
            const session = await ChatSession.findById(sessionId);
            session.messages.push(
                { role: 'user', content: message, llmProvider, fileReferences: fileIds },
                { role: 'assistant', content: llmResponse, llmProvider }
            );
            session.updatedAt = Date.now();
            await session.save();

            res.json({ response: llmResponse });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getSessionHistory(req, res) {
        try {
            const { sessionId } = req.params;
            const session = await ChatSession.findById(sessionId);
            res.json(session);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new ChatController(); 