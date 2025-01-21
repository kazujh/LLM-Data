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
        
        const files = await getFilesByIds(fileIds);
        return files.map(file => 
            `File: ${file.filename}\nContent:\n${file.content}\n---\n`
        ).join('\n');
    }

    async queryGemini(prompt, fileIds = []) {
        const context = await this.prepareContext(fileIds);
        const fullPrompt = context ? `Relevant files:\n${context}\n\nQuestion: ${prompt}` : prompt;
        
        const model = this.gemini.getGenerativeModel({ model: 'gemini-1.5-pro' });
        const result = await model.generateContent(fullPrompt);
        console.log(result.response.text());
        return result.response.text();
    }


    async queryClaude(prompt, fileIds = []) {
        const context = await this.prepareContext(fileIds);
        const fullPrompt = context ? `Relevant files:\n${context}\n\nQuestion: ${prompt}` : prompt;
        const messages = [];
        
        if (context) {
            messages.push({
                role: "user",
                content: `Here is the context:\n${context}`
            });
        }

        const payload = {
            model: "claude-v1", // Replace with your actual model
            max_tokens_to_sample: 1000, // Adjust based on your needs
            prompt: fullPrompt,
        };

        const response = await axios.post(this.apiUrl, payload, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY,
            },
        });
        
        messages.push({ role: "user", content: prompt });

        const message = await this.anthropic.messages.create({
            model: "claude-3-sonnet-20241022",
            max_tokens: 1000,
            messages: messages
        });

        return response.data.completion
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