import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';

interface LoginProps {
  onLogin: (user: any, token: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const location = useLocation();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if redirected due to expired session
    const state = location.state as { sessionExpired?: boolean; message?: string } | null;
    const query = new URLSearchParams(location.search);
    if (state?.sessionExpired || query.get('session') === 'expired') {
      setSessionNotice(state?.message || 'Your session has expired. Please sign in again to continue.');
    }

    const handleExpiredEvent = (e: any) => {
      setSessionNotice(e.detail?.message || 'Your session has expired. Please sign in again to continue.');
    };

    window.addEventListener('auth-session-expired', handleExpiredEvent);
    return () => {
      window.removeEventListener('auth-session-expired', handleExpiredEvent);
    };
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSessionNotice(null);
    setLoading(true);

    try {
      const response = await authAPI.login(employeeId.trim(), password);
      const { access_token, user } = response.data;
      onLogin(user, access_token);
    } catch (err: any) {
      console.error("Login failed:", err);
      setError(err.response?.data?.detail || 'Invalid Employee ID or Password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-logo">
          <h1>EOCT</h1>
          <p>Export Order Control Tower</p>
        </div>

        {sessionNotice && (
          <div className="session-expired-banner">
            <span className="banner-icon">⚠️</span>
            <span>{sessionNotice}</span>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="employeeId">Exports Manager Login ID</label>
            <input
              type="text"
              id="employeeId"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="Enter your Exports Manager Login ID"
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
