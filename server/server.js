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

app.post(['/api/summary', '/summary'], async (req, res) => {
    try {
        const { events } = req.body;

        if (!events || !Array.isArray(events) || events.length === 0) {
            return res.status(400).json({ error: 'Valid events array is required' });
        }

        // Format events for the prompt
        const eventsText = events.map(event =>
            `- ${event.title} on ${new Date(event.start).toLocaleDateString()} from ${new Date(event.start).toLocaleTimeString()} to ${new Date(event.end).toLocaleTimeString()}: ${event.description || 'No description'}`
        ).join('\n');

        // Generate structured content with Gemini using a schema
        const response = await genAI.models.generateContent({
            model: "gemini-2.0-flash",
            contents: `Analyze these upcoming calendar events and provide a structured summary:
            
            ${eventsText}
            
            Create a structured summary with important details and actionable advice. IMPORTANT: Always include preparations and priorities sections. Even for simple events, provide at least 2-3 preparations and 2-3 priorities.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        overview: {
                            type: Type.STRING,
                            description: "A brief summary of the schedule overall"
                        },
                        events: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: {
                                        type: Type.STRING,
                                        description: "The title of the event"
                                    },
                                    date: {
                                        type: Type.STRING,
                                        description: "The formatted date of the event"
                                    },
                                    time: {
                                        type: Type.STRING,
                                        description: "The formatted time of the event"
                                    },
                                    description: {
                                        type: Type.STRING,
                                        description: "Description of the event"
                                    },
                                    key_points: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.STRING
                                        },
                                        description: "Key points or highlights about this event"
                                    }
                                }
                            }
                        },
                        preparations: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.STRING
                            },
                            description: "List of preparations or actions needed for these events - ALWAYS include at least 2-3 items"
                        },
                        priorities: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.STRING
                            },
                            description: "Prioritized items that need attention - ALWAYS include at least 2-3 items"
                        }
                    }
                }
            }
        });

        // Parse the JSON response
        let summaryData;
        try {
            summaryData = JSON.parse(response.text);

            // Add default values if sections are missing
            if (!summaryData.overview) {
                summaryData.overview = "Here's a summary of your upcoming schedule.";
            }

            if (!summaryData.events || summaryData.events.length === 0) {
                summaryData.events = events.map(event => ({
                    title: event.title,
                    date: new Date(event.start).toLocaleDateString(),
                    time: `${new Date(event.start).toLocaleTimeString()} - ${new Date(event.end).toLocaleTimeString()}`,
                    description: event.description || "No description provided.",
                    key_points: ["Mark your calendar for this event."]
                }));
            }

            // Ensure preparations and priorities exist
            if (!summaryData.preparations || summaryData.preparations.length === 0) {
                summaryData.preparations = [
                    "Set reminders for your events",
                    "Review event details in advance",
                    "Update your calendar with any changes"
                ];
            }

            if (!summaryData.priorities || summaryData.priorities.length === 0) {
                summaryData.priorities = [
                    "Confirm attendance for upcoming events",
                    "Prepare any required materials",
                    "Plan travel time if needed"
                ];
            }

            // Generate a formatted HTML summary from the structured data
            const formattedSummary = formatSummaryFromJSON(summaryData);

            res.json({
                summary: formattedSummary,
                rawData: summaryData  // Include the raw data for advanced use cases
            });
        } catch (parseError) {
            console.error('Error parsing JSON response:', parseError);

            // Create a default summary if JSON parsing fails
            const defaultSummary = {
                overview: "Here's a summary of your upcoming schedule.",
                events: events.map(event => ({
                    title: event.title,
                    date: new Date(event.start).toLocaleDateString(),
                    time: `${new Date(event.start).toLocaleTimeString()} - ${new Date(event.end).toLocaleTimeString()}`,
                    description: event.description || "No description provided.",
                    key_points: ["Mark your calendar for this event."]
                })),
                preparations: [
                    "Set reminders for your events",
                    "Review event details in advance",
                    "Update your calendar with any changes"
                ],
                priorities: [
                    "Confirm attendance for upcoming events",
                    "Prepare any required materials",
                    "Plan travel time if needed"
                ]
            };

            const formattedSummary = formatSummaryFromJSON(defaultSummary);

            // Return fallback formatted content
            res.json({
                summary: formattedSummary,
                rawData: defaultSummary
            });
        }
    } catch (error) {
        console.error('Error generating summary:', error);

        // Create emergency fallback content when API fails completely
        try {
            const events = req.body.events || [];
            const fallbackSummary = {
                overview: "Here's a basic summary of your upcoming schedule.",
                events: events.map(event => ({
                    title: event.title || "Untitled Event",
                    date: new Date(event.start).toLocaleDateString(),
                    time: `${new Date(event.start).toLocaleTimeString()} - ${new Date(event.end).toLocaleTimeString()}`,
                    description: event.description || "No description provided.",
                    key_points: ["Event scheduled"]
                })),
                preparations: [
                    "Set reminders for your events",
                    "Review event details in advance",
                    "Update your calendar with any changes"
                ],
                priorities: [
                    "Confirm attendance for upcoming events",
                    "Prepare any required materials",
                    "Plan travel time if needed"
                ]
            };

            const formattedSummary = formatSummaryFromJSON(fallbackSummary);

            res.json({
                summary: formattedSummary,
                rawData: fallbackSummary,
                note: "Using fallback data due to API error"
            });
        } catch (fallbackError) {
            // If even the fallback fails, send a simple error
            res.status(500).json({
                error: 'Failed to generate summary',
                details: error.message,
                summary: '<div class="structured-summary"><p class="summary-overview">Unable to generate a summary at this time. Please try again later.</p></div>'
            });
        }
    }
});

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