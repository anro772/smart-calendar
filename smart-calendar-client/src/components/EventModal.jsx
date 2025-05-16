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
    aiSuggestions,
    isLoadingSuggestions
}) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endDate, setEndDate] = useState('');
    const [endTime, setEndTime] = useState('');
    const [selectedColor, setSelectedColor] = useState(colorOptions[0].value); // Default to blue
    const [confirmDelete, setConfirmDelete] = useState(false);

    useEffect(() => {
        // If editing an existing event
        if (selectedEvent) {
            setTitle(selectedEvent.title || '');
            setDescription(selectedEvent.description || '');
            setStartDate(format(selectedEvent.start, 'yyyy-MM-dd'));
            setStartTime(format(selectedEvent.start, 'HH:mm'));
            setEndDate(format(selectedEvent.end, 'yyyy-MM-dd'));
            setEndTime(format(selectedEvent.end, 'HH:mm'));
            // Set the color if it exists, otherwise default to blue
            setSelectedColor(selectedEvent.color || colorOptions[0].value);
        }
        // If creating a new event
        else if (selectedDate) {
            setStartDate(format(selectedDate.start, 'yyyy-MM-dd'));
            setStartTime(format(selectedDate.start, 'HH:mm'));
            setEndDate(format(selectedDate.end, 'yyyy-MM-dd'));
            setEndTime(format(selectedDate.end, 'HH:mm'));
            setSelectedColor(colorOptions[0].value); // Default to blue for new events
        }
    }, [selectedEvent, selectedDate]);

    const handleSubmit = (e) => {
        e.preventDefault();

        const start = new Date(`${startDate}T${startTime}`);
        const end = new Date(`${endDate}T${endTime}`);

        const eventData = {
            title,
            description,
            start,
            end,
            color: selectedColor // Include the selected color
        };

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

    if (!show) return null;

    return (
        <div className="event-modal-backdrop">
            <div className="event-modal-container">
                {/* Modal Header */}
                <div className="event-modal-header">
                    <h2 className="event-modal-title">
                        {selectedEvent ? 'Edit Event' : 'Add New Event'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="event-modal-close-button"
                        aria-label="Close"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Modal Body */}
                <form onSubmit={handleSubmit}>
                    <div className="event-modal-body">
                        {/* Title */}
                        <div className="form-group">
                            <label htmlFor="title" className="form-label">
                                Title
                            </label>
                            <input
                                id="title"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="form-input"
                                placeholder="Event title"
                                required
                            />
                        </div>

                        {/* Description */}
                        <div className="form-group">
                            <label htmlFor="description" className="form-label">
                                Description
                            </label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="form-textarea"
                                placeholder="Add a description"
                            />

                            <div className="mt-2">
                                <button
                                    type="button"
                                    onClick={handleGetSuggestions}
                                    disabled={!description.trim() || isLoadingSuggestions}
                                    className={`ai-suggestion-button ${!description.trim() || isLoadingSuggestions ? 'btn-disabled' : ''}`}
                                >
                                    {isLoadingSuggestions ? (
                                        <>
                                            <svg className="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="1em" height="1em">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Getting suggestions...
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="btn-icon">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                                            </svg>
                                            Get AI Suggestions
                                        </>
                                    )}
                                </button>
                            </div>

                            {aiSuggestions && (
                                <div className="ai-suggestions-box">
                                    <div className="ai-suggestions-title">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="ai-suggestions-icon">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                                        </svg>
                                        AI Suggestions:
                                    </div>
                                    <p className="ai-suggestions-content">
                                        {aiSuggestions}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Date and Time Group */}
                        <div className="form-group">
                            <div className="form-grid">
                                <div>
                                    <label htmlFor="startDate" className="form-label">
                                        Start Date
                                    </label>
                                    <input
                                        id="startDate"
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="form-input"
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="startTime" className="form-label">
                                        Start Time
                                    </label>
                                    <input
                                        id="startTime"
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="form-input"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <div className="form-grid">
                                <div>
                                    <label htmlFor="endDate" className="form-label">
                                        End Date
                                    </label>
                                    <input
                                        id="endDate"
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="form-input"
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="endTime" className="form-label">
                                        End Time
                                    </label>
                                    <input
                                        id="endTime"
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="form-input"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Color Selection */}
                        <div className="form-group">
                            <label className="form-label">Event Color</label>
                            <div className="color-options">
                                {colorOptions.map((color) => (
                                    <button
                                        key={color.id}
                                        type="button"
                                        className={`color-option ${selectedColor === color.value ? 'color-selected' : ''}`}
                                        style={{ backgroundColor: color.value }}
                                        title={color.label}
                                        onClick={() => setSelectedColor(color.value)}
                                        aria-label={`Set event color to ${color.label}`}
                                    >
                                        {selectedColor === color.value && (
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="color-check-icon">
                                                <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="event-modal-footer">
                        {selectedEvent ? (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className={`btn ${confirmDelete ? 'btn-danger-solid' : 'btn-danger'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="btn-icon">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                </svg>
                                {confirmDelete ? 'Confirm Delete' : 'Delete'}
                            </button>
                        ) : (
                            <div></div> // Empty div for spacing
                        )}
                        <div className="flex space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                            >
                                {selectedEvent ? 'Update Event' : 'Save Event'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default EventModal;