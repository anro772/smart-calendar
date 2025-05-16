const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenAI } = require('@google/genai');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Set up Google Generative AI (Gemini) with proper API key format
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.post('/api/suggestions', async (req, res) => {
    try {
        const { description } = req.body;

        if (!description) {
            return res.status(400).json({ error: 'Description is required' });
        }

        // Generate content with Gemini
        const response = await genAI.models.generateContent({
            model: "gemini-2.0-flash",
            contents: `You are a helpful assistant that provides suggestions for calendar events. Provide short, practical advice for planning this event.
            
            I'm planning this event: ${description}. Can you give me some suggestions or tips for it?`
        });

        const suggestions = response.text;

        res.json({ suggestions });
    } catch (error) {
        console.error('Error generating suggestions:', error);
        res.status(500).json({ error: 'Failed to generate suggestions', details: error.message });
    }
});

app.post('/api/summary', async (req, res) => {
    try {
        const { events } = req.body;

        if (!events || !Array.isArray(events) || events.length === 0) {
            return res.status(400).json({ error: 'Valid events array is required' });
        }

        // Format events for the prompt
        const eventsText = events.map(event =>
            `- ${event.title} on ${new Date(event.start).toLocaleDateString()} from ${new Date(event.start).toLocaleTimeString()} to ${new Date(event.end).toLocaleTimeString()}: ${event.description || 'No description'}`
        ).join('\n');

        // Generate content with Gemini
        const response = await genAI.models.generateContent({
            model: "gemini-2.0-flash",
            contents: `You are a helpful assistant that summarizes upcoming calendar events. Provide a concise summary of the events, highlighting important deadlines and suggesting any preparations needed.
            
            Here are my upcoming events:
            ${eventsText}
            
            Can you provide a brief summary of my schedule and any preparations I should make?`
        });

        const summary = response.text;

        res.json({ summary });
    } catch (error) {
        console.error('Error generating summary:', error);
        res.status(500).json({ error: 'Failed to generate summary', details: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});