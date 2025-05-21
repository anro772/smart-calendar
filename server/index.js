const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenAI, HarmBlockThreshold, HarmCategory, Type } = require('@google/genai');

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
// Support both /api/suggestions and /suggestions endpoints for compatibility
app.post(['/api/suggestions', '/suggestions'], async (req, res) => {
    try {
        const { description } = req.body;

        if (!description) {
            return res.status(400).json({ error: 'Description is required' });
        }

        // Generate content with Gemini
        const response = await genAI.models.generateContent({
            model: "gemini-2.0-flash",
            contents: `You are a helpful assistant that provides suggestions for calendar events. Provide short, practical advice for planning this event, and suggest an appropriate color for the event based on its type or mood.
            
            I'm planning this event: ${description}. Can you give me some suggestions or tips for it, and also suggest a color that would best represent this type of event?
            
            Return your response as a JSON object with "suggestions" for the text suggestions and "color" for the color suggestion. For color, provide one of these hex values only:
            - blue: #3b82f6 (default for work/business)
            - purple: #8b5cf6 (for creative or learning)
            - red: #ef4444 (for urgent/important)
            - green: #10b981 (for health/wellness/nature)
            - amber: #f59e0b (for social/fun)
            - pink: #ec4899 (for personal/family)`,
            config: {
                responseMimeType: "application/json"
            }
        });

        // Parse the JSON response
        let responseData;
        try {
            responseData = JSON.parse(response.text);
            res.json(responseData);
        } catch (parseError) {
            console.error('Error parsing JSON response:', parseError);
            // Fallback for non-JSON responses
            res.json({
                suggestions: response.text,
                color: "#3b82f6" // Default to blue
            });
        }
    } catch (error) {
        console.error('Error generating suggestions:', error);
        res.status(500).json({
            error: 'Failed to generate suggestions',
            details: error.message,
            suggestions: "Unable to get suggestions at this time.",
            color: "#3b82f6" // Default to blue
        });
    }
});

app.post(['/api/summary', '/summary'], async (req, res) => {
    try {
        const { events } = req.body;

        if (!events || !Array.isArray(events) || events.length === 0) {
            return res.status(400).json({ error: 'Valid events array is required' });
        }

        // Format events for the prompt - make it more concise to avoid large responses
        const eventsText = events.map(event =>
            `- "${event.title}" on ${new Date(event.start).toLocaleDateString()}: ${event.description ? event.description.substring(0, 100) + (event.description.length > 100 ? '...' : '') : 'No description'}`
        ).join('\n');

        // Use a more structured prompt to guide Gemini
        try {
            // Break down the request into smaller chunks to avoid JSON parsing issues
            // First, get a concise summary of each event
            const eventSummariesResponse = await genAI.models.generateContent({
                model: "gemini-2.0-flash",
                contents: `For each of these calendar events, provide a very brief 1-2 sentence highlight (not a copy of the description):
                
                ${eventsText}
                
                Return ONLY a JSON array where each item has "title" and "highlight" keys, with no introduction or explanation:`,
                config: {
                    temperature: 0.2,  // Lower temperature for more consistent output
                    maxOutputTokens: 800,
                    responseMimeType: "application/json"
                }
            });

            let eventSummaries = [];
            try {
                // Try to parse the event summaries
                const summariesText = eventSummariesResponse.text.trim();
                // Sometimes Gemini wraps JSON in unnecessary markdown blocks - try to extract just the JSON
                const jsonMatch = summariesText.match(/```json\s*([\s\S]*?)\s*```/) ||
                    summariesText.match(/```\s*([\s\S]*?)\s*```/) ||
                    [null, summariesText];
                eventSummaries = JSON.parse(jsonMatch[1] || summariesText);
            } catch (error) {
                console.error("Error parsing event summaries:", error);
                // Create fallback summaries if parsing fails
                eventSummaries = events.map(event => ({
                    title: event.title,
                    highlight: "Key event in your schedule."
                }));
            }

            // Now, get preparations
            const preparationsResponse = await genAI.models.generateContent({
                model: "gemini-2.0-flash",
                contents: `Based on these upcoming events:
                
                ${eventsText}
                
                Provide 3-5 specific preparation actions the person should take. Return ONLY a JSON array of strings, with no introduction:`,
                config: {
                    temperature: 0.3,
                    maxOutputTokens: 400,
                    responseMimeType: "application/json"
                }
            });

            let preparations = [];
            try {
                const prepText = preparationsResponse.text.trim();
                const jsonMatch = prepText.match(/```json\s*([\s\S]*?)\s*```/) ||
                    prepText.match(/```\s*([\s\S]*?)\s*```/) ||
                    [null, prepText];
                preparations = JSON.parse(jsonMatch[1] || prepText);
            } catch (error) {
                console.error("Error parsing preparations:", error);
                preparations = [
                    "Review all event details in advance",
                    "Set reminders for each upcoming event",
                    "Prepare any necessary materials",
                    "Confirm attendance with relevant parties"
                ];
            }

            // Finally, get priorities
            const prioritiesResponse = await genAI.models.generateContent({
                model: "gemini-2.0-flash",
                contents: `Based on these upcoming events:
                
                ${eventsText}
                
                Provide 3-5 specific priority items the person should focus on. Return ONLY a JSON array of strings, with no introduction:`,
                config: {
                    temperature: 0.3,
                    maxOutputTokens: 400,
                    responseMimeType: "application/json"
                }
            });

            let priorities = [];
            try {
                const prioritiesText = prioritiesResponse.text.trim();
                const jsonMatch = prioritiesText.match(/```json\s*([\s\S]*?)\s*```/) ||
                    prioritiesText.match(/```\s*([\s\S]*?)\s*```/) ||
                    [null, prioritiesText];
                priorities = JSON.parse(jsonMatch[1] || prioritiesText);
            } catch (error) {
                console.error("Error parsing priorities:", error);
                priorities = [
                    "Focus on the most time-sensitive events first",
                    "Allocate adequate preparation time for each event",
                    "Follow up on any outstanding commitments",
                    "Balance your schedule to avoid overcommitment"
                ];
            }

            // Get a brief overview
            const overviewResponse = await genAI.models.generateContent({
                model: "gemini-2.0-flash",
                contents: `Based on these upcoming events:
                
                ${eventsText}
                
                Provide a very brief 1-2 sentence overview of the upcoming schedule. Return ONLY the text with no quotation marks or formatting:`,
                config: {
                    temperature: 0.3,
                    maxOutputTokens: 150
                }
            });

            const overview = overviewResponse.text.trim();

            // Now build the complete summary data
            const summaryData = {
                overview: overview,
                events: events.map((event, index) => {
                    const summary = eventSummaries[index] || { highlight: "Important event on your calendar." };
                    return {
                        title: event.title,
                        date: new Date(event.start).toLocaleDateString(),
                        time: `${new Date(event.start).toLocaleTimeString()} - ${new Date(event.end).toLocaleTimeString()}`,
                        description: event.description || "No description provided.",
                        key_points: [summary.highlight || "Key event in your schedule."]
                    };
                }),
                preparations: preparations,
                priorities: priorities
            };

            // Generate HTML summary
            const formattedSummary = formatSummaryFromJSON(summaryData);

            // Send response
            res.json({
                summary: formattedSummary,
                rawData: summaryData
            });

        } catch (geminiError) {
            console.error('Error with Gemini API:', geminiError);
            // Create fallback summary if any part of the Gemini calls fail
            const fallbackSummary = createFallbackSummary(events);
            const formattedSummary = formatSummaryFromJSON(fallbackSummary);

            res.json({
                summary: formattedSummary,
                rawData: fallbackSummary,
                note: "Using fallback data due to API error"
            });
        }

    } catch (error) {
        console.error('Error generating summary:', error);
        // If all else fails, send a minimal response
        res.status(500).json({
            error: 'Failed to generate summary',
            details: error.message,
            summary: '<div class="structured-summary"><p class="summary-overview">Unable to generate a summary at this time. Please try again later.</p></div>'
        });
    }
});

// Helper function to create a fallback summary when Gemini fails
function createFallbackSummary(events) {
    return {
        overview: "Here's a summary of your upcoming events.",
        events: events.map(event => ({
            title: event.title,
            date: new Date(event.start).toLocaleDateString(),
            time: `${new Date(event.start).toLocaleTimeString()} - ${new Date(event.end).toLocaleTimeString()}`,
            description: event.description || "No description provided.",
            key_points: ["Review details for this event."]
        })),
        preparations: [
            "Review details for all upcoming events",
            "Set reminders on your phone or calendar",
            "Check for any schedule conflicts",
            "Prepare necessary materials in advance"
        ],
        priorities: [
            "Attend to time-sensitive events first",
            "Confirm attendance for all events",
            "Allow enough travel time between events",
            "Follow up on any required actions"
        ]
    };
}

// Updated function to format the JSON summary using the correct CSS classes
function formatSummaryFromJSON(data) {
    let formattedSummary = `<div class="structured-summary">`;

    // Add overview
    if (data.overview) {
        formattedSummary += `<p class="summary-overview">${data.overview}</p>`;
    }

    // Add events
    if (data.events && data.events.length > 0) {
        formattedSummary += `
            <div class="summary-events">
                <h3 class="summary-section-title">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="structured-summary-icon">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    Events
                </h3>`;

        data.events.forEach(event => {
            formattedSummary += `
                <div class="summary-event">
                    <div class="summary-event-header">
                        <h4 class="summary-event-title">${event.title}</h4>
                        <span class="summary-event-time">${event.date} • ${event.time}</span>
                    </div>
                    ${event.description ? `<p class="summary-event-description">${event.description}</p>` : ''}
                    ${event.key_points && event.key_points.length > 0 ?
                    `<ul class="summary-event-points">
                            ${event.key_points.map(point => `<li>${point}</li>`).join('')}
                        </ul>` : ''
                }
                </div>
            `;
        });
        formattedSummary += `</div>`;
    }

    // Add preparations (with fallback for missing data)
    if (data.preparations && data.preparations.length > 0) {
        formattedSummary += `
            <div class="summary-preparations">
                <h3 class="summary-section-title">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="structured-summary-icon">
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                        <path d="M9 14l2 2 4-4"></path>
                    </svg>
                    Preparations
                </h3>
                <ul class="summary-list">
                    ${data.preparations.map(prep => `<li>${prep}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    // Add priorities (with fallback for missing data)
    if (data.priorities && data.priorities.length > 0) {
        formattedSummary += `
            <div class="summary-priorities">
                <h3 class="summary-section-title">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="structured-summary-icon">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    Priorities
                </h3>
                <ul class="summary-list">
                    ${data.priorities.map(priority => `<li>${priority}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    formattedSummary += `</div>`;

    return formattedSummary;
}

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});