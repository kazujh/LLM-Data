const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OpenAI } = require('openai');
const { Anthropic } = require('@anthropic-ai/sdk');
const axios = require('axios');
require('dotenv').config();
const { getFilesByIds } = require('./fileService');

class LLMService {
    constructor() {
        // Initialize LLM clients
        this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        this.llamaURL = "https://api-inference.huggingface.co/models/meta-llama/Llama-2-7b-hf";
    }

    async prepareContext(fileIds) {
        if (!fileIds || fileIds.length === 0) return '';
        
        try {
            const files = await getFilesByIds(fileIds);
            console.log('Retrieved files for context:', files.length);
            
            return files.map(file => 
                `File: ${file.filename}\nContent:\n${file.content}\n---\n`
            ).join('\n');
        } catch (error) {
            console.error('Error preparing context:', error);
            throw error;
        }
    }

    async queryGemini(prompt, fileIds = []) {
        try {
            const context = await this.prepareContext(fileIds);
            console.log('Context prepared:', context ? 'Yes' : 'No');
            
            const fullPrompt = context 
                ? `Context:\n${context}\n\nQuestion: ${prompt}` 
                : prompt;
            
            console.log('Sending prompt to Gemini');
            const model = this.gemini.getGenerativeModel({ model: 'gemini-1.5-pro' });
            const result = await model.generateContent(fullPrompt);
            
            console.log('Received response from Gemini');
            return result.response.text();
        } catch (error) {
            console.error('Gemini query error:', error);
            throw error;
        }
    }

    async queryClaude(prompt, fileIds = []) {
        try {
            const context = await this.prepareContext(fileIds);
            console.log('Context prepared:', context ? 'Yes' : 'No');
            
            const messages = [];
            if (context) {
                messages.push({
                    role: "user",
                    content: `Context:\n${context}`
                });
            }
            
            messages.push({ role: "user", content: prompt });
            
            console.log('Sending prompt to Claude');
            const response = await this.anthropic.messages.create({
                model: "claude-3-sonnet-20240229",
                max_tokens: 1000,
                messages: messages
            });
            
            console.log('Received response from Claude');
            return response.content[0].text;
        } catch (error) {
            console.error('Claude query error:', error);
            throw error;
        }
    }

    async queryLlama(prompt, fileIds = []) {
        const context = await this.prepareContext(fileIds);
        const fullPrompt = context ? `Relevant files:\n${context}\n\nQuestion: ${prompt}` : prompt;

        try {
            const response = await axios.post(
                this.llamaURL,
                { inputs: prompt },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.LLAMA_API_KEY}`,
                    },
                }
            );
            console.log("Llama 2 Response:", response.data);
        } catch (error) {
            console.error("Error calling Llama 2:", error.response?.data || error.message);
        }
    }
}
module.exports = new LLMService();