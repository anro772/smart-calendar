import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import './Navbar.css';

function Navbar() {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Failed to log out', error);
        }
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <div className="navbar-brand">
                    <Link to="/">Smart Calendar</Link>
                </div>
                <div className="navbar-menu">
                    <Link to="/" className="navbar-item">Dashboard</Link>
                    <Link to="/calendar" className="navbar-item">Calendar</Link>
                </div>
                <div className="navbar-end">
                    {currentUser && (
                        <div className="user-menu">
                            <span className="user-email">{currentUser.email}</span>
                            <button onClick={handleLogout} className="logout-button">
                                Log Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}

export default Navbar;