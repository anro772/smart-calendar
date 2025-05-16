import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

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
            end
            // We're not setting a custom color anymore
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {selectedEvent ? 'Edit Event' : 'Add New Event'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                        aria-label="Close"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Modal Body */}
                <form onSubmit={handleSubmit}>
                    <div className="px-6 py-4">
                        {/* Title */}
                        <div className="mb-4">
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Title
                            </label>
                            <input
                                id="title"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                placeholder="Event title"
                                required
                            />
                        </div>

                        {/* Description */}
                        <div className="mb-4">
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Description
                            </label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows="3"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                placeholder="Add a description"
                            />

                            <div className="mt-2">
                                <button
                                    type="button"
                                    onClick={handleGetSuggestions}
                                    disabled={!description.trim() || isLoadingSuggestions}
                                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${!description.trim() || isLoadingSuggestions
                                            ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                            : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700'
                                        }`}
                                >
                                    {isLoadingSuggestions ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Getting suggestions...
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                                            </svg>
                                            Get AI Suggestions
                                        </>
                                    )}
                                </button>
                            </div>

                            {aiSuggestions && (
                                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-md">
                                    <div className="flex">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                                        </svg>
                                        <div className="ml-2">
                                            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-400">
                                                AI Suggestions:
                                            </h4>
                                            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                                                {aiSuggestions}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Date and Time Group */}
                        <div className="mb-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Start Date
                                    </label>
                                    <input
                                        id="startDate"
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Start Time
                                    </label>
                                    <input
                                        id="startTime"
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mb-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        End Date
                                    </label>
                                    <input
                                        id="endDate"
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        End Time
                                    </label>
                                    <input
                                        id="endTime"
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Removed the color selection section */}
                    </div>

                    {/* Modal Footer */}
                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 flex justify-between rounded-b-lg">
                        {selectedEvent ? (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md ${confirmDelete
                                        ? 'bg-red-600 text-white hover:bg-red-700'
                                        : 'border border-red-300 text-red-700 bg-white hover:bg-red-50 dark:bg-transparent dark:text-red-400 dark:border-red-500 dark:hover:bg-red-900/20'
                                    }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
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
                                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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