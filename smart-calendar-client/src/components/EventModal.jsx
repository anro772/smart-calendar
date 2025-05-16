import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import './EventModal.css';

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
    const [color, setColor] = useState('#3174ad');

    useEffect(() => {
        // If editing an existing event
        if (selectedEvent) {
            setTitle(selectedEvent.title || '');
            setDescription(selectedEvent.description || '');
            setStartDate(format(selectedEvent.start, 'yyyy-MM-dd'));
            setStartTime(format(selectedEvent.start, 'HH:mm'));
            setEndDate(format(selectedEvent.end, 'yyyy-MM-dd'));
            setEndTime(format(selectedEvent.end, 'HH:mm'));
            setColor(selectedEvent.color || '#3174ad');
        }
        // If creating a new event
        else if (selectedDate) {
            setStartDate(format(selectedDate.start, 'yyyy-MM-dd'));
            setStartTime(format(selectedDate.start, 'HH:mm'));
            setEndDate(format(selectedDate.end, 'yyyy-MM-dd'));
            setEndTime(format(selectedDate.end, 'HH:mm'));
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
            color
        };

        if (selectedEvent) {
            onUpdate(selectedEvent.id, eventData);
        } else {
            onSave(eventData);
        }

        onClose();
    };

    const handleDelete = () => {
        if (selectedEvent) {
            onDelete(selectedEvent.id);
            onClose();
        }
    };

    const handleGetSuggestions = () => {
        if (description.trim()) {
            getSuggestions(description);
        }
    };

    if (!show) return null;

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>{selectedEvent ? 'Edit Event' : 'Add New Event'}</h2>
                    <button onClick={onClose} className="close-button">×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="title">Title</label>
                        <input
                            id="title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="description">Description</label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows="3"
                        />
                        <div className="suggestion-controls">
                            <button
                                type="button"
                                onClick={handleGetSuggestions}
                                disabled={!description.trim() || isLoadingSuggestions}
                                className="suggestion-button"
                            >
                                {isLoadingSuggestions ? 'Getting suggestions...' : 'Get AI Suggestions'}
                            </button>
                        </div>

                        {aiSuggestions && (
                            <div className="ai-suggestions">
                                <h4>AI Suggestions:</h4>
                                <p>{aiSuggestions}</p>
                            </div>
                        )}
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="startDate">Start Date</label>
                            <input
                                id="startDate"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="startTime">Start Time</label>
                            <input
                                id="startTime"
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="endDate">End Date</label>
                            <input
                                id="endDate"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="endTime">End Time</label>
                            <input
                                id="endTime"
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="color">Event Color</label>
                        <input
                            id="color"
                            type="color"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                        />
                    </div>

                    <div className="modal-footer">
                        {selectedEvent && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="delete-button"
                            >
                                Delete
                            </button>
                        )}
                        <button type="submit" className="save-button">
                            {selectedEvent ? 'Update' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default EventModal;