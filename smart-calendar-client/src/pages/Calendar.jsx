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

// Import the CSS file
import '../styles/Calendar.css';

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
                        description: data.description,
                        color: data.color || '#3b82f6' // Include color with default fallback
                    });
                });
                setEvents(eventsData);
                setLoading(false);
            });

            return unsubscribe;
        }
    }, [currentUser]);

    // Event style getter to apply custom colors
    const eventStyleGetter = (event) => {
        return {
            style: {
                backgroundColor: event.color,
                borderColor: event.color
            }
        };
    };

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
                            eventPropGetter={eventStyleGetter} // Add event style getter for colors
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