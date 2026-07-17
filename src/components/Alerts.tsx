import React, { useState, useEffect } from 'react';
import { alertAPI } from '../services/api';
import Header from './Header';

interface AlertsProps {
  user: any;
  onLogout: () => void;
  refreshAlerts?: () => void;
}

const Alerts: React.FC<AlertsProps> = ({ user, onLogout, refreshAlerts }) => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await alertAPI.getAlerts();
      setAlerts(response.data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (alertId: number) => {
    try {
      await alertAPI.markAsRead(alertId);
      fetchAlerts();
      if (refreshAlerts) {
        refreshAlerts();
      }
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const getPriorityClass = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      case 'low':
        return 'low';
      default:
        return 'medium';
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'REGISTRATION_EXPIRY':
        return 'Registration Expiring';
      case 'ARTWORK_DELAY':
        return 'Artwork Delay';
      case 'MILESTONE_DELAY':
        return 'Milestone Delay';
      case 'DELIVERY_RISK':
        return 'Delivery Risk';
      case 'COMPLIANCE_ISSUE':
        return 'Compliance Issue';
      default:
        return type;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return '#f44336';
      case 'HIGH':
        return '#ff9800';
      case 'MEDIUM':
        return '#ffc107';
      default:
        return '#4caf50';
    }
  };

  if (loading) {
    return <div className="loading">Loading alerts...</div>;
  }

  return (
    <div className="dashboard-container">
      <Header user={user} onLogout={onLogout} refreshAlerts={refreshAlerts} />

      <div className="panel">
        <h2>Alerts & Notifications</h2>

        {alerts.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            No alerts found
          </p>
        ) : (
          <div>
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`alert-item ${getPriorityClass(alert.priority)}`}
                style={{
                  opacity: alert.is_read ? 0.6 : 1,
                  marginBottom: '15px',
                  padding: '20px',
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '15px'
                }}>
                  <div style={{ flex: 1, minWidth: '250px' }}>
                    <div style={{ 
                      display: 'flex', 
                      gap: '10px', 
                      marginBottom: '10px',
                      flexWrap: 'wrap'
                    }}>
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: getPriorityColor(alert.priority),
                          color: 'white',
                        }}
                      >
                        {alert.priority}
                      </span>
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: '#667eea',
                          color: 'white',
                        }}
                      >
                        {getAlertTypeLabel(alert.alert_type)}
                      </span>
                    </div>
                    <p style={{ marginTop: '10px', fontSize: '16px' }}>{alert.message}</p>
                    {alert.order_id && (
                      <p style={{ marginTop: '5px', color: '#666' }}>
                        Order ID: {alert.order_id}
                      </p>
                    )}
                    <small style={{ display: 'block', marginTop: '10px' }}>
                      {new Date(alert.created_at).toLocaleString()}
                    </small>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {!alert.is_read && (
                      <button
                        className="nav-button"
                        onClick={() => handleMarkAsRead(alert.id)}
                        style={{ minWidth: '100px' }}
                      >
                        Mark as Read
                      </button>
                    )}
                    {alert.is_read && (
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: '#e0e0e0',
                          color: '#666',
                        }}
                      >
                        Read
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Alerts;
