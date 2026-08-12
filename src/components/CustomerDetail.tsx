import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { customerAPI, formatErrorMessage } from '../services/api';
import { Customer } from '../shared-types';
import Header from './Header';

interface CustomerDetailProps {
  user: any;
  onLogout: () => void;
}

const CustomerDetail: React.FC<CustomerDetailProps> = ({ user, onLogout }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomer = async () => {
      if (!id) {
        setError('Customer ID is missing.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await customerAPI.getCustomer(Number(id));
        setCustomer(response.data);
      } catch (err) {
        console.error('Error fetching customer details:', err);
        setError(formatErrorMessage(err, 'Failed to load customer details.'));
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [id]);

  if (loading) {
    return (
      <div className="dashboard-container">
        <Header user={user} onLogout={onLogout} />
        <div className="panel">
          <div className="loading-message">Loading customer details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <Header user={user} onLogout={onLogout} />
        <div className="panel">
          <div className="error-message">{error}</div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="dashboard-container">
        <Header user={user} onLogout={onLogout} />
        <div className="panel">
          <div className="no-data-message">No customer found.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Header user={user} onLogout={onLogout} />
      <div className="panel">
        <div className="panel-header">
          <h2>Customer Details: {customer.customer_name}</h2>
          <button onClick={() => navigate('/customers')} className="back-button">
            Back to Customers
          </button>
        </div>

        <div className="detail-grid">
          <div className="detail-item">
            <strong>Customer Name:</strong>
            <span>{customer.customer_name}</span>
          </div>
          <div className="detail-item">
            <strong>Country:</strong>
            <span>{customer.country?.name || 'N/A'}</span>
          </div>
          <div className="detail-item">
            <strong>Shipping Terms:</strong>
            <span>{customer.payment_terms || 'N/A'}</span>
          </div>
          <div className="detail-item">
            <strong>Agreement Status:</strong>
            <span className={`status-badge ${customer.agreement_status === 'Active' ? 'status-accepted' : customer.agreement_status === 'Expired' ? 'status-risk' : 'status-hold'}`}>
              {customer.agreement_status}
            </span>
          </div>
          <div className="detail-item">
            <strong>Agreement Validity:</strong>
            <span>{customer.agreement_validity ? new Date(customer.agreement_validity).toLocaleDateString() : 'N/A'}</span>
          </div>
          {/* Add more customer details as needed */}
        </div>
      </div>
    </div>
  );
};

export default CustomerDetail;
