import React, { useEffect, useState, useContext } from 'react';
import { SocketContext } from '../App'; // Import SocketContext to access the global socket

function LandingPage() {
  const [username, setUsername] = useState('');
  const socket = useContext(SocketContext); // Use socket from context

  useEffect(() => {
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
  }, [socket]);

  return (
    <div>
      <h2>Welcome {username ? `${username}` : "to Task Manager"}!</h2>
      <p>Manage your tasks efficiently.</p>
      {/* Include any other content for the landing page */}
    </div>
  );
}

export default LandingPage;
