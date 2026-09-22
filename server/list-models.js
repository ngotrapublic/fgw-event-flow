require('dotenv').config({ path: './.env' });
const { GoogleGenAI } = require('@google/genai');

(async () => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.list();
        for (const model of response.models) {
            console.log(model.name);
        }
    } catch (e) {
        console.error("ERROR:", e);
    }
})();
