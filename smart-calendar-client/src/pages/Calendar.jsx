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

    // Fetch events from Firestore
    useEffect(() => {
        if (currentUser) {
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
        <div className="calendar-container">
            <h1>My Calendar</h1>

            <BigCalendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 500 }}
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleSelectEvent}
                selectable
                eventPropGetter={(event) => ({
                    style: {
                        backgroundColor: event.color || '#3174ad'
                    }
                })}
            />

            {showModal && (
                <EventModal
                    show={showModal}
                    onClose={() => setShowModal(false)}
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