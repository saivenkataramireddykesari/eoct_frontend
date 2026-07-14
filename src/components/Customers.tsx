import React, { useState, useEffect } from 'react';
import { customerAPI } from '../services/api';
import Header from './Header';

interface CustomersProps {
  user: any;
  onLogout: () => void;
}

const Customers: React.FC<CustomersProps> = ({ user, onLogout }) => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    country: '',
    payment_terms: '',
    agreement_status: 'Pending',
    agreement_validity: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await customerAPI.getCustomers();
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await customerAPI.createCustomer({
        ...formData,
        agreement_validity: formData.agreement_validity || null,
      });
      setShowModal(false);
      fetchCustomers();
      setFormData({
        customer_name: '',
        country: '',
        payment_terms: '',
        agreement_status: 'Pending',
        agreement_validity: '',
      });
    } catch (error) {
      console.error('Error creating customer:', error);
      alert('Error creating customer');
    }
  };

  const getAgreementStatusClass = (status: string) => {
    switch (status) {
      case 'Active':
        return 'status-accepted';
      case 'Expired':
        return 'status-risk';
      default:
        return 'status-hold';
    }
  };

  if (loading) {
    return <div className="loading">Loading customers...</div>;
  }

  return (
    <div className="dashboard-container">
      <Header user={user} onLogout={onLogout} />

      <div className="panel">
        <div className="panel-header">
          <h2>Customers</h2>
          <button className="submit-button" onClick={() => setShowModal(true)}>
            + Add Customer
          </button>
        </div>

        {/* Desktop Table View */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Country</th>
                <th>Payment Terms</th>
                <th>Agreement Status</th>
                <th>Agreement Validity</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>{customer.customer_name}</td>
                  <td>{customer.country}</td>
                  <td>{customer.payment_terms}</td>
                  <td>
                    <span className={`status-badge ${getAgreementStatusClass(customer.agreement_status)}`}>
                      {customer.agreement_status}
                    </span>
                  </td>
                  <td>
                    {customer.agreement_validity
                      ? new Date(customer.agreement_validity).toLocaleDateString()
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="mobile-table-cards">
          {customers.map((customer) => (
            <div key={customer.id} className="mobile-card">
              <div className="mobile-card-row">
                <span className="mobile-card-label">Customer Name</span>
                <span className="mobile-card-value">{customer.customer_name}</span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Country</span>
                <span className="mobile-card-value">{customer.country}</span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Payment Terms</span>
                <span className="mobile-card-value">{customer.payment_terms || '-'}</span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Agreement Status</span>
                <span className="mobile-card-value">
                  <span className={`status-badge ${getAgreementStatusClass(customer.agreement_status)}`}>
                    {customer.agreement_status}
                  </span>
                </span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Agreement Validity</span>
                <span className="mobile-card-value">
                  {customer.agreement_validity
                    ? new Date(customer.agreement_validity).toLocaleDateString()
                    : '-'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {customers.length === 0 && (
          <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            No customers found
          </p>
        )}
      </div>

      {/* Add Customer Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Customer</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Customer Name *</label>
                <input
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Country *</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Payment Terms</label>
                <input
                  type="text"
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  placeholder="e.g., Net 30, Net 45"
                />
              </div>

              <div className="form-group">
                <label>Agreement Status</label>
                <select
                  value={formData.agreement_status}
                  onChange={(e) => setFormData({ ...formData, agreement_status: e.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Expired">Expired</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <div className="form-group">
                <label>Agreement Validity</label>
                <input
                  type="date"
                  value={formData.agreement_validity}
                  onChange={(e) => setFormData({ ...formData, agreement_validity: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="submit-button">Add Customer</button>
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

export default Customers;
