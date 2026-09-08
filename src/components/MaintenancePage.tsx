import React, { useState, useEffect } from 'react';
import { systemAPI, formatErrorMessage } from '../services/api';

interface MaintenancePageProps {
  user?: any;
  maintenanceData?: {
    message?: string;
    estimated_completion?: string;
    updated_at?: string;
  };
  onRefreshStatus?: () => void;
  onDisableMaintenance?: () => void;
}

const MaintenancePage: React.FC<MaintenancePageProps> = ({
  user,
  maintenanceData,
  onRefreshStatus,
  onDisableMaintenance
}) => {
  const [checking, setChecking] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<string>(new Date().toLocaleTimeString());
  const [statusMessage, setStatusMessage] = useState<string>(
    maintenanceData?.message || 'We are currently performing scheduled maintenance to upgrade infrastructure and optimize system performance. All your data remains completely safe and secure.'
  );
  const [estimatedEnd, setEstimatedEnd] = useState<string>(
    maintenanceData?.estimated_completion || 'Approx. 30 minutes'
  );

  // Admin toggle controls state
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [customMsgInput, setCustomMsgInput] = useState(statusMessage);
  const [customEndInput, setCustomEndInput] = useState(estimatedEnd);
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminFeedback, setAdminFeedback] = useState<string | null>(null);

  // Support modal state
  const [showSupportModal, setShowSupportModal] = useState(false);

  useEffect(() => {
    if (maintenanceData?.message) {
      setStatusMessage(maintenanceData.message);
      setCustomMsgInput(maintenanceData.message);
    }
    if (maintenanceData?.estimated_completion) {
      setEstimatedEnd(maintenanceData.estimated_completion);
      setCustomEndInput(maintenanceData.estimated_completion);
    }
  }, [maintenanceData]);

  const handleCheckStatus = async () => {
    setChecking(true);
    setAdminFeedback(null);
    try {
      const res = await systemAPI.getMaintenanceStatus();
      setLastCheckTime(new Date().toLocaleTimeString());
      if (res.data) {
        setStatusMessage(res.data.message || statusMessage);
        setEstimatedEnd(res.data.estimated_completion || estimatedEnd);
        if (!res.data.in_maintenance) {
          if (onRefreshStatus) {
            onRefreshStatus();
          } else {
            window.location.href = '/';
          }
        }
      }
    } catch (err) {
      console.error('Error fetching maintenance status:', err);
    } finally {
      setTimeout(() => setChecking(false), 500);
    }
  };

  const handleToggleMaintenanceMode = async (enable: boolean) => {
    setAdminSaving(true);
    setAdminFeedback(null);
    try {
      await systemAPI.setMaintenanceStatus(enable, customMsgInput, customEndInput);
      setAdminFeedback(enable ? 'Maintenance mode enabled' : 'Maintenance mode turned OFF successfully!');
      if (!enable && onDisableMaintenance) {
        onDisableMaintenance();
      } else if (onRefreshStatus) {
        onRefreshStatus();
      }
    } catch (err: any) {
      setAdminFeedback(`Failed to update maintenance state: ${formatErrorMessage(err)}`);
    } finally {
      setAdminSaving(false);
    }
  };

  const isAdmin = user && (user.role === 'admin' || user.role === 'manager' || user.department === 'Exports');

  return (
    <div className="maintenance-wrapper">
      {/* Background ambient glow shapes */}
      <div className="bg-glow bg-glow-1"></div>
      <div className="bg-glow bg-glow-2"></div>
      <div className="bg-glow bg-glow-3"></div>

      <div className="maintenance-container">
        {/* Top Branding Header */}
        <div className="maintenance-header">
          <div className="maintenance-brand">
            <span className="brand-icon">⚡</span>
            <span className="brand-text">EOCT Control Tower</span>
          </div>
          <div className="maintenance-live-badge">
            <span className="pulse-dot"></span>
            <span>Maintenance Mode Active</span>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="maintenance-card">
          {/* Animated Vector Illustration */}
          <div className="illustration-box">
            <svg
              className="maintenance-svg"
              viewBox="0 0 200 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer orbit circle */}
              <circle
                cx="100"
                cy="100"
                r="85"
                stroke="url(#grad-orbit)"
                strokeWidth="2"
                strokeDasharray="6 6"
                className="animated-orbit"
              />

              {/* Gear Outer */}
              <g className="animated-gear-main">
                <circle cx="100" cy="100" r="45" fill="url(#grad-gear)" />
                <path
                  d="M100 45V35M100 165V155M155 100H165M35 100H45M139 139L146 146M54 54L61 61M139 61L146 54M54 146L61 139"
                  stroke="#764ba2"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <circle cx="100" cy="100" r="28" fill="#131722" />
              </g>

              {/* Small Secondary Gear */}
              <g className="animated-gear-sub">
                <circle cx="145" cy="65" r="24" fill="url(#grad-gear-small)" />
                <circle cx="145" cy="65" r="12" fill="#131722" />
              </g>

              {/* Center Wrench / Sparkle */}
              <path
                d="M93 107L107 93M90 100L96 94M104 106L110 100"
                stroke="#667eea"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              <defs>
                <linearGradient id="grad-orbit" x1="0" y1="0" x2="200" y2="200">
                  <stop offset="0%" stopColor="#667eea" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#764ba2" stopOpacity="0.2" />
                </linearGradient>
                <linearGradient id="grad-gear" x1="55" y1="55" x2="145" y2="145">
                  <stop offset="0%" stopColor="#667eea" />
                  <stop offset="100%" stopColor="#764ba2" />
                </linearGradient>
                <linearGradient id="grad-gear-small" x1="120" y1="40" x2="170" y2="90">
                  <stop offset="0%" stopColor="#f39c12" />
                  <stop offset="100%" stopColor="#e74c3c" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <h1 className="maintenance-title">System Under Maintenance</h1>
          <p className="maintenance-description">{statusMessage}</p>

          {/* Time & Info Box */}
          <div className="maintenance-info-grid">
            <div className="info-item">
              <div className="info-icon">⏱️</div>
              <div className="info-content">
                <span className="info-label">Estimated Resolution</span>
                <span className="info-value">{estimatedEnd}</span>
              </div>
            </div>

            <div className="info-item">
              <div className="info-icon">🛡️</div>
              <div className="info-content">
                <span className="info-label">Data Integrity</span>
                <span className="info-value">Fully Protected</span>
              </div>
            </div>

            <div className="info-item">
              <div className="info-icon">🔄</div>
              <div className="info-content">
                <span className="info-label">Last Checked</span>
                <span className="info-value">{lastCheckTime}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="maintenance-actions">
            <button
              className={`btn-primary ${checking ? 'btn-loading' : ''}`}
              onClick={handleCheckStatus}
              disabled={checking}
            >
              {checking ? (
                <>
                  <span className="btn-spinner"></span> Checking Server Status...
                </>
              ) : (
                <>
                  <span>↻</span> Refresh & Check Status
                </>
              )}
            </button>

            <button
              className="btn-secondary"
              onClick={() => setShowSupportModal(true)}
            >
              💬 Contact Support
            </button>

            {isAdmin && (
              <button
                className="btn-admin-toggle"
                onClick={() => setShowAdminPanel(!showAdminPanel)}
              >
                ⚙️ Admin Controls {showAdminPanel ? '▲' : '▼'}
              </button>
            )}
          </div>

          {/* Admin Control Panel (Visible to Admins / Managers) */}
          {isAdmin && showAdminPanel && (
            <div className="admin-panel-box">
              <h3 className="admin-panel-heading">🛠️ System Administrator Control Panel</h3>
              <p className="admin-panel-desc">
                You are currently logged in as <strong>{user?.name}</strong> ({user?.department || user?.role}).
                You can toggle maintenance mode live or modify user status messages.
              </p>

              {adminFeedback && (
                <div className={`admin-feedback ${adminFeedback.includes('Failed') ? 'feedback-error' : 'feedback-success'}`}>
                  {adminFeedback}
                </div>
              )}

              <div className="admin-form-group">
                <label>Maintenance Message:</label>
                <textarea
                  rows={3}
                  value={customMsgInput}
                  onChange={(e) => setCustomMsgInput(e.target.value)}
                  placeholder="Enter message for system users..."
                />
              </div>

              <div className="admin-form-group">
                <label>Estimated Completion Time:</label>
                <input
                  type="text"
                  value={customEndInput}
                  onChange={(e) => setCustomEndInput(e.target.value)}
                  placeholder="e.g. 2:30 PM IST or 45 mins"
                />
              </div>

              <div className="admin-btn-row">
                <button
                  className="btn-danger"
                  onClick={() => handleToggleMaintenanceMode(false)}
                  disabled={adminSaving}
                >
                  🚀 Disable Maintenance Mode (Bring Site Live)
                </button>

                <button
                  className="btn-secondary-sm"
                  onClick={() => handleToggleMaintenanceMode(true)}
                  disabled={adminSaving}
                >
                  💾 Save Status Message
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="maintenance-footer">
          <p>© {new Date().getFullYear()} Export Order Control Tower (EOCT). All rights reserved.</p>
        </div>
      </div>

      {/* Support Contact Modal */}
      {showSupportModal && (
        <div className="modal-backdrop" onClick={() => setShowSupportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>System Support & Inquiries</h2>
              <button className="close-btn" onClick={() => setShowSupportModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>If you have urgent export order tracking requirements during this maintenance period, please contact support:</p>
              {/* <div className="support-detail-item">
                <strong>📧 Email:</strong> support.eoct@company.com
              </div> */}
              <div className="support-detail-item">
                <strong>📞 Helpdesk:</strong> 113
              </div>
              <div className="support-detail-item">
                <strong>🏢 IT Systems Operations:</strong> Export Order Control Tower Operations Desk
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setShowSupportModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenancePage;
