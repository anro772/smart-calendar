import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

// Import CSS file
import '../styles/EventModal.css';

// Predefined color options
const colorOptions = [
    { id: 'blue', value: '#3b82f6', label: 'Blue' },
    { id: 'purple', value: '#8b5cf6', label: 'Purple' },
    { id: 'red', value: '#ef4444', label: 'Red' },
    { id: 'green', value: '#10b981', label: 'Green' },
    { id: 'amber', value: '#f59e0b', label: 'Amber' },
    { id: 'pink', value: '#ec4899', label: 'Pink' }
];

function EventModal({
    show,
    onClose,
    selectedEvent,
    selectedDate,
    onSave,
    onUpdate,
    onDelete,
    getSuggestions,
    aiSuggestions, // Expected: null or { suggestions: "text" | ["text1", "text2"], color: "#hex" }
    isLoadingSuggestions
}) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endDate, setEndDate] = useState('');
    const [endTime, setEndTime] = useState('');
    const [selectedColor, setSelectedColor] = useState(colorOptions[0].value);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [displayedAiSuggestedColor, setDisplayedAiSuggestedColor] = useState('');

    useEffect(() => {
        if (selectedEvent) {
            setTitle(selectedEvent.title || '');
            setDescription(selectedEvent.description || '');
            setStartDate(format(selectedEvent.start, 'yyyy-MM-dd'));
            setStartTime(format(selectedEvent.start, 'HH:mm'));
            setEndDate(format(selectedEvent.end, 'yyyy-MM-dd'));
            setEndTime(format(selectedEvent.end, 'HH:mm'));
            setSelectedColor(selectedEvent.color || colorOptions[0].value);
        } else if (selectedDate) {
            const startDateObj = selectedDate.start;
            setTitle('');
            setDescription('');
            setStartDate(format(startDateObj, 'yyyy-MM-dd'));
            setStartTime(format(startDateObj, 'HH:mm'));
            const endDateObj = new Date(startDateObj);
            endDateObj.setHours(23, 59, 0);
            setEndDate(format(endDateObj, 'yyyy-MM-dd'));
            setEndTime('23:59');
            setSelectedColor(colorOptions[0].value);
        }
        setDisplayedAiSuggestedColor('');
    }, [selectedEvent, selectedDate]);

    useEffect(() => {
        if (aiSuggestions && aiSuggestions.color) {
            setDisplayedAiSuggestedColor(aiSuggestions.color);
        } else {
            setDisplayedAiSuggestedColor('');
        }
    }, [aiSuggestions]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const start = new Date(`${startDate}T${startTime}`);
        const end = new Date(`${endDate}T${endTime}`);
        const eventData = { title, description, start, end, color: selectedColor };
        if (selectedEvent) {
            onUpdate(selectedEvent.id, eventData);
        } else {
            onSave(eventData);
        }
        onClose();
    };

    const handleDelete = () => {
        if (confirmDelete) {
            if (selectedEvent) {
                onDelete(selectedEvent.id);
                onClose();
            }
        } else {
            setConfirmDelete(true);
        }
    };

    const handleGetSuggestions = () => {
        if (description.trim()) {
            getSuggestions(description);
        }
    };

    const handleApplyAiSuggestions = () => {
        if (!aiSuggestions) return;

        let suggestionTextToApply = "";

        if (typeof aiSuggestions.suggestions === 'string') {
            suggestionTextToApply = aiSuggestions.suggestions.trim();
        } else if (Array.isArray(aiSuggestions.suggestions)) {
            // Join array elements with newlines for applying to the textarea
            suggestionTextToApply = aiSuggestions.suggestions.join('\n').trim();
        } else if (aiSuggestions.suggestions) {
            // If suggestions exist but isn't a string or array, log a warning
            console.warn("AI suggestions text is in an unexpected format:", aiSuggestions.suggestions);
        }

        if (suggestionTextToApply) {
            setDescription(prev => {
                const currentDesc = prev.trim();
                // For applying, we'll just join with newlines. Display can be a list.
                const formattedAiDesc = Array.isArray(aiSuggestions.suggestions)
                    ? aiSuggestions.suggestions.map(s => `- ${s}`).join('\n') // Add dashes for textarea
                    : suggestionTextToApply;

                return currentDesc
                    ? `${currentDesc}\n\n---\nAI Suggestions:\n${formattedAiDesc}`
                    : formattedAiDesc;
            });
        }

        if (aiSuggestions.color) {
            setSelectedColor(aiSuggestions.color);
        }
    };

    if (!show) return null;

    const hasSuggestionsContent = aiSuggestions && (
        (typeof aiSuggestions.suggestions === 'string' && aiSuggestions.suggestions.trim() !== "") ||
        (Array.isArray(aiSuggestions.suggestions) && aiSuggestions.suggestions.length > 0) ||
        aiSuggestions.color
    );

    return (
        <div className="event-modal-backdrop">
            <div className="event-modal-container">
                <div className="event-modal-header">
                    <h2 className="event-modal-title">
                        {selectedEvent ? 'Edit Event' : 'Add New Event'}
                    </h2>
                    <button onClick={onClose} className="event-modal-close-button" aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="event-modal-body">
                        <div className="form-group">
                            <label htmlFor="title" className="form-label">Title</label>
                            <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="form-input" placeholder="Event title" required />
                        </div>

                        <div className="form-group">
                            <label htmlFor="description" className="form-label">Description</label>
                            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="form-textarea" placeholder="Add a description" />
                            <div className="mt-2">
                                <button type="button" onClick={handleGetSuggestions} disabled={!description.trim() || isLoadingSuggestions} className={`ai-suggestion-button ${!description.trim() || isLoadingSuggestions ? 'btn-disabled' : ''}`}>
                                    {isLoadingSuggestions ? (
                                        <><svg className="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="1em" height="1em"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Getting suggestions...</>
                                    ) : (
                                        <><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="btn-icon"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" /></svg>Get AI Suggestions</>
                                    )}
                                </button>
                            </div>

                            {aiSuggestions && hasSuggestionsContent && (
                                <div className="ai-suggestions-box">
                                    <div className="ai-suggestions-title">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="ai-suggestions-icon">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                                        </svg>
                                        AI Suggestions:
                                    </div>

                                    {aiSuggestions.suggestions && (
                                        typeof aiSuggestions.suggestions === 'string' && aiSuggestions.suggestions.trim() ? (
                                            <p className="ai-suggestions-content">
                                                {aiSuggestions.suggestions}
                                            </p>
                                        ) : Array.isArray(aiSuggestions.suggestions) && aiSuggestions.suggestions.length > 0 ? (
                                            <ul className="ai-suggestions-list">
                                                {aiSuggestions.suggestions.map((item, index) => (
                                                    <li key={index}>{item}</li>
                                                ))}
                                            </ul>
                                        ) : aiSuggestions.suggestions ? ( // If suggestions exist but not string/array or empty
                                            <p className="ai-suggestions-content text-gray-500">No text suggestions provided or format error.</p>
                                        ) : null
                                    )}

                                    {displayedAiSuggestedColor && (
                                        <div className="ai-suggested-color">
                                            <span className="ai-suggested-color-label">Suggested color:</span>
                                            <div className="ai-color-preview" style={{ backgroundColor: displayedAiSuggestedColor }} title="AI suggested color"></div>
                                        </div>
                                    )}
                                    <div className="ai-suggestions-actions">
                                        <button type="button" onClick={handleApplyAiSuggestions} className="apply-suggestions-button">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="btn-icon"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                                            Apply AI Suggestions
                                        </button>
                                    </div>
                                </div>
                            )}
                            {aiSuggestions && !hasSuggestionsContent && !isLoadingSuggestions && (
                                <div className="ai-suggestions-box">
                                    <p className="ai-suggestions-content text-gray-500">AI did not provide specific suggestions for this input.</p>
                                </div>
                            )}
                        </div>

                        {/* Date and Time Inputs */}
                        <div className="form-group">
                            <div className="form-grid">
                                <div>
                                    <label htmlFor="startDate" className="form-label">Start Date</label>
                                    <input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="form-input" required />
                                </div>
                                <div>
                                    <label htmlFor="startTime" className="form-label">Start Time</label>
                                    <input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="form-input" required />
                                </div>
                            </div>
                        </div>
                        <div className="form-group">
                            <div className="form-grid">
                                <div>
                                    <label htmlFor="endDate" className="form-label">End Date</label>
                                    <input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="form-input" required />
                                </div>
                                <div>
                                    <label htmlFor="endTime" className="form-label">End Time</label>
                                    <input id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="form-input" required />
                                </div>
                            </div>
                        </div>

                        {/* Color Selection */}
                        <div className="form-group">
                            <label className="form-label">Event Color</label>
                            <div className="color-options">
                                {colorOptions.map((color) => (
                                    <button key={color.id} type="button" className={`color-option ${selectedColor === color.value ? 'color-selected' : ''}`} style={{ backgroundColor: color.value }} title={color.label} onClick={() => setSelectedColor(color.value)} aria-label={`Set event color to ${color.label}`}>
                                        {selectedColor === color.value && (
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="color-check-icon"><path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" /></svg>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="event-modal-footer">
                        {selectedEvent ? (
                            <button type="button" onClick={handleDelete} className={`btn ${confirmDelete ? 'btn-danger-solid' : 'btn-danger'}`}>
                                {confirmDelete ? 'Confirm Delete' : 'Delete'}
                            </button>
                        ) : (
                            <div></div>
                        )}
                        <div className="flex space-x-3">
                            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                            <button type="submit" className="btn btn-primary">{selectedEvent ? 'Update Event' : 'Save Event'}</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default EventModal;