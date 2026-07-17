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
import RegulatoryCustomers from './components/RegulatoryCustomers';
import CreateCustomer from './components/CreateCustomer';
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

  // Guard: Ensure user is logged in
  const authGuard = (element: React.ReactElement) =>
    user ? element : <Navigate to="/login" />;

  // Guard: Artwork users get redirected to /products on administrative routes
  const artworkGuard = (element: React.ReactElement) =>
    user ? (user.department === 'Artwork' ? <Navigate to="/products" /> : element) : <Navigate to="/login" />;

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route
            path="/login"
            element={user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />}
          />
          {/* Root: land directly on Dashboard for all logged-in departments */}
          <Route
            path="/"
            element={
              user
                ? <Dashboard user={user} onLogout={handleLogout} />
                : <Navigate to="/login" />
            }
          />
          <Route
            path="/dashboard"
            element={user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route path="/orders" element={authGuard(<Orders user={user!} onLogout={handleLogout} />)} />
          <Route path="/orders/create" element={artworkGuard(<CreateOrder user={user!} onLogout={handleLogout} />)} />
          <Route path="/orders/:id" element={authGuard(<OrderDetail user={user!} onLogout={handleLogout} />)} />
          <Route path="/orders/edit/:id" element={artworkGuard(<EditOrder user={user!} onLogout={handleLogout} />)} />
          <Route
            path="/products"
            element={user ? <Products user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route path="/customers" element={artworkGuard(<Customers user={user!} onLogout={handleLogout} />)} />
          <Route
            path="/customers/create"
            element={user && user.department === 'Exports' ? <CreateCustomer /> : <Navigate to="/login" />}
          />
          <Route path="/registrations" element={artworkGuard(<Registrations user={user!} onLogout={handleLogout} />)} />
          <Route path="/alerts" element={authGuard(<Alerts user={user!} onLogout={handleLogout} />)} />
          <Route path="/audit-logs" element={artworkGuard(<AuditLogs user={user!} onLogout={handleLogout} />)} />
          <Route
            path="/regulatory-customers"
            element={user ? <RegulatoryCustomers user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
