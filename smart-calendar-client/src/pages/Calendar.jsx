import React, { useState, useEffect } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import { addDoc, collection, query, where, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import EventModal from '../components/EventModal.jsx';
import { fetchAISuggestions } from '../services/aiService.js';
import enUS from 'date-fns/locale/en-US';

// Icons
const CalendarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
    </svg>
);

const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);

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
                        color: data.color
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

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Calendar</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        View and manage your schedule
                    </p>
                </div>
                <div className="flex items-center space-x-3">
                    <div className="inline-flex rounded-md shadow-sm" role="group">
                        <button
                            type="button"
                            onClick={() => setView('month')}
                            className={`px-4 py-2 text-sm font-medium rounded-l-md ${view === 'month'
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            Month
                        </button>
                        <button
                            type="button"
                            onClick={() => setView('week')}
                            className={`px-4 py-2 text-sm font-medium border-t border-b ${view === 'week'
                                    ? 'bg-primary-600 text-white border-primary-600'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            Week
                        </button>
                        <button
                            type="button"
                            onClick={() => setView('day')}
                            className={`px-4 py-2 text-sm font-medium border-t border-b border-r rounded-r-md ${view === 'day'
                                    ? 'bg-primary-600 text-white border-primary-600'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
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
                        className="btn-primary inline-flex items-center"
                    >
                        <PlusIcon className="mr-1" /> Add Event
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                {loading ? (
                    <div className="h-[600px] flex items-center justify-center">
                        <div className="flex flex-col items-center space-y-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
                            <p className="text-gray-600 dark:text-gray-400">Loading calendar...</p>
                        </div>
                    </div>
                ) : (
                    <BigCalendar
                        localizer={localizer}
                        events={events}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: 'calc(100vh - 240px)', minHeight: '600px' }}
                        onSelectSlot={handleSelectSlot}
                        onSelectEvent={handleSelectEvent}
                        selectable
                        view={view}
                        onView={setView}
                        eventPropGetter={(event) => ({
                            style: {
                                backgroundColor: event.color || '#3174ad'
                            }
                        })}
                        dayPropGetter={(date) => {
                            const today = new Date();
                            return {
                                className:
                                    date.getDate() === today.getDate() &&
                                        date.getMonth() === today.getMonth() &&
                                        date.getFullYear() === today.getFullYear()
                                        ? 'rbc-today'
                                        : '',
                                style: {
                                    backgroundColor: ''
                                }
                            };
                        }}
                        components={{
                            toolbar: (toolbarProps) => (
                                <div className="rbc-toolbar">
                                    <span className="rbc-btn-group">
                                        <button type="button" onClick={() => toolbarProps.onNavigate('TODAY')}>Today</button>
                                        <button type="button" onClick={() => toolbarProps.onNavigate('PREV')}>Back</button>
                                        <button type="button" onClick={() => toolbarProps.onNavigate('NEXT')}>Next</button>
                                    </span>
                                    <span className="rbc-toolbar-label">{toolbarProps.label}</span>
                                    <span className="rbc-btn-group hidden">
                                        {toolbarProps.views.map(name => (
                                            <button
                                                key={name}
                                                type="button"
                                                onClick={() => toolbarProps.onView(name)}
                                                className={toolbarProps.view === name ? 'rbc-active' : ''}
                                            >
                                                {name}
                                            </button>
                                        ))}
                                    </span>
                                </div>
                            )
                        }}
                    />
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