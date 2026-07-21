import React, { useState, useEffect } from 'react';
import { registrationAPI, productAPI } from '../services/api';
import Header from './Header';

interface RegistrationsProps {
  user: any;
  onLogout: () => void;
}

const Registrations: React.FC<RegistrationsProps> = ({ user, onLogout }) => {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [filteredSkus, setFilteredSkus] = useState<any[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    country: '',
    sku: '',
    registration_number: '',
    registration_status: 'Active',
    registration_issue_date: '',
    registration_expiry_date: '',
    remarks: '',
  });

  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchData(1);
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      const response = await registrationAPI.getCountries();
      setCountries(response.data.countries || []);
    } catch (error) {
      console.error('Error fetching countries:', error);
    }
  };

  const fetchData = async (p: number = page) => {
    try {
      setLoading(true);
      const skip = (p - 1) * pageSize;
      const regRes = await registrationAPI.getRegistrations(skip, pageSize);
      setRegistrations(regRes.data);
      setHasMore(regRes.data.length === pageSize);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };


  // Country change → immediately load SKUs for that country and reset SKU
  const handleCountryChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const country = e.target.value;
    setFormData(prev => ({ ...prev, country, sku: '' }));
    setFilteredSkus([]);
    setFormError('');
    if (country) {
      try {
        const response = await productAPI.getProductsByCountry(country);
        setFilteredSkus(response.data);
      } catch (error) {
        console.error(`Error fetching products for ${country}:`, error);
        setFilteredSkus([]);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      country: '',
      sku: '',
      registration_number: '',
      registration_status: 'Active',
      registration_issue_date: '',
      registration_expiry_date: '',
      remarks: '',
    });
    setFilteredSkus([]);
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await registrationAPI.createRegistration({
        ...formData,
        registration_issue_date: formData.registration_issue_date || null,
        registration_expiry_date: formData.registration_expiry_date || null,
      });
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Error creating registration';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };


  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Active':
        return 'status-accepted';
      case 'Expired':
        return 'status-risk';
      default:
        return 'status-hold';
    }
  };

  const isExpiringSoon = (expiryDate: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 90 && diffDays > 0;
  };

  const isExpired = (expiryDate: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  if (loading) {
    return <div className="loading">Loading registrations...</div>;
  }

  return (
    <div className="dashboard-container">
      <Header user={user} onLogout={onLogout} />

      <div className="panel">
        <div className="panel-header">
          <h2>Product Registrations</h2>
          <button className="submit-button" onClick={() => setShowModal(true)}>
            + Add Registration
          </button>
        </div>

        {/* Desktop Table View */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Country</th>
                <th>SKU</th>
                <th>Product</th>
                <th>Registration Number</th>
                <th>Status</th>
                <th>Issue Date</th>
                <th>Expiry Date</th>
                <th>Certificate</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((reg) => (
                <tr
                  key={reg.id}
                  style={{
                    backgroundColor: isExpired(reg.registration_expiry_date)
                      ? '#ffebee'
                      : isExpiringSoon(reg.registration_expiry_date)
                      ? '#fff3e0'
                      : 'inherit',
                  }}
                >
                  <td>{reg.country}</td>
                  <td>{reg.sku}</td>
                  <td>{reg.product?.product_name}</td>
                  <td>{reg.registration_number}</td>
                  <td>
                    <span className={`status-badge ${getStatusClass(reg.registration_status)}`}>
                      {reg.registration_status}
                    </span>
                  </td>
                  <td>
                    {reg.registration_issue_date
                      ? new Date(reg.registration_issue_date).toLocaleDateString()
                      : '-'}
                  </td>
                  <td>
                    {reg.registration_expiry_date
                      ? new Date(reg.registration_expiry_date).toLocaleDateString()
                      : '-'}
                    {isExpiringSoon(reg.registration_expiry_date) && (
                      <span style={{ color: '#ff9800', marginLeft: '5px' }}>⚠️ Expiring Soon</span>
                    )}
                    {isExpired(reg.registration_expiry_date) && (
                      <span style={{ color: '#f44336', marginLeft: '5px' }}>❌ Expired</span>
                    )}
                  </td>
                  <td>{reg.certificate_path ? '✓' : '✗'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="mobile-table-cards">
          {registrations.map((reg) => (
            <div
              key={reg.id}
              className="mobile-card"
              style={{
                backgroundColor: isExpired(reg.registration_expiry_date)
                  ? '#ffebee'
                  : isExpiringSoon(reg.registration_expiry_date)
                  ? '#fff3e0'
                  : '#f8f9fa',
              }}
            >
              <div className="mobile-card-row">
                <span className="mobile-card-label">Country</span>
                <span className="mobile-card-value">{reg.country}</span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">SKU</span>
                <span className="mobile-card-value">{reg.sku}</span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Product</span>
                <span className="mobile-card-value">{reg.product?.product_name}</span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Registration Number</span>
                <span className="mobile-card-value">{reg.registration_number}</span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Status</span>
                <span className="mobile-card-value">
                  <span className={`status-badge ${getStatusClass(reg.registration_status)}`}>
                    {reg.registration_status}
                  </span>
                </span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Issue Date</span>
                <span className="mobile-card-value">
                  {reg.registration_issue_date
                    ? new Date(reg.registration_issue_date).toLocaleDateString()
                    : '-'}
                </span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Expiry Date</span>
                <span className="mobile-card-value">
                  {reg.registration_expiry_date
                    ? new Date(reg.registration_expiry_date).toLocaleDateString()
                    : '-'}
                  {isExpiringSoon(reg.registration_expiry_date) && (
                    <span style={{ color: '#ff9800', marginLeft: '5px', fontSize: '12px' }}>⚠️ Expiring Soon</span>
                  )}
                  {isExpired(reg.registration_expiry_date) && (
                    <span style={{ color: '#f44336', marginLeft: '5px', fontSize: '12px' }}>❌ Expired</span>
                  )}
                </span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Certificate</span>
                <span className="mobile-card-value">{reg.certificate_path ? '✓ Available' : '✗ Not Available'}</span>
              </div>
            </div>
          ))}
        </div>

        {registrations.length === 0 && (
          <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            No registrations found
          </p>
        )}

        {/* Pagination Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <button 
            className="nav-button" 
            disabled={page === 1 || loading} 
            onClick={() => { const newPage = page - 1; setPage(newPage); fetchData(newPage); }}
            style={{ opacity: (page === 1 || loading) ? 0.5 : 1, cursor: (page === 1 || loading) ? 'not-allowed' : 'pointer' }}
          >
            ← Previous
          </button>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#475569' }}>
            Page {page}
          </span>
          <button 
            className="nav-button" 
            disabled={!hasMore || loading} 
            onClick={() => { const newPage = page + 1; setPage(newPage); fetchData(newPage); }}
            style={{ opacity: (!hasMore || loading) ? 0.5 : 1, cursor: (!hasMore || loading) ? 'not-allowed' : 'pointer' }}
          >
            Next →
          </button>
        </div>
      </div>


      {/* Add Registration Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Registration</h2>
            <form onSubmit={handleSubmit}>

              {/* ── Inline Error Banner ── */}
              {formError && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  borderRadius: '7px',
                  padding: '10px 14px',
                  marginBottom: '14px',
                  color: '#dc2626',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  ⚠️ {formError}
                </div>
              )}

              {/* ── Step 1: Country Dropdown ── */}
              <div className="form-group">
                <label>Country *</label>
                <select
                  value={formData.country}
                  onChange={handleCountryChange}
                  required
                >
                  <option value="">— Select Country —</option>
                  {countries.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              {/* ── Step 2: SKU Dropdown (filtered by country) ── */}
              <div className="form-group">
                <label>SKU *</label>
                <select
                  value={formData.sku}
                  onChange={(e) => { setFormData({ ...formData, sku: e.target.value }); setFormError(''); }}
                  required
                  disabled={!formData.country}
                  style={{ opacity: !formData.country ? 0.5 : 1 }}
                >
                  <option value="">— Select SKU —</option>
                  {filteredSkus.map((product) => (
                    <option key={product.sku_code} value={product.sku_code}>
                      {product.sku_code} - {product.product_name}
                    </option>
                  ))}
                </select>
                {formData.country && filteredSkus.length === 0 && (
                  <small style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                    No products found for this country
                  </small>
                )}
              </div>

              {/* ── Registration Number ── */}
              <div className="form-group">
                <label>Registration Number *</label>
                <input
                  type="text"
                  value={formData.registration_number}
                  onChange={(e) => { setFormData({ ...formData, registration_number: e.target.value }); setFormError(''); }}
                  required
                  placeholder="e.g. REG-2024-001"
                />
              </div>

              <div className="form-group">
                <label>Registration Status</label>
                <select
                  value={formData.registration_status}
                  onChange={(e) => setFormData({ ...formData, registration_status: e.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Expired">Expired</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <div className="form-group">
                <label>Issue Date</label>
                <input
                  type="date"
                  value={formData.registration_issue_date}
                  onChange={(e) => setFormData({ ...formData, registration_issue_date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Expiry Date</label>
                <input
                  type="date"
                  value={formData.registration_expiry_date}
                  onChange={(e) => setFormData({ ...formData, registration_expiry_date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Remarks</label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  rows={3}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="submit-button" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Add Registration'}
                </button>
                <button
                  type="button"
                  className="nav-button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Registrations;
