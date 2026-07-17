import React, { useState, useEffect, useCallback } from 'react';
import { alertAPI } from '../services/api';
import { useNavigate, useLocation } from 'react-router-dom';

interface HeaderProps {
  user: any;
  onLogout: () => void;
  refreshAlerts?: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState<number>(0);

  const fetchUnreadAlerts = useCallback(async () => {
    try {
      const response = await alertAPI.getAlerts();
      const unreadCount = response.data.filter((alert: any) => !alert.is_read).length;
      setUnreadAlertsCount(unreadCount);
    } catch (error) {
      console.error('Error fetching unread alerts:', error);
    }
  }, []);

  useEffect(() => {
    fetchUnreadAlerts();
  }, [fetchUnreadAlerts]);

  console.log('User Department:', user.department, 'User Role:', user.role);

  const navItems = user.department === 'Artwork'
    ? [
        { path: '/', label: 'Dashboard' },
        { path: '/orders', label: 'Orders' },
        { path: '/products', label: 'Products' },
        { path: '/alerts', label: 'Alerts' },
      ]
    : user.department === 'Regulatory'
    ? [
        { path: '/', label: 'Dashboard' },
        { path: '/registrations', label: 'Registrations' },
        { path: '/products', label: 'Products' },
        { path: '/alerts', label: 'Alerts' },
        { path: '/audit-logs', label: 'Audit Logs' },
      ]
    : user.department === 'Exports' && user.role === 'manager'
    ? [
        { path: '/', label: 'Dashboard' },
        { path: '/orders', label: 'Orders' },
        { path: '/customers', label: 'Customers' },
        { path: '/alerts', label: 'Alerts' },
        { path: '/audit-logs', label: 'Audit Logs' },
      ]
    : user.department === 'Exports'
    ? [
        { path: '/', label: 'Dashboard' },
        { path: '/orders', label: 'Orders' },
        { path: '/customers', label: 'Customers' },
        { path: '/alerts', label: 'Alerts' },
        { path: '/audit-logs', label: 'Audit Logs' },
      ]
    : [
        { path: '/', label: 'Dashboard' },
        { path: '/orders', label: 'Orders' },
        { path: '/alerts', label: 'Alerts' },
        { path: '/audit-logs', label: 'Audit Logs' },
      ];

  const handleNavClick = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <div className="header">
      <div className="header-left">
        <h1>EOCT - Export Order Control Tower</h1>
        <button
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? '✕ Close Menu' : '☰ Menu'}
        </button>
        <nav className={`nav-menu ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          {navItems.map((item) => (
            <button
              key={item.path}
              className={`nav-button ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => handleNavClick(item.path)}
            >
              {item.label}
              {item.path === '/alerts' && unreadAlertsCount > 0 && (
                <span className="alert-badge" style={{
                  backgroundColor: 'red',
                  color: 'white',
                  borderRadius: '50%',
                  padding: '2px 6px',
                  marginLeft: '8px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}>
                  {unreadAlertsCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
      <div className="header-right">
        <div className="user-info">
          <div>
            <strong>{user.name}</strong>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {user.department} | {user.employee_id}
            </div>
          </div>
          <button className="logout-button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Header;

