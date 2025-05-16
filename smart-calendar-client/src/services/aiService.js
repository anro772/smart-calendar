import axios from 'axios';

// We'll use our backend as a proxy to call Gemini API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const fetchAISuggestions = async (eventDescription) => {
    try {
        const response = await axios.post(`${API_URL}/suggestions`, {
            description: eventDescription
        });

        return response.data.suggestions;
    } catch (error) {
        console.error('Error fetching AI suggestions:', error);
        throw new Error('Failed to get AI suggestions');
    }
};

export const getEventSummary = async (events) => {
    try {
        const response = await axios.post(`${API_URL}/summary`, {
            events
        });

        return response.data.summary;
    } catch (error) {
        console.error('Error getting event summary:', error);
        throw new Error('Failed to get event summary');
    }
};