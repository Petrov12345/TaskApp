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
import CalendarPage from './components/CalendarPage';
import AccountPage from './components/AccountPage';
import ProtectedRoute from './components/ProtectedRoute';

export const SocketContext = createContext(); // Create a Socket Context

// Initialize Query Client for React Query
const queryClient = new QueryClient();

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const newSocket = io('http://localhost:5000', {
      auth: { token },
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to the socket server');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from the socket server');
    });

    // Clean up socket connection on component unmount
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
              <Route path="/tasks" element={<ProtectedRoute isLoggedIn={isLoggedIn}><TasksPage /></ProtectedRoute>} />
              <Route path="/friends" element={<ProtectedRoute isLoggedIn={isLoggedIn}><FriendsPage /></ProtectedRoute>} />
              <Route path="/teams" element={<ProtectedRoute isLoggedIn={isLoggedIn}><TeamsPage /></ProtectedRoute>} />
              <Route path="/create-team" element={<ProtectedRoute isLoggedIn={isLoggedIn}><CreateTeamPage /></ProtectedRoute>} />
              <Route path="/manage-team" element={<ProtectedRoute isLoggedIn={isLoggedIn}><ManageTeamPage /></ProtectedRoute>} />
              <Route path="/team-invites" element={<ProtectedRoute isLoggedIn={isLoggedIn}><TeamInvitesPage /></ProtectedRoute>} />
              <Route path="/calendar" element={<ProtectedRoute isLoggedIn={isLoggedIn}><CalendarPage /></ProtectedRoute>} />
              <Route path="/account" element={<ProtectedRoute isLoggedIn={isLoggedIn}><AccountPage /></ProtectedRoute>} />
              <Route path="/login" element={<LoginSignupPage onLogin={handleLogin} />} />
</Routes>
          </div>
        </Router>
      </SocketContext.Provider>
    </QueryClientProvider>
  );
}

export default App;