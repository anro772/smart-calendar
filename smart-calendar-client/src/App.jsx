import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.jsx';

// Pages
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Calendar from './pages/Calendar.jsx';
import Navbar from './components/Navbar.jsx'; // Ensure this path is correct

function App() {
  const { currentUser } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // 1. Check for a saved preference in localStorage
    const savedPreference = localStorage.getItem('darkMode');
    if (savedPreference) {
      return savedPreference === 'true';
    }
    // 2. If no preference, default to light mode (false)
    return false;
  });

  // Effect to apply the theme and save preference
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [isDarkMode]); // Re-run when isDarkMode changes

  const toggleDarkMode = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  // Route guard
  function PrivateRoute({ children }) {
    return currentUser ? children : <Navigate to="/login" />;
  }

  return (
    // The main div applies the background color based on the 'dark' class on <html>
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* Pass theme state and toggle function to Navbar */}
      {/* Navbar itself will have its own dark mode background classes */}
      {currentUser && <Navbar isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />}

      {/* Adjust padding top if Navbar is fixed. Your Navbar.js doesn't show fixed positioning,
          but if it were, you'd add pt-16 or similar here.
          The original App.js had 'pt-20' if currentUser.
          Let's assume the Navbar height is 4rem (h-16 in Navbar.js) */}
      <div className={`container mx-auto py-4 ${currentUser ? 'pt-16 sm:pt-20' : ''}`}> {/* Added sm:pt-20 for consistency with h-16 navbar */}
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />
          <Route path="/calendar" element={
            <PrivateRoute>
              <Calendar />
            </PrivateRoute>
          } />
          {/* Optional: A catch-all or redirect for unknown routes */}
          <Route path="*" element={<Navigate to={currentUser ? "/" : "/login"} />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;