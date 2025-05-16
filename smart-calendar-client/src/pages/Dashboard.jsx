import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getEventSummary } from '../services/aiService.js';

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
        });
    }

    function formatTime(date) {
        return new Date(date).toLocaleTimeString('en-US', {
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
                    description: data.description,
                    color: data.color || '#3174ad'
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
                description: data.description,
                color: data.color || '#3174ad'
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Page Header */}
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome to Smart Calendar</h1>
                <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
                    Manage your schedule with AI-powered insights
                </p>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 rounded">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-amber-500">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300">Attention needed</h3>
                            <div className="mt-2 text-sm text-amber-700 dark:text-amber-200">
                                <p>{error}</p>
                                <p className="mt-1">For optimal performance, please check the console for a link to create the required index.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upcoming Events Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 text-primary-600 dark:text-primary-500">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                                </svg>
                                Upcoming Events
                            </h2>
                            <Link to="/calendar" className="text-sm font-medium text-primary-600 dark:text-primary-500 hover:text-primary-700 dark:hover:text-primary-400">
                                View All →
                            </Link>
                        </div>
                    </div>

                    <div className="px-6 py-5">
                        {loading ? (
                            <div className="animate-pulse space-y-4">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                            </div>
                        ) : upcomingEvents.length > 0 ? (
                            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                {upcomingEvents.map((event) => (
                                    <div key={event.id} className="py-4 first:pt-0 last:pb-0">
                                        <div className="flex justify-between">
                                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">{event.title}</h3>
                                            <div className="flex items-center">
                                                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: event.color }}></span>
                                                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                                    {formatDate(event.start)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="mt-1 flex justify-between">
                                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                                                {event.description || "No description"}
                                            </p>
                                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                {formatTime(event.start)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                                </svg>
                                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No upcoming events</h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    You don't have any events scheduled for the next 7 days.
                                </p>
                                <div className="mt-6">
                                    <Link to="/calendar" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700">
                                        Add New Event
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>

                    {upcomingEvents.length > 0 && (
                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                            <Link
                                to="/calendar"
                                className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                                </svg>
                                View Full Calendar
                            </Link>
                        </div>
                    )}
                </div>

                {/* AI Insights Card */}
                {upcomingEvents.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 text-primary-600 dark:text-primary-500">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                                </svg>
                                AI Schedule Summary
                            </h2>
                        </div>

                        <div className="px-6 py-5">
                            {summaryLoading ? (
                                <div className="animate-pulse space-y-4">
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                </div>
                            ) : eventSummary ? (
                                <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-md border-l-4 border-primary-500">
                                    <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-line">
                                        {eventSummary}
                                    </p>
                                </div>
                            ) : (
                                <div className="text-center py-10">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                                    </svg>
                                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No summary available</h3>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        Unable to generate an AI summary at this time.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;