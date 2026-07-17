import React, { useState } from 'react';
import { customerAPI } from '../services/api';

const CreateCustomer: React.FC = () => {
  const [customerName, setCustomerName] = useState('');
  const [country, setCountry] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [agreementStatus, setAgreementStatus] = useState('Pending');
  const [agreementValidity, setAgreementValidity] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const newCustomer = {
        customer_name: customerName,
        country,
        payment_terms: paymentTerms || undefined,
        agreement_status: agreementStatus,
        agreement_validity: agreementValidity || undefined,
      };
      await customerAPI.createCustomer(newCustomer);
      setMessage('Customer created successfully!');
      // Clear form
      setCustomerName('');
      setCountry('');
      setPaymentTerms('');
      setAgreementStatus('Pending');
      setAgreementValidity('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create customer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Create New Customer</h1>
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        {message && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">{message}</div>}
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="customerName">
            Customer Name:
          </label>
          <input
            type="text"
            id="customerName"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="country">
            Country:
          </label>
          <input
            type="text"
            id="country"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="paymentTerms">
            Payment Terms:
          </label>
          <input
            type="text"
            id="paymentTerms"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="agreementStatus">
            Agreement Status:
          </label>
          <select
            id="agreementStatus"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={agreementStatus}
            onChange={(e) => setAgreementStatus(e.target.value)}
          >
            <option value="Pending">Pending</option>
            <option value="Active">Active</option>
            <option value="Expired">Expired</option>
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="agreementValidity">
            Agreement Validity (YYYY-MM-DD):
          </label>
          <input
            type="date"
            id="agreementValidity"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={agreementValidity}
            onChange={(e) => setAgreementValidity(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Customer'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCustomer;
