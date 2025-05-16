import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getEventSummary } from '../services/aiService.js';

// Icons
const CalendarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
    </svg>
);

const ArrowRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
);

const LightBulbIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
);

const WarningIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
);

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
            <div className="text-center mb-10">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">Welcome to Smart Calendar</h1>
                <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                    Manage your schedule efficiently with AI-powered insights and suggestions
                </p>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="mb-8 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 rounded-md shadow-sm">
                    <div className="flex items-start">
                        <div className="flex-shrink-0 pt-0.5">
                            <WarningIcon />
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Upcoming Events Card */}
                <div className="card transition-all">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold flex items-center">
                            <CalendarIcon /><span className="ml-2">Upcoming Events</span>
                        </h2>
                        <Link to="/calendar" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium flex items-center">
                            View Calendar <ArrowRightIcon className="ml-1 w-4 h-4" />
                        </Link>
                    </div>

                    {loading ? (
                        <div className="py-8">
                            <div className="animate-pulse flex space-x-4">
                                <div className="flex-1 space-y-4 py-1">
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                    <div className="space-y-2">
                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                                    </div>
                                </div>
                            </div>
                            <div className="animate-pulse flex space-x-4 mt-6">
                                <div className="flex-1 space-y-4 py-1">
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                    <div className="space-y-2">
                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                                    </div>
                                </div>
                            </div>
                            <div className="animate-pulse flex space-x-4 mt-6">
                                <div className="flex-1 space-y-4 py-1">
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                    <div className="space-y-2">
                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : upcomingEvents.length > 0 ? (
                        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                            {upcomingEvents.map((event) => (
                                <div key={event.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <div className="p-4 sm:px-6">
                                        <div className="flex items-center justify-between">
                                            <div className="font-medium text-gray-900 dark:text-white truncate pr-4">
                                                {event.title}
                                            </div>
                                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                {formatTime(event.start)} - {formatTime(event.end)}
                                            </div>
                                        </div>
                                        <div className="mt-2 flex justify-between">
                                            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-1">
                                                {event.description || "No description"}
                                            </p>
                                            <div className="ml-4 flex-shrink-0">
                                                <span className="inline-flex items-center text-xs font-medium">
                                                    <span className="flex-shrink-0 w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: event.color }}></span>
                                                    {formatDate(event.start)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
                            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                            <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No upcoming events</h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                You don't have any events scheduled for the next 7 days.
                            </p>
                            <div className="mt-6">
                                <Link
                                    to="/calendar"
                                    className="btn-primary inline-flex items-center"
                                >
                                    <CalendarIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
                                    Add New Event
                                </Link>
                            </div>
                        </div>
                    )}

                    {upcomingEvents.length > 0 && (
                        <div className="mt-6">
                            <Link
                                to="/calendar"
                                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                <CalendarIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                                View Full Calendar
                            </Link>
                        </div>
                    )}
                </div>

                {/* AI Insights Card */}
                {upcomingEvents.length > 0 && (
                    <div className="card transition-all">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold flex items-center">
                                <LightBulbIcon /><span className="ml-2">AI Insights</span>
                            </h2>
                        </div>

                        {summaryLoading ? (
                            <div className="py-8">
                                <div className="animate-pulse space-y-4">
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                                </div>
                            </div>
                        ) : eventSummary ? (
                            <div className="rounded-lg border-l-4 border-primary-500 bg-primary-50 dark:bg-primary-900/20 p-4">
                                <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                                    {eventSummary}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
                                <LightBulbIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                                <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No insights available</h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    We couldn't generate AI insights for your events at this time.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;