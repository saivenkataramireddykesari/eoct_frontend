import React, { useState, useEffect } from 'react';
import { customerAPI, productAPI } from '../services/api';
import { Customer, Country } from '../shared-types';

interface User {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  department: string;
  role: string;
}

interface RegulatoryCustomersProps {
  user: User;
  onLogout: () => void;
}

const RegulatoryCustomers: React.FC<RegulatoryCustomersProps> = ({ user, onLogout }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [countries, setCountries] = useState<Country[]>([]);


  useEffect(() => {
    fetchCustomers();
    fetchCountries();
  }, []);

  useEffect(() => {
    fetchCustomers(selectedCountry);
  }, [selectedCountry]);

  const fetchCustomers = async (countryFilter?: string) => {
    try {
      const response = await customerAPI.getCustomers(countryFilter);
      setCustomers(response.data);
    } catch (err) {
      setError('Failed to fetch customers.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCountries = async () => {
    try {
      const response = await productAPI.getCountries();
      if (response.data) {
        setCountries(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch countries:', err);
    }
  };

  const handleAddCustomer = async (newCustomerData: { customer_name: string; country: Country; }) => {
    try {
      const customerToCreate = {
        customer_name: newCustomerData.customer_name,
        country: newCustomerData.country.name, // API expects country name as string for creation
        country_id: newCustomerData.country.id,
        payment_terms: null,
        agreement_status: "Pending",
        agreement_validity: null,
      };
      await customerAPI.createCustomer(customerToCreate);
      setShowAddModal(false);
      fetchCustomers(); // Refresh the list
    } catch (err) {
      setError('Failed to add customer.');
      console.error(err);
    }
  };

  const handleEditCustomer = async (id: number, updatedFields: { customer_name: string; country: Country; }) => {
    try {
      // In a real scenario, you would make an API call like:
      // await customerAPI.updateCustomer(id, updatedFields);
      // console.log("Customer updated via API:\n", updatedFields);

      setCustomers(prevCustomers =>
        prevCustomers.map(cust =>
          cust.id === id ? { ...cust, ...updatedFields, country_id: updatedFields.country.id } : cust
        )
      );

      setShowEditModal(false);
      setEditingCustomer(null);
      // fetchCustomers(); // Refresh the list - uncomment if actual API call is made
    } catch (err) {
      setError('Failed to update customer.');
      console.error(err);
    }
  };

  if (loading) {
    return <div>Loading customers...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div>
      <h2>Regulatory Department Customer Section</h2>
      <p>Welcome, {user.name} ({user.department} - {user.role})</p>

      <button onClick={() => setShowAddModal(true)}>Add New Customer</button>

      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="country-filter">Filter by Country:</label>
        <select
          id="country-filter"
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
          style={{ marginLeft: '10px', padding: '5px' }}
        >
          <option value="">All Countries</option>
          {countries.map((country) => (
            <option key={country.id} value={country.name}>
              {country.name}
            </option>
          ))}
        </select>
      </div>

      <h3>Customer List</h3>
      {customers.length === 0 ? (
        <p>No customers found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Country</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id}>
                <td>{customer.id}</td>
                <td>{customer.customer_name}</td>
                <td>{customer.country?.name || "-"}</td>
                <td>
                  <button onClick={() => {
                    setEditingCustomer(customer);
                    setShowEditModal(true);
                  }}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showAddModal && (
        <CustomerForm
          allCountries={countries}
          onSubmit={handleAddCustomer}
          onCancel={() => setShowAddModal(false)}
        />
      )}

      {showEditModal && editingCustomer && (
        <CustomerForm
          initialData={editingCustomer}
          allCountries={countries}
          onSubmit={(data) => handleEditCustomer(editingCustomer.id, data)}
          onCancel={() => {
            setShowEditModal(false);
            setEditingCustomer(null);
          }}
        />
      )}

      <button onClick={onLogout}>Logout</button>
    </div>
  );
};

interface CustomerFormProps {
  initialData?: Customer;
  allCountries: Country[];
  onSubmit: (data: { customer_name: string; country: Country; }) => void;
  onCancel: () => void;
}

const CustomerForm: React.FC<CustomerFormProps> = ({ initialData, allCountries, onSubmit, onCancel }) => {
  const [customerName, setCustomerName] = useState(initialData?.customer_name || '');
  const [selectedCountryName, setSelectedCountryName] = useState(initialData?.country?.name || '');

  useEffect(() => {
    setCustomerName(initialData?.customer_name || '');
    setSelectedCountryName(initialData?.country?.name || '');
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const countryObject = allCountries.find(c => c.name === selectedCountryName);
    if (!countryObject) {
      alert('Please select a valid country.');
      return;
    }
    onSubmit({ customer_name: customerName, country: countryObject });
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '15px', margin: '10px 0' }}>
      <h3>{initialData ? 'Edit Customer' : 'Add New Customer'}</h3>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Customer Name:</label>
          <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
        </div>
        <div>
          <label>Country:</label>
          <select value={selectedCountryName} onChange={(e) => setSelectedCountryName(e.target.value)} required>
            <option value="">-- Select Country --</option>
            {allCountries.map((country) => (
              <option key={country.id} value={country.name}>{country.name}</option>
            ))}
          </select>
        </div>
        <button type="submit">{initialData ? 'Update' : 'Add'} Customer</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </form>
    </div>
  );
};

export default RegulatoryCustomers;
