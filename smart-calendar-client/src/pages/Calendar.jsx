import React, { useState, useEffect } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import isSameDay from 'date-fns/isSameDay';
import isSameMonth from 'date-fns/isSameMonth';
import { addDoc, collection, query, where, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import EventModal from '../components/EventModal.jsx';
import { fetchAISuggestions } from '../services/aiService.js';
import enUS from 'date-fns/locale/en-US';

// Date-fns setup for the calendar
const locales = {
    'en-US': enUS
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales
});

// Improved calendar styles
const calendarStyles = `
/* Base calendar styles */
.rbc-calendar {
    background-color: white;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

/* Month view container */
.rbc-month-view {
    border: 1px solid #e0e0e0;
    background-color: white;
}

/* Day cells */
.rbc-day-bg {
    transition: background-color 0.15s ease;
}

/* Day cells hover effect */
.rbc-day-bg:hover {
    background-color: #f0f9ff;
}

/* Off-range days (previous/next month) */
.rbc-off-range-bg {
    background-color: #f8f9fa;
}

.rbc-off-range {
    color: #adb5bd;
}

/* Today's cell highlighting */
.rbc-today {
    background-color: #e6f7ff;
}

/* Header row styling */
.rbc-header {
    background-color: #f8f9fa;
    padding: 10px 0;
    font-weight: 600;
    border-bottom: 1px solid #e0e0e0;
    color: #343a40;  /* Darker text for better visibility in both light and dark modes */
}

/* Dark mode adjustments */
.dark .rbc-calendar {
    background-color: #1e1e1e;
    border-color: #4a4a4a;
}

.dark .rbc-month-view {
    border-color: #4a4a4a;
    background-color: #2d2d2d;
}

.dark .rbc-header {
    background-color: #333;
    border-color: #4a4a4a;
    color: #e0e0e0;  /* Light text for dark mode */
}

.dark .rbc-day-bg {
    background-color: #2d2d2d;
}

.dark .rbc-day-bg:hover {
    background-color: #3a3a3a;
}

.dark .rbc-today {
    background-color: #1a365d;  /* Dark blue for today in dark mode */
}

.dark .rbc-off-range-bg {
    background-color: #262626;
}

.dark .rbc-off-range {
    color: #666;
}

/* Event styling */
.rbc-event {
    border-radius: 4px;
    padding: 2px 5px;
    font-size: 0.85rem;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    margin: 1px 0;
    cursor: pointer;
    transition: all 0.15s ease;
}

.rbc-event:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

/* Toolbar styling */
.rbc-toolbar {
    padding: 15px;
    border-bottom: 1px solid #e0e0e0;
    margin-bottom: 0;
}

.dark .rbc-toolbar {
    border-color: #4a4a4a;
}

.rbc-toolbar-label {
    font-size: 1.25rem;
    font-weight: 600;
    color: #343a40;  /* Darker for better visibility */
}

.dark .rbc-toolbar-label {
    color: #e0e0e0;
}

.rbc-btn-group {
    margin-bottom: 0;
}

.rbc-btn-group button {
    color: #495057;
    border-color: #ced4da;
    background-color: white;
    transition: all 0.15s ease;
}

.rbc-btn-group button:hover {
    background-color: #f8f9fa;
    border-color: #adb5bd;
}

.rbc-btn-group button.rbc-active {
    background-color: #e6f7ff;
    color: #0366d6;
    border-color: #0366d6;
}

.dark .rbc-btn-group button {
    color: #e0e0e0;
    border-color: #4a4a4a;
    background-color: #333;
}

.dark .rbc-btn-group button:hover {
    background-color: #444;
    border-color: #666;
}

.dark .rbc-btn-group button.rbc-active {
    background-color: #1a365d;
    color: #63b3ed;
    border-color: #2b6cb0;
}

/* Time grid adjustments */
.rbc-time-content {
    border-top: 1px solid #e0e0e0;
}

.dark .rbc-time-content {
    border-color: #4a4a4a;
}

.rbc-time-header-content {
    border-left: 1px solid #e0e0e0;
}

.dark .rbc-time-header-content {
    border-color: #4a4a4a;
}

.rbc-timeslot-group {
    border-bottom: 1px solid #e9ecef;
}

.dark .rbc-timeslot-group {
    border-color: #3a3a3a;
}

.rbc-current-time-indicator {
    background-color: #dc3545;
    height: 2px;
}
`;

function Calendar() {
    const [events, setEvents] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const { currentUser } = useAuth();
    const [aiSuggestions, setAiSuggestions] = useState('');
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [view, setView] = useState('month');
    const [loading, setLoading] = useState(true);

    // Inject custom styles
    useEffect(() => {
        const styleElement = document.createElement('style');
        styleElement.innerHTML = calendarStyles;
        document.head.appendChild(styleElement);

        return () => {
            document.head.removeChild(styleElement);
        };
    }, []);

    // Fetch events from Firestore
    useEffect(() => {
        if (currentUser) {
            setLoading(true);
            const q = query(
                collection(db, 'events'),
                where('userId', '==', currentUser.uid)
            );

            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const eventsData = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    eventsData.push({
                        id: doc.id,
                        title: data.title,
                        start: data.start.toDate(),
                        end: data.end.toDate(),
                        description: data.description
                        // Removed custom color to use defaults
                    });
                });
                setEvents(eventsData);
                setLoading(false);
            });

            return unsubscribe;
        }
    }, [currentUser]);

    // Handle slot selection (creating a new event)
    const handleSelectSlot = (slotInfo) => {
        setSelectedEvent(null);
        setSelectedDate(slotInfo);
        setShowModal(true);
    };

    // Handle event selection (editing existing event)
    const handleSelectEvent = (event) => {
        setSelectedEvent(event);
        setSelectedDate(null);
        setShowModal(true);
    };

    // Add a new event to Firestore
    const addEvent = async (eventData) => {
        try {
            await addDoc(collection(db, 'events'), {
                ...eventData,
                userId: currentUser.uid
            });
        } catch (error) {
            console.error('Error adding event: ', error);
        }
    };

    // Update an existing event in Firestore
    const updateEvent = async (id, eventData) => {
        try {
            const eventRef = doc(db, 'events', id);
            await updateDoc(eventRef, eventData);
        } catch (error) {
            console.error('Error updating event: ', error);
        }
    };

    // Delete an event from Firestore
    const deleteEvent = async (id) => {
        try {
            await deleteDoc(doc(db, 'events', id));
        } catch (error) {
            console.error('Error deleting event: ', error);
        }
    };

    // Get AI suggestions for event planning
    const getSuggestions = async (eventDescription) => {
        setIsLoadingSuggestions(true);
        try {
            const suggestions = await fetchAISuggestions(eventDescription);
            setAiSuggestions(suggestions);
        } catch (error) {
            console.error('Error getting AI suggestions: ', error);
            setAiSuggestions('Unable to get suggestions at this time');
        } finally {
            setIsLoadingSuggestions(false);
        }
    };

    // Custom day cell renderer for better highlighting
    const dayPropGetter = date => {
        const today = new Date();

        if (isSameDay(date, today)) {
            return {
                className: 'rbc-today',
                style: {
                    fontWeight: 'bold'
                }
            };
        }

        if (!isSameMonth(date, today)) {
            return {
                className: 'rbc-off-range',
                style: {
                    opacity: 0.6
                }
            };
        }

        return {};
    };

    // Custom component for our toolbar
    function CustomToolbar(toolbar) {
        const goToBack = () => {
            toolbar.onNavigate('PREV');
        };

        const goToNext = () => {
            toolbar.onNavigate('NEXT');
        };

        const goToToday = () => {
            toolbar.onNavigate('TODAY');
        };

        return (
            <div className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex items-center space-x-4 mb-4 md:mb-0">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {toolbar.label}
                    </h2>
                    <div className="flex items-center space-x-2">
                        <button
                            type="button"
                            onClick={goToBack}
                            className="p-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                            </svg>
                        </button>
                        <button
                            type="button"
                            onClick={goToToday}
                            className="px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={goToNext}
                            className="p-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="inline-flex rounded-md shadow-sm" role="group">
                        <button
                            type="button"
                            onClick={() => toolbar.onView('month')}
                            className={`px-4 py-2 text-sm font-medium rounded-l-md border ${toolbar.view === 'month'
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            Month
                        </button>
                        <button
                            type="button"
                            onClick={() => toolbar.onView('week')}
                            className={`px-4 py-2 text-sm font-medium border-t border-b ${toolbar.view === 'week'
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            Week
                        </button>
                        <button
                            type="button"
                            onClick={() => toolbar.onView('day')}
                            className={`px-4 py-2 text-sm font-medium rounded-r-md border-t border-b border-r ${toolbar.view === 'day'
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            Day
                        </button>
                    </div>
                    <button
                        onClick={() => {
                            const now = new Date();
                            setSelectedEvent(null);
                            setSelectedDate({
                                start: now,
                                end: new Date(now.getTime() + 60 * 60 * 1000),
                            });
                            setShowModal(true);
                        }}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Add Event
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden mb-8">
                <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar</h1>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">
                        View and manage your schedule
                    </p>
                </div>

                {loading ? (
                    <div className="h-[600px] flex items-center justify-center">
                        <div className="flex flex-col items-center space-y-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                            <p className="text-gray-600 dark:text-gray-400">Loading calendar...</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800">
                        <BigCalendar
                            localizer={localizer}
                            events={events}
                            startAccessor="start"
                            endAccessor="end"
                            style={{ height: 'calc(100vh - 280px)', minHeight: '600px' }}
                            onSelectSlot={handleSelectSlot}
                            onSelectEvent={handleSelectEvent}
                            selectable
                            view={view}
                            onView={setView}
                            dayPropGetter={dayPropGetter}
                            components={{
                                toolbar: CustomToolbar
                            }}
                        />
                    </div>
                )}
            </div>

            {showModal && (
                <EventModal
                    show={showModal}
                    onClose={() => {
                        setShowModal(false);
                        setAiSuggestions('');
                    }}
                    selectedEvent={selectedEvent}
                    selectedDate={selectedDate}
                    onSave={addEvent}
                    onUpdate={updateEvent}
                    onDelete={deleteEvent}
                    getSuggestions={getSuggestions}
                    aiSuggestions={aiSuggestions}
                    isLoadingSuggestions={isLoadingSuggestions}
                />
            )}
        </div>
    );
}

export default Calendar;