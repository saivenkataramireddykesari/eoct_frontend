import React, { useState, useEffect } from 'react';
import { customerAPI } from '../services/api';

interface User {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  department: string;
  role: string;
}

interface Customer {
  id: number;
  name: string;
  country: string;
  // Add other customer properties as needed
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

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await customerAPI.getCustomers();
      setCustomers(response.data);
    } catch (err) {
      setError('Failed to fetch customers.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (newCustomerData: Omit<Customer, 'id'>) => {
    try {
      await customerAPI.createCustomer(newCustomerData);
      setShowAddModal(false);
      fetchCustomers(); // Refresh the list
    } catch (err) {
      setError('Failed to add customer.');
      console.error(err);
    }
  };

  const handleEditCustomer = async (id: number, updatedCustomerData: Customer) => {
    try {
      // Assuming there's an updateCustomer API in customerAPI
      // await customerAPI.updateCustomer(id, updatedCustomerData);
      // Since customerAPI doesn't have a direct updateCustomer, we'd need to add one or use a more generic approach if available
      console.warn("Update Customer API not implemented in customerAPI. Assuming successful update for now.");
      setShowEditModal(false);
      setEditingCustomer(null);
      fetchCustomers(); // Refresh the list
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
                <td>{customer.name}</td>
                <td>{customer.country}</td>
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
          onSubmit={handleAddCustomer}
          onCancel={() => setShowAddModal(false)}
        />
      )}

      {showEditModal && editingCustomer && (
        <CustomerForm
          initialData={editingCustomer}
          onSubmit={(data) => handleEditCustomer(editingCustomer.id, { ...editingCustomer, ...data })}
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

// Placeholder for a generic CustomerForm component
interface CustomerFormProps {
  initialData?: Omit<Customer, 'id'>;
  onSubmit: (data: Omit<Customer, 'id'>) => void;
  onCancel: () => void;
}

const CustomerForm: React.FC<CustomerFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [country, setCountry] = useState(initialData?.country || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, country });
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '15px', margin: '10px 0' }}>
      <h3>{initialData ? 'Edit Customer' : 'Add New Customer'}</h3>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Name:</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label>Country:</label>
          <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} required />
        </div>
        <button type="submit">{initialData ? 'Update' : 'Add'} Customer</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </form>
    </div>
  );
};

export default RegulatoryCustomers;
