import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.jsx';

// Pages
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Calendar from './pages/Calendar.jsx';
import Navbar from './components/Navbar.jsx';

function App() {
  const { currentUser } = useAuth();

  // Initialize dark mode based on user preference
  useEffect(() => {
    // Check if user has a saved preference
    const savedDarkMode = localStorage.getItem('darkMode');

    // If preference exists, apply it; otherwise, use system preference
    if (savedDarkMode === 'true' ||
      (savedDarkMode === null && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Route guard
  function PrivateRoute({ children }) {
    return currentUser ? children : <Navigate to="/login" />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {currentUser && <Navbar />}
      <div className={`container mx-auto py-4 ${currentUser ? 'pt-20' : ''}`}>
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
        </Routes>
      </div>
    </div>
  );
}

export default App;