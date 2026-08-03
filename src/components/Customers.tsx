import React, { useState, useEffect } from 'react';
import { customerAPI, productAPI, formatErrorMessage } from '../services/api';
import { Customer, Country } from '../shared-types';
import Header from './Header';

interface CustomersProps {
  user: any;
  onLogout: () => void;
}

const Customers: React.FC<CustomersProps> = ({ user, onLogout }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [countries, setCountries] = useState<Country[]>([]);
  const [countryCustomers, setCountryCustomers] = useState<Customer[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [formData, setFormData] = useState({
    country_id: '' as string | number,
    customer_name: '',
    shipping_terms: '',
    agreement_status: 'Pending',
    agreement_validity: '',
  });

  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchCustomers(1);
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      const response = await productAPI.getCountries();
      let list: Country[] = [];
      if (Array.isArray(response.data)) {
        list = response.data.map((c: any) => typeof c === 'string' ? { id: 0, name: c } : c);
      } else if (typeof response.data === 'object' && response.data !== null && 'countries' in response.data && Array.isArray((response.data as { countries: any[] }).countries)) {
        list = (response.data as { countries: any[] }).countries.map((c: any, idx: number) => typeof c === 'string' ? { id: idx + 1, name: c } : c);
      }
      // Sort alphabetically by country name
      list.sort((a, b) => a.name.localeCompare(b.name));
      setCountries(list);
    } catch (error: any) {
      console.error('Error fetching countries:', error);
    }
  };

  const fetchCustomers = async (p: number = page) => {
    try {
      setLoading(true);
      const skip = (p - 1) * pageSize;
      const response = await customerAPI.getCustomers(undefined, undefined, undefined, undefined, skip, pageSize);
      setCustomers(response.data);
      setHasMore(response.data.length === pageSize);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCountryChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCountryId = e.target.value;
    setFormData({
      ...formData,
      country_id: selectedCountryId,
      customer_name: '',
    });
    setIsNewCustomer(false);
    setCountryCustomers([]);
    setErrorMessage('');

    if (selectedCountryId) {
      try {
        const response = await customerAPI.getCustomersByCountry(Number(selectedCountryId));
        setCountryCustomers(response.data);
      } catch (err) {
        console.error('Error fetching customers by country:', err);
      }
    }
  };

  const handleCustomerSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setErrorMessage('');
    if (val === 'addNew') {
      setIsNewCustomer(true);
      setFormData({
        ...formData,
        customer_name: '',
        shipping_terms: '',
        agreement_status: 'Pending',
        agreement_validity: '',
      });
    } else {
      setIsNewCustomer(false);
      const selected = countryCustomers.find((c) => c.customer_name === val);
      if (selected) {
        setFormData({
          ...formData,
          customer_name: selected.customer_name,
          shipping_terms: selected.payment_terms || '',
          agreement_status: selected.agreement_status || 'Pending',
          agreement_validity: selected.agreement_validity
            ? new Date(selected.agreement_validity).toISOString().split('T')[0]
            : '',
        });
      } else {
        setFormData({ ...formData, customer_name: val });
      }
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setShowEditModal(false);
    setEditingCustomer(null);
    setIsNewCustomer(false);
    setCountryCustomers([]);
    setErrorMessage('');
    setFormData({
      country_id: '',
      customer_name: '',
      shipping_terms: '',
      agreement_status: 'Pending',
      agreement_validity: '',
    });
  };

  const handleEditClick = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsNewCustomer(false);
    setErrorMessage('');
    const countryId = customer.country?.id || customer.country_id;
    
    setFormData({
      country_id: countryId || '',
      customer_name: customer.customer_name,
      shipping_terms: customer.payment_terms || '',
      agreement_status: customer.agreement_status,
      agreement_validity: customer.agreement_validity
        ? new Date(customer.agreement_validity).toISOString().split('T')[0]
        : '',
    });

    if (countryId) {
      customerAPI.getCustomersByCountry(Number(countryId)).then((res) => {
        setCountryCustomers(res.data);
      }).catch(console.error);
    }
    
    setShowEditModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Validation for all 5 required fields
    if (!formData.country_id) {
      setErrorMessage('Please select a Country.');
      return;
    }
    if (!formData.customer_name.trim()) {
      setErrorMessage('Please enter or select a Customer Name.');
      return;
    }
    if (!formData.shipping_terms.trim()) {
      setErrorMessage('Please enter Shipping Terms.');
      return;
    }
    if (!formData.agreement_status) {
      setErrorMessage('Please select an Agreement Status.');
      return;
    }
    if (!formData.agreement_validity) {
      setErrorMessage('Please select an Agreement Validity date.');
      return;
    }

    try {
      const payload = {
        country_id: Number(formData.country_id),
        customer_name: formData.customer_name.trim(),
        payment_terms: formData.shipping_terms.trim(),
        agreement_status: formData.agreement_status,
        agreement_validity: formData.agreement_validity || null,
      };

      if (editingCustomer) {
        await customerAPI.updateCustomer(editingCustomer.id, payload);
      } else {
        // Check duplicate customer in same country
        const isDuplicate = countryCustomers.some(
          (c) => c.customer_name.toLowerCase() === payload.customer_name.toLowerCase()
        );

        if (isDuplicate && !isNewCustomer) {
          // If existing selected customer, update
          const existingCust = countryCustomers.find(
            (c) => c.customer_name.toLowerCase() === payload.customer_name.toLowerCase()
          );
          if (existingCust) {
            await customerAPI.updateCustomer(existingCust.id, payload);
          } else {
            await customerAPI.createCustomer(payload);
          }
        } else if (isDuplicate && isNewCustomer) {
          setErrorMessage('A customer with this name already exists in the selected country.');
          return;
        } else {
          await customerAPI.createCustomer(payload);
        }
      }

      handleModalClose();
      fetchCustomers();
    } catch (error: any) {
      console.error('Error saving customer:', error);
      setErrorMessage(formatErrorMessage(error, 'Error saving customer. Please try again.'));
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

  const getCountryName = (customer: Customer) => {
    return customer.country?.name || countries.find((c) => c.id === customer.country_id)?.name || '-';
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
          <button
            className="submit-button"
            onClick={() => {
              setErrorMessage('');
              setShowModal(true);
            }}
            title="Add New Customer"
          >
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
                <th>Shipping Terms</th>
                <th>Agreement Status</th>
                <th>Agreement Validity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>{customer.customer_name}</td>
                  <td>{getCountryName(customer)}</td>
                  <td>{customer.payment_terms || '-'}</td>
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
                  <td>
                    <button className="edit-button" onClick={() => handleEditClick(customer)}>
                      Edit
                    </button>
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
                <span className="mobile-card-value">{getCountryName(customer)}</span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Shipping Terms</span>
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
              <div className="mobile-card-row">
                <button className="edit-button" onClick={() => handleEditClick(customer)}>
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>

        {customers.length === 0 && (
          <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            No customers found
          </p>
        )}

        {/* Pagination Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <button 
            className="nav-button" 
            disabled={page === 1 || loading} 
            onClick={() => { const newPage = page - 1; setPage(newPage); fetchCustomers(newPage); }}
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
            onClick={() => { const newPage = page + 1; setPage(newPage); fetchCustomers(newPage); }}
            style={{ opacity: (!hasMore || loading) ? 0.5 : 1, cursor: (!hasMore || loading) ? 'not-allowed' : 'pointer' }}
          >
            Next →
          </button>
        </div>
      </div>


      {/* Add / Edit Customer Modal */}
      {(showModal || showEditModal) && (
        <div className="modal-overlay" onClick={handleModalClose}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</h2>

            {errorMessage && (
              <div style={{ padding: '10px 14px', marginBottom: '14px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', borderRadius: '6px', fontSize: '0.9rem' }}>
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Field 1: Country * */}
              <div className="form-group">
                <label>Country *</label>
                <select
                  value={formData.country_id}
                  onChange={handleCountryChange}
                  required
                >
                  <option value="">Select Country</option>
                  {countries.map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 2: Customer Name * (Dropdown + text input if new) */}
              <div className="form-group">
                <label>Customer Name *</label>
                <select
                  value={isNewCustomer ? 'addNew' : formData.customer_name}
                  onChange={handleCustomerSelectChange}
                  disabled={!formData.country_id}
                  required={!isNewCustomer}
                >
                  <option value="">
                    {formData.country_id ? 'Select Customer' : 'Select Country First'}
                  </option>
                  {countryCustomers.map((customer) => (
                    <option key={customer.id} value={customer.customer_name}>
                      {customer.customer_name}
                    </option>
                  ))}
                  {formData.country_id && countryCustomers.length === 0 && (
                    <option disabled value="noCustomers">
                      No customers available for the selected country.
                    </option>
                  )}
                  <option value="addNew">+ Add New Customer</option>
                </select>

                {(isNewCustomer || (formData.country_id && countryCustomers.length === 0)) && (
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    required
                    placeholder="Enter new customer name"
                    style={{ marginTop: '8px' }}
                  />
                )}
              </div>

              {/* Field 3: Shipping Terms */}
              <div className="form-group">
                <label>Shipping Terms *</label>
                <input
                  type="text"
                  value={formData.shipping_terms}
                  onChange={(e) => setFormData({ ...formData, shipping_terms: e.target.value })}
                  placeholder="e.g., Net 30, Net 45"
                  required
                />
              </div>

              {/* Field 4: Agreement Status */}
              <div className="form-group">
                <label>Agreement Status *</label>
                <select
                  value={formData.agreement_status}
                  onChange={(e) => setFormData({ ...formData, agreement_status: e.target.value })}
                  required
                >
                  <option value="Pending">Pending</option>
                  <option value="Active">Active</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>

              {/* Field 5: Agreement Validity */}
              <div className="form-group">
                <label>Agreement Validity *</label>
                <input
                  type="date"
                  value={formData.agreement_validity}
                  onChange={(e) => setFormData({ ...formData, agreement_validity: e.target.value })}
                  required
                />
              </div>

              {/* Buttons: Add Customer / Cancel */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="submit-button">
                  {editingCustomer ? 'Save Changes' : 'Add Customer'}
                </button>
                <button type="button" className="nav-button" onClick={handleModalClose}>
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
