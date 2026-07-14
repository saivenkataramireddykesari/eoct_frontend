import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Orders from './components/Orders';
import OrderDetail from './components/OrderDetail';
import CreateOrder from './components/CreateOrder';
import EditOrder from './components/EditOrder';
import Products from './components/Products';
import Customers from './components/Customers';
import Registrations from './components/Registrations';
import Alerts from './components/Alerts';
import AuditLogs from './components/AuditLogs';
import './App.css';

interface User {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  department: string;
  role: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is stored in localStorage
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData: User, token: string) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/login" 
            element={user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} 
          />
          <Route 
            path="/" 
            element={user ? (user.department === 'Artwork' ? <Navigate to="/products" /> : <Dashboard user={user} onLogout={handleLogout} />) : <Navigate to="/login" />} 
          />
          <Route 
            path="/orders" 
            element={user ? (user.department === 'Artwork' ? <Navigate to="/products" /> : <Orders user={user} onLogout={handleLogout} />) : <Navigate to="/login" />} 
          />
          <Route 
            path="/orders/create" 
            element={user ? (user.department === 'Artwork' ? <Navigate to="/products" /> : <CreateOrder user={user} onLogout={handleLogout} />) : <Navigate to="/login" />} 
          />
          <Route 
            path="/orders/:id" 
            element={user ? (user.department === 'Artwork' ? <Navigate to="/products" /> : <OrderDetail user={user} onLogout={handleLogout} />) : <Navigate to="/login" />} 
          />
          <Route 
            path="/orders/edit/:id" 
            element={user ? (user.department === 'Artwork' ? <Navigate to="/products" /> : <EditOrder user={user} onLogout={handleLogout} />) : <Navigate to="/login" />} 
          />
          <Route 
            path="/products" 
            element={user ? <Products user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/customers" 
            element={user ? (user.department === 'Artwork' ? <Navigate to="/products" /> : <Customers user={user} onLogout={handleLogout} />) : <Navigate to="/login" />} 
          />
          <Route 
            path="/registrations" 
            element={user ? (user.department === 'Artwork' ? <Navigate to="/products" /> : <Registrations user={user} onLogout={handleLogout} />) : <Navigate to="/login" />} 
          />
          <Route 
            path="/alerts" 
            element={user ? (user.department === 'Artwork' ? <Navigate to="/products" /> : <Alerts user={user} onLogout={handleLogout} />) : <Navigate to="/login" />} 
          />
          <Route 
            path="/audit-logs" 
            element={user ? (user.department === 'Artwork' ? <Navigate to="/products" /> : <AuditLogs user={user} onLogout={handleLogout} />) : <Navigate to="/login" />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
