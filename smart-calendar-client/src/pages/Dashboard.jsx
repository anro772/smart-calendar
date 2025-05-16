import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getEventSummary } from '../services/aiService.js';
import './Dashboard.css';

function Dashboard() {
    const { currentUser } = useAuth();
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [eventSummary, setEventSummary] = useState('');
    const [loading, setLoading] = useState(true);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [error, setError] = useState(null);

    function formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Simple function to fetch events
    const getEventsWithSimpleQuery = async (now, nextWeek) => {
        const eventsRef = collection(db, 'events');
        const simpleQuery = query(
            eventsRef,
            where('userId', '==', currentUser.uid)
        );

        const querySnapshot = await getDocs(simpleQuery);
        const result = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const startDate = data.start.toDate();

            // Filter dates in JavaScript
            if (startDate >= now && startDate <= nextWeek) {
                result.push({
                    id: doc.id,
                    title: data.title,
                    start: startDate,
                    end: data.end.toDate(),
                    description: data.description
                });
            }
        });

        return result;
    };

    // Function to fetch events with complex query
    const getEventsWithComplexQuery = async (now, nextWeek) => {
        const eventsRef = collection(db, 'events');
        const complexQuery = query(
            eventsRef,
            where('userId', '==', currentUser.uid),
            where('start', '>=', now),
            where('start', '<=', nextWeek)
        );

        const querySnapshot = await getDocs(complexQuery);
        const result = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            result.push({
                id: doc.id,
                title: data.title,
                start: data.start.toDate(),
                end: data.end.toDate(),
                description: data.description
            });
        });

        return result;
    };

    useEffect(() => {
        async function fetchUpcomingEvents() {
            if (!currentUser) return;

            try {
                const now = new Date();
                const nextWeek = new Date();
                nextWeek.setDate(now.getDate() + 7);

                let fetchedEvents = [];

                // Try the complex query first
                try {
                    fetchedEvents = await getEventsWithComplexQuery(now, nextWeek);
                } catch (indexError) {
                    // If it fails, use the simple query
                    if (indexError.message.includes('index')) {
                        setError('Please create the required Firestore index by clicking the link in the console error message.');
                        fetchedEvents = await getEventsWithSimpleQuery(now, nextWeek);
                    } else {
                        throw indexError;
                    }
                }

                // Sort events by start date
                fetchedEvents.sort((a, b) => a.start - b.start);
                setUpcomingEvents(fetchedEvents);

                // Generate AI summary if we have events
                if (fetchedEvents.length > 0) {
                    try {
                        setSummaryLoading(true);
                        const summary = await getEventSummary(fetchedEvents);
                        setEventSummary(summary);
                    } catch (error) {
                        console.error('Error getting event summary:', error);
                        setEventSummary('Unable to generate summary at this time.');
                    } finally {
                        setSummaryLoading(false);
                    }
                }
            } catch (error) {
                console.error('Error fetching upcoming events:', error);
                setError('Error loading events. Please check console for details.');
            } finally {
                setLoading(false);
            }
        }

        fetchUpcomingEvents();
    }, [currentUser]);

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1>Welcome to your Smart Calendar</h1>
                <p>Manage your events and get AI-powered insights</p>
            </div>

            {error && (
                <div className="error-banner">
                    <p>{error}</p>
                    <p>For optimal performance, please check the console for a link to create the required index.</p>
                </div>
            )}

            <div className="dashboard-content">
                <div className="dashboard-card upcoming-events">
                    <h2>Upcoming Events</h2>

                    {loading ? (
                        <p className="loading-text">Loading events...</p>
                    ) : upcomingEvents.length > 0 ? (
                        <div className="events-list">
                            {upcomingEvents.map((event) => (
                                <div key={event.id} className="event-item">
                                    <div className="event-time">{formatDate(event.start)}</div>
                                    <div className="event-details">
                                        <h3>{event.title}</h3>
                                        {event.description && <p>{event.description}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="no-events">No upcoming events in the next 7 days.</p>
                    )}

                    <div className="card-footer">
                        <Link to="/calendar" className="view-calendar-button">
                            View Full Calendar
                        </Link>
                    </div>
                </div>

                {upcomingEvents.length > 0 && (
                    <div className="dashboard-card event-summary">
                        <h2>AI Schedule Summary</h2>

                        {summaryLoading ? (
                            <p className="loading-text">Generating your smart summary...</p>
                        ) : eventSummary ? (
                            <div className="summary-content">
                                <p>{eventSummary}</p>
                            </div>
                        ) : (
                            <p>No summary available.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;