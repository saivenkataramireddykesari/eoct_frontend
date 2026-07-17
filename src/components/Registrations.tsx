import React, { useState, useEffect } from 'react';
import { registrationAPI, productAPI } from '../services/api';
import Header from './Header';

interface RegistrationsProps {
  user: any;
  onLogout: () => void;
}

const Registrations: React.FC<RegistrationsProps> = ({ user, onLogout }) => {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]); // All products
  const [filteredSkus, setFilteredSkus] = useState<any[]>([]); // SKUs filtered by country
  const [countries, setCountries] = useState<string[]>([]); // List of countries
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    country: '',
    sku: '',
    registration_number: '',
    registration_status: 'Active',
    registration_issue_date: '',
    registration_expiry_date: '',
    remarks: '',
  });

  useEffect(() => {
    fetchData();
    fetchCountries();
  }, []);

  useEffect(() => {
    if (formData.country) {
      filterProductsByCountry(formData.country);
    } else {
      setFilteredSkus([]); // Clear SKUs if no country selected
    }
  }, [formData.country, products]); // Re-run when country or all products change

  const fetchCountries = async () => {
    try {
      const response = await registrationAPI.getCountries();
      console.log('API Response for Countries:', response);
      setCountries(response.data.countries);
      console.log('Countries state after update:', response.data.countries);
    } catch (error) {
      console.error('Error fetching countries:', error);
    }
  };

  const filterProductsByCountry = async (country: string) => {
    try {
      const response = await productAPI.getProductsByCountry(country);
      setFilteredSkus(response.data);
    } catch (error) {
      console.error(`Error fetching products for ${country}:`, error);
      setFilteredSkus([]);
    }
  };

  const fetchData = async () => {
    try {
      const regRes = await registrationAPI.getRegistrations();
      setRegistrations(regRes.data);
      // No initial product fetching, as it will be dynamic based on country
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const country = e.target.value;
    setFormData(prev => ({ ...prev, country: country, sku: '' })); // Reset SKU when country changes
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await registrationAPI.createRegistration({
        ...formData,
        registration_issue_date: formData.registration_issue_date || null,
        registration_expiry_date: formData.registration_expiry_date || null,
      });
      setShowModal(false);
      fetchData();
      setFormData({
        country: '',
        sku: '',
        registration_number: '',
        registration_status: 'Active',
        registration_issue_date: '',
        registration_expiry_date: '',
        remarks: '',
      });
    } catch (error) {
      console.error('Error creating registration:', error);
      alert('Error creating registration');
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
      </div>

      {/* Add Registration Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Registration</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Country *</label>
                <select
                  value={formData.country}
                  onChange={handleCountryChange}
                  required
                >
                  <option value="">Select Country</option>
                  {countries.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>SKU *</label>
                <select
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  required
                >
                  <option value="">Select SKU</option>
                  {filteredSkus.map((product) => (
                    <option key={product.sku_code} value={product.sku_code}>
                      {product.sku_code} - {product.product_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Registration Number *</label>
                <input
                  type="text"
                  value={formData.registration_number}
                  onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                  required
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
                <button type="submit" className="submit-button">Add Registration</button>
                <button type="button" className="nav-button" onClick={() => setShowModal(false)}>
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
