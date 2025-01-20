const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OpenAI } = require('openai');
const { Anthropic } = require('@anthropic-ai/sdk');

class LLMService {
    constructor() {
        // Initialize LLM clients
        this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }

    async queryGemini(prompt, context) {
        const model = this.gemini.getGenerativeModel({ model: 'gemini-pro' });
        const result = await model.generateContent(prompt);
        return result.response.text();
    }

    async queryGPT(prompt, context) {
        const completion = await this.openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
        });
        return completion.choices[0].message.content;
    }

    async queryClaude(prompt, context) {
        const message = await this.anthropic.messages.create({
            model: "claude-3-sonnet-20240229",
            max_tokens: 1000,
            messages: [{ role: "user", content: prompt }]
        });
        return message.content[0].text;
    }
}

module.exports = new LLMService(); 