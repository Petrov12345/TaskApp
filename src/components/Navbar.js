// Navbar.js
import React, { useEffect, useCallback, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SocketContext } from '../App';

function Navbar({ isLoggedIn, onLogout }) {
  const navigate = useNavigate();
  const socket = useContext(SocketContext);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    onLogout();
    if (socket) {
      socket.emit('logout');
      socket.disconnect();
    }
    navigate('/');
  }, [navigate, onLogout, socket]);

  useEffect(() => {
    if (socket) {
      socket.on('logout', handleLogout);
    }
    return () => {
      socket?.off('logout', handleLogout);
    };
  }, [handleLogout, socket]);

  return (
    <nav>
      <Link to="/">Home</Link>
      <Link to="/tasks">Tasks</Link>
      {isLoggedIn && <Link to="/friends">Friends</Link>}
      {isLoggedIn && <Link to="/teams">Teams</Link>}
      {isLoggedIn && <Link to="/calendar">Calendar</Link>} {/* New Calendar Link */}
      {isLoggedIn ? (
        <button onClick={handleLogout}>Log Out</button>
      ) : (
        <Link to="/login">Login/Signup</Link>
      )}
    </nav>
  );
}

export default Navbar;
