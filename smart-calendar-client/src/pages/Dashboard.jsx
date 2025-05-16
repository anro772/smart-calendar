import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getEventSummary } from '../services/aiService.js';
import '../styles/Dashboard.css'; // Make sure CSS is imported

function Dashboard() {
    const { currentUser } = useAuth();
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [eventSummary, setEventSummary] = useState('');
    const [loading, setLoading] = useState(true);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isPageRefresh, setIsPageRefresh] = useState(false);

    // Pagination and filtering states
    const [currentPage, setCurrentPage] = useState(1);
    const [eventsPerPage] = useState(5); // Number of days to show per page for grouped view
    const [expandedDays, setExpandedDays] = useState([]);
    const [activeFilter, setActiveFilter] = useState('all');

    // Group events by day
    const [groupedEvents, setGroupedEvents] = useState({});
    const [daysList, setDaysList] = useState([]); // List of YYYY-MM-DD strings for all fetched events

    // Check if page was refreshed
    useEffect(() => {
        const pageLoadTimestamp = Date.now();
        const lastPageLoad = sessionStorage.getItem('dashboardLastLoad');
        const isRefresh = !lastPageLoad || (pageLoadTimestamp - parseInt(lastPageLoad)) > 2000;
        setIsPageRefresh(isRefresh);
        sessionStorage.setItem('dashboardLastLoad', pageLoadTimestamp.toString());
        sessionStorage.setItem('dashboardLoaded', 'true');
    }, []);

    // Helper function to ensure input is a Date object
    const ensureDateObject = (dateInput) => {
        if (dateInput instanceof Date) {
            return dateInput;
        }
        return new Date(dateInput);
    };

    function formatDate(dateInput) {
        const date = ensureDateObject(dateInput);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    }

    function formatTime(dateInput) {
        const date = ensureDateObject(dateInput);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    function formatDateForGrouping(dateInput) {
        const date = ensureDateObject(dateInput);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function getEventStatus(event) {
        const now = new Date();
        if (now < event.start) {
            return 'upcoming';
        } else if (now >= event.start && now <= event.end) {
            return 'in-progress';
        } else {
            return 'completed';
        }
    }

    const getEventsWithSimpleQuery = async (startOfRange, endOfRange) => {
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
            if (startDate >= startOfRange && startDate <= endOfRange) {
                const event = {
                    id: doc.id,
                    title: data.title,
                    start: startDate,
                    end: data.end.toDate(),
                    description: data.description,
                    color: data.color || '#3174ad'
                };
                event.status = getEventStatus(event);
                result.push(event);
            }
        });
        return result;
    };

    const getEventsWithComplexQuery = async (startOfRange, endOfRange) => {
        const eventsRef = collection(db, 'events');
        const complexQuery = query(
            eventsRef,
            where('userId', '==', currentUser.uid),
            where('start', '>=', startOfRange),
            where('start', '<=', endOfRange)
        );
        const querySnapshot = await getDocs(complexQuery);
        const result = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const event = {
                id: doc.id,
                title: data.title,
                start: data.start.toDate(),
                end: data.end.toDate(),
                description: data.description,
                color: data.color || '#3174ad'
            };
            event.status = getEventStatus(event);
            result.push(event);
        });
        return result;
    };

    const getCompletedEvents = async () => {
        const now = new Date();
        const eventsRef = collection(db, 'events');
        // Query for events that have already ended, for the current user
        const userEventsQuery = query(
            eventsRef,
            where('userId', '==', currentUser.uid),
            where('end', '<', now)
        );

        try {
            // Attempt the direct, indexed query first
            const querySnapshot = await getDocs(userEventsQuery);
            const result = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                result.push({
                    id: doc.id,
                    title: data.title,
                    start: data.start.toDate(),
                    end: data.end.toDate(),
                    description: data.description,
                    color: data.color || '#3174ad',
                    status: 'completed'
                });
            });
            result.sort((a, b) => b.end - a.end); // Most recent completed first
            // If this direct query succeeds, no error message related to its index will be set.
            return result;
        } catch (error) {
            // This block is entered if the direct query (userEventsQuery) fails.
            console.error("Error during direct query for completed events:", error);

            if (error.message && error.message.includes('index')) {
                // The direct query failed due to a missing/improper index.
                // Log a detailed warning to the console for the developer.
                // We will NOT set the UI error here if the fallback can provide the data.
                console.warn(
                    `[Performance Suggestion] The direct query for completed events failed, likely due to a missing or misconfigured Firestore index. 
                    Expected index on 'events' collection: 'userId' (Ascending), 'end' (Ascending). 
                    Firebase error: "${error.message}". 
                    Falling back to a less efficient method to load completed events. 
                    If you've recently created the index, allow a few minutes for it to build and try a hard refresh.`
                );

                // Fallback: Fetch all user's events and filter client-side
                // This is less efficient but will display the data.
                try {
                    const allEventsSnapshot = await getDocs(query(eventsRef, where('userId', '==', currentUser.uid)));
                    const fallbackResult = [];
                    allEventsSnapshot.forEach(doc => {
                        const data = doc.data();
                        const eventEnd = data.end.toDate();
                        if (eventEnd < now) {
                            fallbackResult.push({
                                id: doc.id,
                                title: data.title,
                                start: data.start.toDate(),
                                end: eventEnd,
                                description: data.description,
                                color: data.color || '#3174ad',
                                status: 'completed'
                            });
                        }
                    });
                    fallbackResult.sort((a, b) => b.end - a.end);
                    return fallbackResult; // Return data from fallback
                } catch (fallbackError) {
                    // If the fallback itself fails, then it's a more serious issue.
                    console.error("Fallback query for completed events also failed:", fallbackError);
                    throw fallbackError; // Rethrow, to be caught by fetchCompletedEventsData and set UI error
                }
            } else {
                // For non-index related errors from the direct query, rethrow them.
                // These will be caught by the calling function (fetchCompletedEventsData) and set a UI error.
                throw error;
            }
        }
    };

    const groupEventsByDay = (eventsToGroup) => {
        const grouped = {};
        const distinctDays = [];
        eventsToGroup.forEach(event => {
            const dateKey = formatDateForGrouping(event.start);
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
                distinctDays.push(dateKey);
            }
            grouped[dateKey].push(event);
        });
        distinctDays.sort();
        return { grouped, days: distinctDays };
    };

    const filterEventsByStatus = (eventsToFilter, filter) => {
        if (filter === 'all') return eventsToFilter;
        return eventsToFilter.filter(event => event.status === filter);
    };

    const [completedEvents, setCompletedEvents] = useState([]);
    const [completedCurrentPage, setCompletedCurrentPage] = useState(1);
    const [completedEventsPerPage] = useState(10);
    const [completedEventsLoading, setCompletedEventsLoading] = useState(false);

    const generateCacheKey = (user, eventsForCache) => {
        if (!user || !eventsForCache || eventsForCache.length === 0) return null;
        const eventsHash = eventsForCache.map(e => `${e.id}_${e.start.getTime()}_${e.end.getTime()}`).join('|');
        return `event_summary_${user.uid}_${eventsHash}`;
    };

    useEffect(() => {
        async function fetchCompletedEventsData() {
            if (!currentUser || activeFilter !== 'completed') return;
            // Clear previous general errors when re-fetching, but specific console warnings might still appear from getCompletedEvents
            // setError(null); // Be cautious if other errors should persist.
            try {
                setCompletedEventsLoading(true);
                const fetchedCompletedEvents = await getCompletedEvents();
                setCompletedEvents(fetchedCompletedEvents);
            } catch (err) { // This catches errors re-thrown by getCompletedEvents (e.g., non-index errors or fallback failures)
                console.error('Error setting completed events in state:', err);
                const errorMessage = `Failed to load completed events: ${err.message}.`;
                setError(prev => prev ? `${prev}\n${errorMessage}` : errorMessage);
            } finally {
                setCompletedEventsLoading(false);
            }
        }
        fetchCompletedEventsData();
    }, [currentUser, activeFilter]);

    useEffect(() => {
        async function fetchUpcomingEventsData() {
            if (!currentUser) return;
            setLoading(true);
            // setError(null); // Clear general errors at the beginning of this fetch operation.
            // Specific console warnings from getCompletedEvents (if activeFilter is 'completed')
            // are handled within that function and won't set UI error if fallback works.

            try {
                const startOfTodayLocal = new Date();
                startOfTodayLocal.setHours(0, 0, 0, 0);
                const endOfSeventhDayLocal = new Date(startOfTodayLocal);
                endOfSeventhDayLocal.setDate(startOfTodayLocal.getDate() + 6);
                endOfSeventhDayLocal.setHours(23, 59, 59, 999);

                let fetchedEvents = [];
                try {
                    fetchedEvents = await getEventsWithComplexQuery(startOfTodayLocal, endOfSeventhDayLocal);
                } catch (indexError) {
                    if (indexError.message.includes('index')) {
                        const upcomingIndexErrorMsg = `[Performance Suggestion] For upcoming events, a Firestore index on 'events' (fields: userId, start) would improve performance. Details: ${indexError.message}. Using a less efficient fallback.`;
                        console.warn(upcomingIndexErrorMsg);
                        // Optionally set UI error if this is critical, or rely on console for dev.
                        // setError(prev => prev ? `${prev}\n${upcomingIndexErrorMsg}` : upcomingIndexErrorMsg);
                        fetchedEvents = await getEventsWithSimpleQuery(startOfTodayLocal, endOfSeventhDayLocal);
                    } else {
                        throw indexError; // Rethrow other errors
                    }
                }

                fetchedEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
                setUpcomingEvents(fetchedEvents);

                const { grouped: allGrouped, days: allDays } = groupEventsByDay(fetchedEvents);
                setGroupedEvents(allGrouped);
                setDaysList(allDays);

                const todayLocalStr = formatDateForGrouping(new Date());
                if (allDays.includes(todayLocalStr) && allGrouped[todayLocalStr]?.length > 0) {
                    setExpandedDays([todayLocalStr]);
                } else if (allDays.length > 0) {
                    const firstDayWithEvents = allDays.find(d => allGrouped[d]?.length > 0);
                    setExpandedDays(firstDayWithEvents ? [firstDayWithEvents] : []);
                } else {
                    setExpandedDays([]);
                }

                if (fetchedEvents.length > 0) {
                    const cacheKey = generateCacheKey(currentUser, fetchedEvents);
                    const cachedSummary = cacheKey ? sessionStorage.getItem(cacheKey) : null;
                    if (cachedSummary && !isPageRefresh) {
                        setEventSummary(cachedSummary);
                        setSummaryLoading(false);
                    } else {
                        setSummaryLoading(true);
                        try {
                            const summary = await getEventSummary(fetchedEvents);
                            setEventSummary(summary);
                            if (summary && cacheKey) sessionStorage.setItem(cacheKey, summary);
                        } catch (aiError) {
                            console.error('Error getting event summary:', aiError);
                            setEventSummary('Unable to generate summary at this time.');
                        } finally {
                            setSummaryLoading(false);
                        }
                    }
                } else {
                    setEventSummary('');
                }
            } catch (e) { // Catches errors from getEventsWithComplexQuery or getEventsWithSimpleQuery
                console.error('Error fetching upcoming events for dashboard:', e);
                const generalErrorMsg = `Error loading upcoming events: ${e.message}`;
                setError(prev => prev ? `${prev}\n${generalErrorMsg}` : generalErrorMsg);
            } finally {
                setLoading(false);
            }
        }
        fetchUpcomingEventsData();
    }, [currentUser, isPageRefresh]);

    const toggleDayExpansion = (dayKey) => {
        setExpandedDays(prevExpanded =>
            prevExpanded.includes(dayKey)
                ? prevExpanded.filter(d => d !== dayKey)
                : [...prevExpanded, dayKey]
        );
    };

    const eventsForCurrentView = filterEventsByStatus(upcomingEvents, activeFilter);
    const { grouped: currentViewFilteredGrouped, days: currentViewFilteredDays } =
        activeFilter === 'completed'
            ? { grouped: {}, days: [] }
            : groupEventsByDay(eventsForCurrentView);

    const indexOfLastDayGroup = currentPage * eventsPerPage;
    const indexOfFirstDayGroup = indexOfLastDayGroup - eventsPerPage;
    const currentDaysToDisplayInPagination = currentViewFilteredDays.slice(indexOfFirstDayGroup, indexOfLastDayGroup);

    const indexOfLastCompletedEvent = completedCurrentPage * completedEventsPerPage;
    const indexOfFirstCompletedEvent = indexOfLastCompletedEvent - completedEventsPerPage;
    const currentCompletedEventsToDisplay = completedEvents.slice(indexOfFirstCompletedEvent, indexOfLastCompletedEvent);

    const paginateDayGroups = (pageNumber) => setCurrentPage(pageNumber);
    const paginateCompleted = (pageNumber) => setCompletedCurrentPage(pageNumber);

    const renderStatusBadge = (status) => {
        const baseClasses = "status-badge text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full";
        switch (status) {
            case 'in-progress':
                return <span className={`${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300`}>In Progress</span>;
            case 'completed':
                return <span className={`${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`}>Completed</span>;
            case 'upcoming':
            default:
                return <span className={`${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`}>Upcoming</span>;
        }
    };

    return (
        <div className="dashboard-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome to Smart Calendar</h1>
                <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
                    Manage your schedule with AI-powered insights
                </p>
            </div>

            {error && ( // This will now only show for errors that actually prevent data loading or critical fallbacks.
                <div className="mb-6 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="error-banner-icon w-5 h-5 text-red-500">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Attention needed</h3>
                            <div className="mt-2 text-sm text-red-700 dark:text-red-200 whitespace-pre-line">
                                {error}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="dashboard-card bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="dashboard-card-title-icon w-5 h-5 mr-2 text-primary-600 dark:text-primary-500">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                                </svg>
                                Events Overview
                            </h2>
                            <Link to="/calendar" className="text-sm font-medium text-primary-600 dark:text-primary-500 hover:text-primary-700 dark:hover:text-primary-400">
                                View Calendar →
                            </Link>
                        </div>
                    </div>

                    <div className="filter-tabs p-4 border-b border-gray-200 dark:border-gray-700">
                        {['all', 'upcoming', 'in-progress', 'completed'].map(filterName => (
                            <button
                                key={filterName}
                                onClick={() => { setError(null); /* Clear general errors on tab change */ setActiveFilter(filterName); setCurrentPage(1); setCompletedCurrentPage(1); }}
                                className={`filter-button ${activeFilter === filterName ? `active active-${filterName}` : ''}`}
                            >
                                {filterName.charAt(0).toUpperCase() + filterName.slice(1)}
                            </button>
                        ))}
                    </div>

                    <div className="events-container min-h-[300px]">
                        {loading && activeFilter !== 'completed' ? (
                            <div className="animate-pulse space-y-4 p-6">
                                {[...Array(4)].map((_, i) => <div key={i} className={`h-4 bg-gray-200 dark:bg-gray-700 rounded w-${i % 2 === 0 ? '3/4' : '1/2'}`}></div>)}
                            </div>
                        ) : activeFilter === 'completed' ? (
                            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 h-full">
                                {completedEventsLoading ? (
                                    <div className="animate-pulse space-y-4 p-6">
                                        {[...Array(3)].map((_, i) => <div key={i} className={`h-4 bg-gray-200 dark:bg-gray-700 rounded w-${i % 2 === 0 ? '3/4' : '5/6'}`}></div>)}
                                    </div>
                                ) : currentCompletedEventsToDisplay.length > 0 ? (
                                    <>
                                        <h3 className="text-sm font-medium mb-3 text-gray-900 dark:text-white">
                                            Showing {currentCompletedEventsToDisplay.length} of {completedEvents.length} completed events
                                        </h3>
                                        <div className="space-y-3">
                                            {currentCompletedEventsToDisplay.map(event => (
                                                <div key={event.id} className="event-item bg-white dark:bg-gray-800 shadow-sm rounded-lg p-3">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-start space-x-3">
                                                            <span className="inline-block h-3 w-3 mt-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: event.color }}></span>
                                                            <div>
                                                                <h3 className="text-sm font-medium event-title text-gray-900 dark:text-white flex items-center">
                                                                    {event.title}
                                                                    <span className="ml-2">{renderStatusBadge(event.status)}</span>
                                                                </h3>
                                                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                                    {formatDate(event.start)} from {formatTime(event.start)} to {formatTime(event.end)}
                                                                </p>
                                                                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                                                                    {event.description || "No description"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {completedEvents.length > completedEventsPerPage && (
                                            <div className="flex justify-center items-center mt-6">
                                                <nav className="inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                                    <button onClick={() => paginateCompleted(completedCurrentPage - 1)} className={`relative inline-flex items-center px-2 py-1 rounded-l-md text-sm font-medium ${completedCurrentPage === 1 ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`} disabled={completedCurrentPage === 1}> Prev </button>
                                                    {[...Array(Math.ceil(completedEvents.length / completedEventsPerPage)).keys()].map(number => (<button key={number + 1} onClick={() => paginateCompleted(number + 1)} className={`relative inline-flex items-center px-3 py-1 text-sm font-medium ${completedCurrentPage === number + 1 ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}> {number + 1} </button>))}
                                                    <button onClick={() => paginateCompleted(completedCurrentPage + 1)} className={`relative inline-flex items-center px-2 py-1 rounded-r-md text-sm font-medium ${completedCurrentPage === Math.ceil(completedEvents.length / completedEventsPerPage) ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`} disabled={completedCurrentPage === Math.ceil(completedEvents.length / completedEventsPerPage)}> Next </button>
                                                </nav>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center py-8"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 mx-auto text-gray-400 dark:text-gray-600"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg><h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No completed events</h3><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">You don't have any completed events yet.</p></div>
                                )}
                            </div>
                        ) : currentViewFilteredDays.length > 0 ? (
                            <>
                                {currentDaysToDisplayInPagination.map(dayKey => {
                                    const dayEvents = currentViewFilteredGrouped[dayKey] || [];
                                    if (dayEvents.length === 0) return null;

                                    const isExpanded = expandedDays.includes(dayKey);
                                    const dayDateObject = ensureDateObject(dayKey + 'T00:00:00');

                                    return (
                                        <div key={dayKey} className="day-group border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                                            <button onClick={() => toggleDayExpansion(dayKey)} className="day-group-header w-full flex justify-between items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <div className="flex items-center">
                                                    <span className="text-sm font-medium day-header-text text-gray-700 dark:text-gray-300">{formatDate(dayDateObject)}</span>
                                                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 event-count-badge">
                                                        {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                                <svg className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                            </button>
                                            {isExpanded && (
                                                <div className="day-events-container bg-gray-50 dark:bg-gray-800/30 p-4 space-y-3">
                                                    {dayEvents.map(event => (
                                                        <div key={event.id} className="event-item bg-white dark:bg-gray-700/50 shadow rounded-md p-3">
                                                            <div className="flex justify-between items-start">
                                                                <div className="flex items-start space-x-3">
                                                                    <span className="inline-block h-3 w-3 mt-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: event.color }}></span>
                                                                    <div>
                                                                        <h3 className="text-sm font-medium event-title text-gray-900 dark:text-white flex items-center">
                                                                            {event.title}
                                                                            <span className="ml-2">{renderStatusBadge(event.status)}</span>
                                                                        </h3>
                                                                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                                                                            {event.description || "No description"}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">
                                                                    {formatTime(event.start)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {currentViewFilteredDays.length > eventsPerPage && (
                                    <div className="flex justify-center items-center p-4 border-t border-gray-200 dark:border-gray-700">
                                        <nav className="inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                            <button onClick={() => paginateDayGroups(currentPage - 1)} className={`relative inline-flex items-center px-2 py-1 rounded-l-md text-sm font-medium ${currentPage === 1 ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`} disabled={currentPage === 1}> Prev </button>
                                            {[...Array(Math.ceil(currentViewFilteredDays.length / eventsPerPage)).keys()].map(number => (<button key={number + 1} onClick={() => paginateDayGroups(number + 1)} className={`relative inline-flex items-center px-3 py-1 text-sm font-medium ${currentPage === number + 1 ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}> {number + 1} </button>))}
                                            <button onClick={() => paginateDayGroups(currentPage + 1)} className={`relative inline-flex items-center px-2 py-1 rounded-r-md text-sm font-medium ${currentPage === Math.ceil(currentViewFilteredDays.length / eventsPerPage) ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`} disabled={currentPage === Math.ceil(currentViewFilteredDays.length / eventsPerPage)}> Next </button>
                                        </nav>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-10 px-4"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="empty-state-icon w-12 h-12 mx-auto text-gray-400 dark:text-gray-600"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg><h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No events to show</h3><p className="mt-1 text-sm text-gray-500 dark:text-gray-400"> {activeFilter === 'all' && "You don't have any events scheduled for the next 7 days."} {activeFilter === 'upcoming' && "No upcoming events in the next 7 days."} {activeFilter === 'in-progress' && "No events currently in progress."} </p><div className="mt-6"><Link to="/calendar" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="empty-state-button-icon w-5 h-5 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg> Add New Event </Link></div></div>
                        )}
                    </div>
                </div>

                {upcomingEvents.length > 0 && (
                    <div className="dashboard-card bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="dashboard-card-title-icon w-5 h-5 mr-2 text-primary-600 dark:text-primary-500"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>
                                AI Schedule Summary
                            </h2>
                        </div>
                        <div className="summary-container p-6 min-h-[300px]">
                            {summaryLoading ? (
                                <div className="animate-pulse space-y-4">
                                    {[...Array(5)].map((_, i) => <div key={i} className={`h-4 bg-gray-200 dark:bg-gray-700 rounded w-${['3/4', 'full', '5/6', '2/3', 'full'][i]}`}></div>)}
                                </div>
                            ) : eventSummary ? (
                                <div className="summary-content prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: eventSummary }} />
                            ) : (
                                <div className="text-center py-10"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="empty-state-icon w-12 h-12 mx-auto text-gray-400 dark:text-gray-600"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg><h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No summary available</h3><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Unable to generate an AI summary, or no events in the next 7 days to summarize.</p></div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;