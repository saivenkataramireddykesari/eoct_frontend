import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';

import Orders from './components/Orders';
import OrderDetail from './components/OrderDetail';
import CreateOrder from './components/CreateOrder';
import EditOrder from './components/EditOrder';
import Products from './components/Products';
import ProductDetail from './components/ProductDetail';
import Customers from './components/Customers';
import Registrations from './components/Registrations';
import Alerts from './components/Alerts';
import AuditLogs from './components/AuditLogs';
import RegulatoryCustomers from './components/RegulatoryCustomers';
import CreateCustomer from './components/CreateCustomer';
import SearchResults from './components/SearchResults';
import CustomerDetail from './components/CustomerDetail';
import MaintenancePage from './components/MaintenancePage';
import { systemAPI } from './services/api';
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
  const [inMaintenance, setInMaintenance] = useState(false);
  const [maintenanceData, setMaintenanceData] = useState<{
    message?: string;
    estimated_completion?: string;
    updated_at?: string;
  }>({});

  const checkMaintenance = useCallback(async () => {
    try {
      const res = await systemAPI.getMaintenanceStatus();
      if (res.data) {
        setInMaintenance(res.data.in_maintenance);
        setMaintenanceData({
          message: res.data.message,
          estimated_completion: res.data.estimated_completion,
          updated_at: res.data.updated_at
        });
      }
    } catch (err) {
      console.error("Failed to check maintenance status:", err);
    }
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    checkMaintenance();
    setLoading(false);

    // Event listener for 503 HTTP responses
    const handleMaintenanceEvent = (e: any) => {
      setInMaintenance(true);
      if (e.detail) {
        setMaintenanceData({
          message: e.detail.message || e.detail.detail,
          estimated_completion: e.detail.estimated_completion,
          updated_at: e.detail.updated_at
        });
      }
    };

    window.addEventListener('system-maintenance-event', handleMaintenanceEvent);
    return () => {
      window.removeEventListener('system-maintenance-event', handleMaintenanceEvent);
    };
  }, [checkMaintenance]);

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

  // Admin bypass check: Administrators, Managers, and Exports department users can bypass maintenance mode if needed
  const isAdmin = user && (user.role === 'admin' || user.role === 'manager' || user.department === 'Exports');

  // If in maintenance mode and user is not an admin, render the Maintenance Page
  if (inMaintenance && !isAdmin) {
    return (
      <MaintenancePage
        user={user}
        maintenanceData={maintenanceData}
        onRefreshStatus={checkMaintenance}
        onDisableMaintenance={() => setInMaintenance(false)}
      />
    );
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
            path="/maintenance"
            element={
              <MaintenancePage
                user={user}
                maintenanceData={maintenanceData}
                onRefreshStatus={checkMaintenance}
                onDisableMaintenance={() => setInMaintenance(false)}
              />
            }
          />
          <Route
            path="/login"
            element={user ? (user.department === 'Artwork' ? <Navigate to="/products" /> : <Navigate to="/" />) : <Login onLogin={handleLogin} />}
          />
          <Route
            path="/"
            element={
              user
                ? (user.department === 'Artwork' ? <Navigate to="/products" /> : <Navigate to="/orders" />)
                : <Navigate to="/login" />
            }
          />
          <Route path="/orders" element={artworkGuard(<Orders user={user!} onLogout={handleLogout} />)} />
          <Route path="/orders/create" element={artworkGuard(<CreateOrder user={user!} onLogout={handleLogout} />)} />
          <Route path="/orders/:id" element={authGuard(<OrderDetail user={user!} onLogout={handleLogout} />)} />
          <Route path="/orders/edit/:id" element={artworkGuard(<EditOrder user={user!} onLogout={handleLogout} />)} />
          <Route
            path="/products"
            element={user ? <Products user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/products/:id"
            element={user ? <ProductDetail user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route path="/customers" element={artworkGuard(<Customers user={user!} onLogout={handleLogout} />)} />
          <Route
            path="/customers/create"
            element={user && user.department === 'Exports' ? <CreateCustomer /> : <Navigate to="/login" />}
          />
          <Route path="/customers/:id" element={authGuard(<CustomerDetail user={user!} onLogout={handleLogout} />)} />
          <Route path="/registrations" element={artworkGuard(<Registrations user={user!} onLogout={handleLogout} />)} />
          <Route path="/alerts" element={authGuard(<Alerts user={user!} onLogout={handleLogout} />)} />
          <Route path="/audit-logs" element={artworkGuard(<AuditLogs user={user!} onLogout={handleLogout} />)} />
          <Route
            path="/regulatory-customers"
            element={user ? <RegulatoryCustomers user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route path="/search" element={authGuard(<SearchResults />)} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

