import React from 'react';
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

  // Route guard
  function PrivateRoute({ children }) {
    return currentUser ? children : <Navigate to="/login" />;
  }

  return (
    <div className="app">
      {currentUser && <Navbar />}
      <div className="container">
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