import React, { useState, useEffect } from 'react';
import { auditAPI } from '../services/api';
import Header from './Header';

interface AuditLogsProps {
  user: any;
  onLogout: () => void;
}

const AuditLogs: React.FC<AuditLogsProps> = ({ user, onLogout }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await auditAPI.getAuditLogs();
      setLogs(response.data);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return '#4caf50';
    if (action.includes('APPROVAL')) return '#2196f3';
    if (action.includes('REJECT')) return '#f44336';
    if (action.includes('UPDATE')) return '#ff9800';
    if (action.includes('DELETE')) return '#9c27b0';
    return '#666';
  };

  if (loading) {
    return <div className="loading">Loading audit logs...</div>;
  }

  return (
    <div className="dashboard-container">
      <Header user={user} onLogout={onLogout} />

      <div className="panel">
        <h2>Audit Trail</h2>

        {/* Desktop Table View */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Order ID</th>
                <th>Previous Status</th>
                <th>New Status</th>
                <th>Remarks</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                  <td>
                    {log.user?.name} ({log.user?.employee_id})
                  </td>
                  <td>
                    <span
                      className="status-badge"
                      style={{
                        backgroundColor: getActionColor(log.action),
                        color: 'white',
                      }}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td>{log.order?.order_id || '-'}</td>
                  <td>{log.previous_status || '-'}</td>
                  <td>{log.new_status || '-'}</td>
                  <td>{log.remarks || '-'}</td>
                  <td>{log.ip_address || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="mobile-table-cards">
          {logs.map((log) => (
            <div key={log.id} className="mobile-card">
              <div className="mobile-card-row">
                <span className="mobile-card-label">Timestamp</span>
                <span className="mobile-card-value">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">User</span>
                <span className="mobile-card-value">
                  {log.user?.name} ({log.user?.employee_id})
                </span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Action</span>
                <span className="mobile-card-value">
                  <span
                    className="status-badge"
                    style={{
                      backgroundColor: getActionColor(log.action),
                      color: 'white',
                    }}
                  >
                    {log.action}
                  </span>
                </span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Order ID</span>
                <span className="mobile-card-value">
                  {log.order?.order_id || '-'}
                </span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Previous Status</span>
                <span className="mobile-card-value">
                  {log.previous_status || '-'}
                </span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">New Status</span>
                <span className="mobile-card-value">
                  {log.new_status || '-'}
                </span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Remarks</span>
                <span className="mobile-card-value">
                  {log.remarks || '-'}
                </span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">IP Address</span>
                <span className="mobile-card-value">
                  {log.ip_address || '-'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {logs.length === 0 && (
          <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            No audit logs found
          </p>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
