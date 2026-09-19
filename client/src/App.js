import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import NewSplit from './components/NewSplit';
import Notifications from './components/Notifications';
import Settings from './components/Settings';
import UPILinks from './components/UPILinks';
import History from './components/History';
import Groups from './components/Groups';
import Analytics from './components/Analytics';
import Recurring from './components/Recurring';
import Settle from './components/Settle';
import Login from './components/Login';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
  setUser(userData);
  };

  const handleUpdateUser = (updatedUser) => {
  setUser(updatedUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: '#f7f8fc', fontSize: '24px'
      }}>
        💸
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="app-layout">
        <Sidebar user={user} onLogout={handleLogout} />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard user={user} />} />
            <Route path="/new-split" element={<NewSplit user={user} />} />
            <Route path="/notifications" element={<Notifications user={user} />} />
            <Route path="/settings" element={<Settings user={user} onUpdateUser={handleUpdateUser} />} />
            <Route path="/upi-links" element={<UPILinks user={user} />} />
            <Route path="/history" element={<History user={user} />} />
            <Route path="/groups" element={<Groups user={user} />} />
            <Route path="/analytics" element={<Analytics user={user} />} />
            <Route path="*" element={<Navigate to="/" />} />
            <Route path="/recurring" element={<Recurring user={user} />} />
            <Route path="/settle" element={<Settle user={user} />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;