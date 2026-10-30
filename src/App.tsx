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
import ErrorBoundary from './components/ErrorBoundary';
import { systemAPI } from './services/api';
import { getStoredAuth, setAuth, clearAuth, isTokenExpired } from './utils/auth';
import './App.css';

interface User {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  manufacturing_unit?: string;
}

function App() {
  const [user, setUser] = useState<User | null>(() => {
    const { user: storedUser } = getStoredAuth();
    return storedUser as User | null;
  });
  const [loading, setLoading] = useState(true);
  const [inMaintenance, setInMaintenance] = useState(false);
  const [maintenanceData, setMaintenanceData] = useState<{
    message?: string;
    estimated_completion?: string;
    updated_at?: string;
  }>({});

  const handleLogout = useCallback((expired: boolean = false) => {
    setUser(null);
    clearAuth();
    if (expired) {
      window.dispatchEvent(new CustomEvent('auth-session-expired', {
        detail: { message: 'Your session has expired. Please sign in again.' }
      }));
    }
  }, []);

  const handleLogin = (userData: User, token: string) => {
    setUser(userData);
    setAuth(userData, token);
  };

  const checkMaintenance = useCallback(async () => {
    try {
      const res = await systemAPI.getMaintenanceStatus();
      if (res.data) {
        setInMaintenance(!!res.data.in_maintenance);
        setMaintenanceData({
          message: res.data.message,
          estimated_completion: res.data.estimated_completion,
          updated_at: res.data.updated_at
        });
      }
    } catch (err) {
      // Do not block app on failure to fetch maintenance status
      console.error("Failed to check maintenance status:", err);
    }
  }, []);

  useEffect(() => {
    // Validate stored token on mount
    const token = localStorage.getItem('token');
    if (token && isTokenExpired(token)) {
      handleLogout(true);
    }

    checkMaintenance();
    setLoading(false);

    // Event listener for genuine 503 maintenance responses
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

    // Event listener for session expiration triggered by API 401
    const handleSessionExpiredEvent = () => {
      setUser(null);
      clearAuth();
    };

    window.addEventListener('system-maintenance-event', handleMaintenanceEvent);
    window.addEventListener('auth-session-expired', handleSessionExpiredEvent);

    // Periodic session check: auto logout if token expired
    const sessionTimer = setInterval(() => {
      const currentToken = localStorage.getItem('token');
      if (currentToken && isTokenExpired(currentToken)) {
        handleLogout(true);
      }
    }, 15000);

    return () => {
      window.removeEventListener('system-maintenance-event', handleMaintenanceEvent);
      window.removeEventListener('auth-session-expired', handleSessionExpiredEvent);
      clearInterval(sessionTimer);
    };
  }, [checkMaintenance, handleLogout]);

  if (loading) {
    return (
      <div className="loading" style={{ minHeight: '100vh', backgroundColor: '#f1f5f9' }}>
        Loading Export Order Control Tower...
      </div>
    );
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
    user ? element : <Navigate to="/login" replace state={{ sessionExpired: true }} />;

  // Guard: Artwork users get redirected to /products on administrative routes
  const artworkGuard = (element: React.ReactElement) =>
    user ? (user.department === 'Artwork' ? <Navigate to="/products" replace /> : element) : <Navigate to="/login" replace state={{ sessionExpired: true }} />;

  return (
    <Router>
      <div className="App">
        <ErrorBoundary onLogout={() => handleLogout(false)}>
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
              element={
                user ? (
                  user.department === 'Artwork'
                    ? <Navigate to="/products?tab=submit_pm_orders" replace />
                    : <Navigate to="/orders" replace />
                ) : (
                  <Login onLogin={handleLogin} />
                )
              }
            />
            <Route
              path="/"
              element={
                user
                  ? (user.department === 'Artwork' ? <Navigate to="/products?tab=submit_pm_orders" replace /> : <Navigate to="/orders" replace />)
                  : <Navigate to="/login" replace />
              }
            />
            <Route path="/orders" element={authGuard(<Orders user={user!} onLogout={() => handleLogout(false)} />)} />
            <Route path="/orders/create" element={artworkGuard(<CreateOrder user={user!} onLogout={() => handleLogout(false)} />)} />
            <Route path="/orders/:id" element={authGuard(<OrderDetail user={user!} onLogout={() => handleLogout(false)} />)} />
            <Route path="/orders/edit/:id" element={artworkGuard(<EditOrder user={user!} onLogout={() => handleLogout(false)} />)} />
            <Route
              path="/products"
              element={user ? <Products user={user} onLogout={() => handleLogout(false)} /> : <Navigate to="/login" replace state={{ sessionExpired: true }} />}
            />
            <Route
              path="/products/:id"
              element={user ? <ProductDetail user={user} onLogout={() => handleLogout(false)} /> : <Navigate to="/login" replace state={{ sessionExpired: true }} />}
            />
            <Route path="/customers" element={artworkGuard(<Customers user={user!} onLogout={() => handleLogout(false)} />)} />
            <Route
              path="/customers/create"
              element={user && user.department === 'Exports' ? <CreateCustomer /> : <Navigate to="/login" replace state={{ sessionExpired: true }} />}
            />
            <Route path="/customers/:id" element={authGuard(<CustomerDetail user={user!} onLogout={() => handleLogout(false)} />)} />
            <Route path="/registrations" element={artworkGuard(<Registrations user={user!} onLogout={() => handleLogout(false)} />)} />
            <Route path="/alerts" element={authGuard(<Alerts user={user!} onLogout={() => handleLogout(false)} />)} />
            <Route path="/audit-logs" element={artworkGuard(<AuditLogs user={user!} onLogout={() => handleLogout(false)} />)} />
            <Route
              path="/regulatory-customers"
              element={user ? <RegulatoryCustomers user={user} onLogout={() => handleLogout(false)} /> : <Navigate to="/login" replace state={{ sessionExpired: true }} />}
            />
            <Route path="/search" element={authGuard(<SearchResults />)} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </div>
    </Router>
  );
}

export default App;
