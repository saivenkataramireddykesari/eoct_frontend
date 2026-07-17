import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, customerAPI, registrationAPI, productAPI } from '../services/api';
import Header from './Header';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ── Add Customer (Exports) ──────────────────────────────────────────────────
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    customer_name: '',
    country: '',
    payment_terms: '',
    agreement_status: 'Pending',
    agreement_validity: '',
  });
  const [customerSubmitting, setCustomerSubmitting] = useState(false);
  const [customerMsg, setCustomerMsg] = useState('');

  // ── Add Registration (Regulatory) ──────────────────────────────────────────
  const [showRegForm, setShowRegForm] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [regForm, setRegForm] = useState({
    country: '',
    sku: '',
    registration_number: '',
    registration_status: 'Active',
    registration_issue_date: '',
    registration_expiry_date: '',
    remarks: '',
  });
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regMsg, setRegMsg] = useState('');

  useEffect(() => {
    fetchDashboard();
    if (user.department === 'Regulatory') {
      productAPI.getProducts().then(r => setProducts(r.data)).catch(() => {});
    }
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await dashboardAPI.getDashboard();
      setDashboardData(response.data);
      console.log('Dashboard Data:', response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // ── Customer submit ────────────────────────────────────────────────────────
  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomerSubmitting(true);
    setCustomerMsg('');
    try {
      await customerAPI.createCustomer({
        ...customerForm,
        agreement_validity: customerForm.agreement_validity || null,
      });
      setCustomerMsg('✅ Customer added successfully!');
      setCustomerForm({ customer_name: '', country: '', payment_terms: '', agreement_status: 'Pending', agreement_validity: '' });
      setTimeout(() => { setCustomerMsg(''); setShowCustomerForm(false); }, 2500);
    } catch (err: any) {
      setCustomerMsg('❌ ' + (err.response?.data?.detail || 'Error adding customer'));
    } finally {
      setCustomerSubmitting(false);
    }
  };

  // ── Registration submit ────────────────────────────────────────────────────
  const handleRegSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegSubmitting(true);
    setRegMsg('');
    try {
      await registrationAPI.createRegistration({
        ...regForm,
        registration_issue_date: regForm.registration_issue_date || null,
        registration_expiry_date: regForm.registration_expiry_date || null,
      });
      setRegMsg('✅ Registration added successfully!');
      setRegForm({ country: '', sku: '', registration_number: '', registration_status: 'Active', registration_issue_date: '', registration_expiry_date: '', remarks: '' });
      setTimeout(() => { setRegMsg(''); setShowRegForm(false); }, 2500);
    } catch (err: any) {
      setRegMsg('❌ ' + (err.response?.data?.detail || 'Error adding registration'));
    } finally {
      setRegSubmitting(false);
    }
  };

  const getStatusClass = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'NEW ORDER': 'status-new',
      'HOLD': 'status-hold',
      'ORDER ACCEPTED': 'status-accepted',
      'IN EXECUTION': 'status-execution',
      'AT RISK': 'status-risk',
      'READY FOR SHIPMENT': 'status-shipped',
      'SHIPPED': 'status-shipped',
      'DELIVERED': 'status-delivered',
    };
    return statusMap[status] || 'status-new';
  };

  const renderStats = () => {
    if (!dashboardData) return null;
    const { stats } = dashboardData;
    const userDept = user.department;
    let statCards: any[] = [];
    if (userDept === 'Exports') {
      statCards = [
        { label: 'New Orders', value: stats.new_orders, class: '' },
        { label: 'Pending Approval', value: stats.pending_approval, class: 'warning' },
        { label: 'Accepted', value: stats.accepted, class: 'success' },
        { label: 'In Execution', value: stats.in_execution, class: '' },
        { label: 'Ready for Shipment', value: stats.ready_shipment, class: '' },
        { label: 'Shipped', value: stats.shipped, class: '' },
        { label: 'Delivered', value: stats.delivered, class: 'success' },
        { label: 'At Risk', value: stats.at_risk, class: 'danger' },
      ];
    } else if (userDept === 'Regulatory') {
      statCards = [
        { label: 'Expiring Registrations', value: stats.expiring_registrations, class: 'warning' },
        { label: 'Missing Certificates', value: stats.missing_certificates, class: 'danger' },
        { label: 'Pending Approvals', value: stats.pending_approvals, class: '' },
      ];
    } else if (userDept === 'Management') {
      statCards = [
        { label: 'Open Orders', value: stats.open_orders, class: '' },
        { label: 'At Risk', value: stats.at_risk, class: 'danger' },
        { label: 'Delayed', value: stats.delayed, class: 'danger' },
        { label: 'On-Time Deliveries', value: `${stats.on_time_deliveries}/${stats.total_delivered}`, class: 'success' },
        { label: 'Compliance Issues', value: stats.compliance_issues, class: 'warning' },
      ];
    } else {
      statCards = [
        { label: 'Pending Approvals', value: stats.pending_approvals || 0, class: '' },
      ];
    }
    return (
      <div className="stats-grid">
        {statCards.map((stat, index) => (
          <div key={index} className={`stat-card ${stat.class}`}>
            <h3>{stat.label}</h3>
            <div className="stat-value">{stat.value}</div>
          </div>
        ))}
      </div>
    );
  };

  /* ── Inline form styles ───────────────────────────────────────────────── */
  const panel: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '20px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  };
  const panelHeader: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '18px',
  };
  const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' };
  const fld: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '5px' };
  const lbl: React.CSSProperties = { fontSize: '0.78rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' };
  const inp: React.CSSProperties = { padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '7px', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' };
  const btnRow: React.CSSProperties = { display: 'flex', gap: '10px', marginTop: '18px' };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard-container">
      <Header user={user} onLogout={onLogout} />

      {renderStats()}

      {/* ── Exports: Add Customer Quick Panel ─────────────────────────────── */}
      {user.department === 'Exports' && (
        <div style={panel}>
          <div style={panelHeader}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#1a237e' }}>👥 Customer Management</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="submit-button"
                onClick={() => setShowCustomerForm(!showCustomerForm)}
              >
                {showCustomerForm ? '✕ Cancel' : '+ Add Customer'}
              </button>
              <button className="nav-button" onClick={() => navigate('/customers')}>
                View All Customers
              </button>
            </div>
          </div>

          {showCustomerForm && (
            <form onSubmit={handleCustomerSubmit}>
              <div style={grid2}>
                <div style={fld}>
                  <label style={lbl}>Customer Name *</label>
                  <input style={inp} type="text" required
                    value={customerForm.customer_name}
                    onChange={e => setCustomerForm({ ...customerForm, customer_name: e.target.value })}
                    placeholder="e.g. Pharma Corp Ltd" />
                </div>
                <div style={fld}>
                  <label style={lbl}>Country *</label>
                  <input style={inp} type="text" required
                    value={customerForm.country}
                    onChange={e => setCustomerForm({ ...customerForm, country: e.target.value })}
                    placeholder="e.g. Kenya" />
                </div>
                <div style={fld}>
                  <label style={lbl}>Payment Terms</label>
                  <input style={inp} type="text"
                    value={customerForm.payment_terms}
                    onChange={e => setCustomerForm({ ...customerForm, payment_terms: e.target.value })}
                    placeholder="e.g. Net 30, Net 45" />
                </div>
                <div style={fld}>
                  <label style={lbl}>Agreement Status</label>
                  <select style={inp} value={customerForm.agreement_status}
                    onChange={e => setCustomerForm({ ...customerForm, agreement_status: e.target.value })}>
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Expired">Expired</option>
                  </select>
                </div>
                <div style={fld}>
                  <label style={lbl}>Agreement Validity</label>
                  <input style={inp} type="date"
                    value={customerForm.agreement_validity}
                    onChange={e => setCustomerForm({ ...customerForm, agreement_validity: e.target.value })} />
                </div>
              </div>
              {customerMsg && (
                <p style={{ marginTop: '12px', color: customerMsg.startsWith('✅') ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                  {customerMsg}
                </p>
              )}
              <div style={btnRow}>
                <button type="submit" className="submit-button" disabled={customerSubmitting}>
                  {customerSubmitting ? 'Saving…' : '✅ Save Customer'}
                </button>
                <button type="button" className="nav-button" onClick={() => setShowCustomerForm(false)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── Regulatory: Add Registration Quick Panel ───────────────────────── */}
      {user.department === 'Regulatory' && (
        <div style={panel}>
          <div style={panelHeader}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#1a237e' }}>📋 Registration Management</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="submit-button"
                onClick={() => setShowRegForm(!showRegForm)}
              >
                {showRegForm ? '✕ Cancel' : '+ Add Registration'}
              </button>
              <button className="nav-button" onClick={() => navigate('/registrations')}>
                View All Registrations
              </button>
            </div>
          </div>

          {showRegForm && (
            <form onSubmit={handleRegSubmit}>
              <div style={grid2}>
                <div style={fld}>
                  <label style={lbl}>Country *</label>
                  <input style={inp} type="text" required
                    value={regForm.country}
                    onChange={e => setRegForm({ ...regForm, country: e.target.value })}
                    placeholder="e.g. Kenya" />
                </div>
                <div style={fld}>
                  <label style={lbl}>SKU *</label>
                  <select style={inp} required value={regForm.sku}
                    onChange={e => setRegForm({ ...regForm, sku: e.target.value })}>
                    <option value="">— Select SKU —</option>
                    {products.map(p => (
                      <option key={p.id} value={p.sku_code}>{p.sku_code} – {p.product_name}</option>
                    ))}
                  </select>
                </div>
                <div style={fld}>
                  <label style={lbl}>Registration Number *</label>
                  <input style={inp} type="text" required
                    value={regForm.registration_number}
                    onChange={e => setRegForm({ ...regForm, registration_number: e.target.value })}
                    placeholder="e.g. REG-2024-001" />
                </div>
                <div style={fld}>
                  <label style={lbl}>Registration Status</label>
                  <select style={inp} value={regForm.registration_status}
                    onChange={e => setRegForm({ ...regForm, registration_status: e.target.value })}>
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Expired">Expired</option>
                  </select>
                </div>
                <div style={fld}>
                  <label style={lbl}>Issue Date</label>
                  <input style={inp} type="date"
                    value={regForm.registration_issue_date}
                    onChange={e => setRegForm({ ...regForm, registration_issue_date: e.target.value })} />
                </div>
                <div style={fld}>
                  <label style={lbl}>Expiry Date</label>
                  <input style={inp} type="date"
                    value={regForm.registration_expiry_date}
                    onChange={e => setRegForm({ ...regForm, registration_expiry_date: e.target.value })} />
                </div>
              </div>
              <div style={{ ...fld, marginTop: '14px' }}>
                <label style={lbl}>Remarks</label>
                <textarea style={{ ...inp, resize: 'vertical' }} rows={2}
                  value={regForm.remarks}
                  onChange={e => setRegForm({ ...regForm, remarks: e.target.value })}
                  placeholder="Any additional notes..." />
              </div>
              {regMsg && (
                <p style={{ marginTop: '12px', color: regMsg.startsWith('✅') ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                  {regMsg}
                </p>
              )}
              <div style={btnRow}>
                <button type="submit" className="submit-button" disabled={regSubmitting}>
                  {regSubmitting ? 'Saving…' : '✅ Save Registration'}
                </button>
                <button type="button" className="nav-button" onClick={() => setShowRegForm(false)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="content-grid">
        <div className="panel">
          <h2>Recent Orders</h2>
          {/* Desktop Table View */}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>SKU</th>
                  {user.department === 'Exports' && <th>Package Size</th>}
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData?.recent_orders?.map((order: any) => (
                  <tr key={order.id} onClick={() => navigate(`/orders/${order.id}`)} style={{ cursor: 'pointer' }}>
                    <td>{order.order_id}</td>
                    <td>{order.customer?.customer_name}</td>
                    <td>{order.sku}</td>
                    {user.department === 'Exports' && <td>{order.product?.pack_size || '-'}</td>}
                    <td>{order.quantity}</td>
                    <td>{order.product?.price || '-'}</td>
                    <td>
                      <span className={`status-badge ${getStatusClass(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>{new Date(order.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile Card View */}
          <div className="mobile-table-cards">
            {dashboardData?.recent_orders?.map((order: any) => (
              <div
                key={order.id}
                className="mobile-card"
                onClick={() => navigate(`/orders/${order.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Order ID</span>
                  <span className="mobile-card-value">{order.order_id}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Customer</span>
                  <span className="mobile-card-value">{order.customer?.customer_name}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">SKU</span>
                  <span className="mobile-card-value">{order.sku}</span>
                </div>
                {user.department === 'Exports' && (
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Package Size</span>
                    <span className="mobile-card-value">{order.product?.pack_size || '-'}</span>
                  </div>
                )}
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Quantity</span>
                  <span className="mobile-card-value">{order.quantity}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Price</span>
                  <span className="mobile-card-value">{order.product?.price || '-'}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Status</span>
                  <span className="mobile-card-value">
                    <span className={`status-badge ${getStatusClass(order.status)}`}>
                      {order.status}
                    </span>
                  </span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Created</span>
                  <span className="mobile-card-value">{new Date(order.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>Alerts</h2>
          {dashboardData?.alerts?.length === 0 ? (
            <p>No unread alerts</p>
          ) : (
            dashboardData?.alerts?.map((alert: any) => (
              <div key={alert.id} className={`alert-item ${alert.priority.toLowerCase()}`}>
                <p>{alert.message}</p>
                <small>{new Date(alert.created_at).toLocaleString()}</small>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
