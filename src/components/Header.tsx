import React, { useState, useEffect, useCallback } from 'react';
import { alertAPI, searchAPI } from '../services/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { SearchSuggestion } from '../shared-types';

interface HeaderProps {
  user: any;
  onLogout: () => void;
  refreshAlerts?: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
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

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (searchQuery.length > 2) {
        try {
          const response = await searchAPI.getSuggestions(searchQuery);
          setSuggestions(response.data.suggestions);
          setShowSuggestions(true);
        } catch (error) {
          console.error('Error fetching search suggestions:', error);
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 500); // 500ms debounce time

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  console.log('User Department:', user.department, 'User Role:', user.role);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setSearchQuery(suggestion.name);
    setSuggestions([]);
    setShowSuggestions(false);
    // Navigate based on suggestion type
    switch (suggestion.type) {
      case 'product':
        navigate(`/products/${suggestion.id}`); // Assuming product detail page
        break;
      case 'customer':
        navigate(`/customers/${suggestion.id}`); // Assuming customer detail page
        break;
      case 'order':
        navigate(`/orders/${suggestion.id}`); // Assuming order detail page
        break;
      default:
        // Handle generic search or navigate to a search results page
        navigate(`/search?query=${suggestion.name}`);
        break;
    }
  };

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
          <div className="search-bar-container">
            <input
              type="text"
              placeholder="Search..."
              className="search-input"
              value={searchQuery}
              onChange={handleSearchInputChange}
              onFocus={() => { if (searchQuery.length > 2) { setSuggestions([]); setShowSuggestions(true); } }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul className="suggestions-list">
                {suggestions.map((suggestion, index) => (
                  <li key={index} onMouseDown={() => handleSuggestionClick(suggestion)}>
                    {suggestion.name} ({suggestion.type})
                  </li>
                ))}
              </ul>
            )}
          </div>
          {navItems.map((item) => (
            <button
              key={item.path}
              className={`nav-button ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => handleNavClick(item.path)}
            >
              {item.label}
              {item.path === '/alerts' && unreadAlertsCount > 0 && (
                <span className="alert-badge">
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
