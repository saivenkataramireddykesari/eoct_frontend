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
    const params = new URLSearchParams(location.search);
    const q = params.get('search') || params.get('query') || '';
    setSearchQuery(q);
  }, [location.search]);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (searchQuery.trim().length > 0) {
        try {
          const response = await searchAPI.getSuggestions(searchQuery);
          setSuggestions(response.data.suggestions || []);
          setShowSuggestions(true);
        } catch (error) {
          console.error('Error fetching search suggestions:', error);
          setSuggestions([]);
          setShowSuggestions(true);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 150); // 150ms fast debounce for each word/character typed

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    const params = new URLSearchParams(location.search);
    if (val) {
      params.set('search', val);
    } else {
      params.delete('search');
    }
    const searchString = params.toString();
    const newPath = searchString ? `${location.pathname}?${searchString}` : location.pathname;
    navigate(newPath, { replace: true });
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setSearchQuery(suggestion.name);
    setSuggestions([]);
    setShowSuggestions(false);
    // Navigate based on suggestion type
    switch (suggestion.type) {
      case 'product':
        if (suggestion.id && !isNaN(Number(suggestion.id))) {
          navigate(`/products/${suggestion.id}`);
        } else {
          navigate(`/products?search=${encodeURIComponent(suggestion.name)}`);
        }
        break;
      case 'customer':
        if (user.department === 'Artwork') {
          navigate(`/products?search=${encodeURIComponent(suggestion.name)}`);
        } else {
          navigate(`/customers/${suggestion.id}`);
        }
        break;
      case 'order':
        if (user.department === 'Artwork') {
          navigate(`/products?search=${encodeURIComponent(suggestion.name)}`);
        } else {
          navigate(`/orders/${suggestion.id}`);
        }
        break;
      default:
        navigate(`/search?query=${encodeURIComponent(suggestion.name)}`);
        break;
    }
  };

  const navItems = user.department === 'Artwork'
    ? [
        { path: '/products', label: 'Products' },
        { path: '/alerts', label: 'Alerts' },
      ]
    : user.department === 'Regulatory'
    ? [

        { path: '/', label: 'Orders' },
        { path: '/registrations', label: 'Registrations' },
        { path: '/products', label: 'Products' },
        { path: '/alerts', label: 'Alerts' },
        { path: '/audit-logs', label: 'Audit Logs' },
      ]
    : user.department === 'Exports' && user.role === 'manager'
    ? [

        { path: '/', label: 'Orders' },
        { path: '/customers', label: 'Customers' },
        { path: '/alerts', label: 'Alerts' },
        { path: '/audit-logs', label: 'Audit Logs' },
      ]
    : user.department === 'Exports'
    ? [

        { path: '/', label: 'Orders' },
        { path: '/customers', label: 'Customers' },
        { path: '/alerts', label: 'Alerts' },
        { path: '/audit-logs', label: 'Audit Logs' },
      ]
    : [

        { path: '/', label: 'Orders' },
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim().length > 0) {
                  setShowSuggestions(false);
                  navigate(`/search?query=${searchQuery}`);
                }
              }}
              onFocus={() => { if (searchQuery.length > 2) { setShowSuggestions(true); } }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            {showSuggestions && searchQuery.length > 2 && (
              <ul className="suggestions-list">
                {suggestions.length > 0 ? (
                  suggestions.map((suggestion, index) => (
                    <li key={index} onMouseDown={() => handleSuggestionClick(suggestion)}>
                      {suggestion.name} ({suggestion.type})
                    </li>
                  ))
                ) : (
                  <li className="no-suggestions" style={{ padding: '8px 12px', color: '#888', cursor: 'default' }}>
                    No results found
                  </li>
                )}
                <li 
                  className="suggestion-filter" 
                  style={{ borderTop: '1px solid #eee', padding: '8px 12px', color: '#0056b3', cursor: 'pointer', fontStyle: 'italic', background: '#f8f9fa' }}
                  onMouseDown={() => {
                    setShowSuggestions(false);
                    navigate(`/search?query=${searchQuery}`);
                  }}
                >
                  See all results for "{searchQuery}"
                </li>
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
