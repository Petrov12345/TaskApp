import React, { useState, useEffect, createContext } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import io from 'socket.io-client';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import TasksPage from './components/TasksPage';
import LoginSignupPage from './components/LoginSignupPage';
import FriendsPage from './components/FriendsPage';
import TeamsPage from './components/TeamsPage';
import CreateTeamPage from './components/CreateTeamPage';
import ManageTeamPage from './components/ManageTeamPage';
import TeamInvitesPage from './components/TeamInvitesPage';
import CalendarPage from './components/CalendarPage'; // Import the CalendarPage component

export const SocketContext = createContext(); // Create a Socket Context

// Initialize Query Client for React Query
const queryClient = new QueryClient();

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Connect to the socket server with token for authenticated communication
    const token = localStorage.getItem('token');
    const newSocket = io('http://localhost:5000', {
      auth: { token }, // Authenticate the socket connection with JWT token
    });
    setSocket(newSocket);

    // Set up listeners for global events
    newSocket.on('connect', () => {
      console.log('Connected to the socket server');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from the socket server');
    });

    // Clean up the socket connection on component unmount
    return () => {
      if (newSocket) {
        newSocket.close();
      }
    };
  }, []);

  const handleLogin = () => {
    setIsLoggedIn(true);
    const token = localStorage.getItem('token');
    if (socket && token) {
      socket.auth = { token };
      socket.connect(); // Reconnect with token after login
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.clear(); // Clears user data upon logout
    if (socket) {
      socket.disconnect(); // Disconnect socket on logout
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <SocketContext.Provider value={socket}>
        <Router>
          <div>
            <Navbar isLoggedIn={isLoggedIn} onLogout={handleLogout} />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/friends" element={<FriendsPage />} />
              <Route path="/teams" element={<TeamsPage />} />
              <Route path="/create-team" element={<CreateTeamPage />} />
              <Route path="/manage-team" element={<ManageTeamPage />} />
              <Route path="/team-invites" element={<TeamInvitesPage />} />
              <Route path="/calendar" element={<CalendarPage />} /> {/* New Calendar Route */}
              <Route path="/login" element={<LoginSignupPage onLogin={handleLogin} />} />
            </Routes>
          </div>
        </Router>
      </SocketContext.Provider>
    </QueryClientProvider>
  );
}

export default App;
