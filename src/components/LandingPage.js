import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { SocketContext } from '../App'; // Import SocketContext to access the global socket
import '../CSS-Style/LandingPage.css';

function LandingPage() {
  const [username, setUsername] = useState('');
  const socket = useContext(SocketContext); // Use socket from context
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    // If the user is not logged in, don't redirect, but show the "Welcome" message
    if (!token) {
      return;
    }

    // Retrieve the username from localStorage
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
    }

    // Listen for username updates only if the socket is available
    if (socket) {
      socket.on('usernameUpdated', (newUsername) => {
        setUsername(newUsername);
        localStorage.setItem('username', newUsername); // Update local storage
      });
    }

    // Cleanup on component unmount
    return () => {
      socket?.off('usernameUpdated');
    };
  }, [socket, token, navigate]);

  return (
    <div className="landing-container">
      <h2>Welcome {username ? `${username}` : "to Task Manager"}!</h2>
      <p>Manage your tasks efficiently.</p>
      {/* Include any other content for the landing page */}
    </div>
  );
}

export default LandingPage;
