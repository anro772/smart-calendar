// src/services/aiService.js
import axios from 'axios';

// Use Vite environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Fetch AI suggestions for an event (used by Calendar.jsx)
 * @param {string} eventDescription - Description of the event
 * @returns {Promise<Object>} - Suggestions text and color
 */
export const fetchAISuggestions = async (eventDescription) => {
    try {
        const response = await axios.post(`${API_URL}/suggestions`, {
            description: eventDescription
        });

        // The response should now include both suggestions and color
        return {
            suggestions: response.data.suggestions || "",
            color: response.data.color || "#3b82f6" // Default to blue if no color is provided
        };
    } catch (error) {
        console.error('Error fetching AI suggestions:', error);
        return {
            suggestions: "Failed to get AI suggestions. Please try again later.",
            color: "#3b82f6" // Default to blue on error
        };
    }
};

/**
 * Alternative name for fetchAISuggestions (for consistency)
 * @param {string} description - Event description
 * @returns {Promise<string>} - Suggestions for the event
 */
export const getEventSuggestions = async (description) => {
    return fetchAISuggestions(description);
};

/**
 * Get AI-generated summary of upcoming events
 * @param {Array} events - Array of event objects
 * @returns {Promise<string>} - HTML formatted summary
 */
export const getEventSummary = async (events) => {
    try {
        // Format events for API if they're Date objects
        const formattedEvents = events.map(event => ({
            id: event.id,
            title: event.title,
            start: event.start instanceof Date ? event.start.toISOString() : event.start,
            end: event.end instanceof Date ? event.end.toISOString() : event.end,
            description: event.description || ''
        }));

        const response = await axios.post(`${API_URL}/summary`, {
            events: formattedEvents
        });

        // Return just the summary string if that's what Dashboard expects
        return response.data.summary || response.data;
    } catch (error) {
        console.error('Error getting event summary:', error);
        throw new Error('Failed to get event summary');
    }
};

// Export any other AI-related functions as needed