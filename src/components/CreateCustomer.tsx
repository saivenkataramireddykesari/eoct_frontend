import React, { useState, useEffect } from 'react';
import { customerAPI, formatErrorMessage } from '../services/api';
import { Customer } from '../shared-types';

const CreateCustomer: React.FC = () => {
  const [customerName, setCustomerName] = useState('');
  const [country, setCountry] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [agreementStatus, setAgreementStatus] = useState('Pending');
  const [agreementValidity, setAgreementValidity] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await customerAPI.getCustomers(undefined, undefined, undefined, undefined, 0, 1000);
        setAllCustomers(res.data);
        // Initialize filtered customers if a country is already selected
        if (country) {
          setFilteredCustomers(res.data.filter((c: Customer) => c.country?.name === country));
        }
      } catch (err) {
        console.error("Error fetching customers:", err);
      }
    };
    fetchCustomers();
  }, [country]); // Re-run when country changes to filter existing customers

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setCountry(val);
    setCustomerSearchTerm(''); // Reset search term when country changes
    setSelectedCustomer(null);
    setSelectedCustomerId(null);
    setIsAddingNew(false);

    if (val) {
      setFilteredCustomers(allCustomers.filter(c => c.country?.name === val));
    } else {
      setFilteredCustomers([]);
    }
  };

  const handleCustomerSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomerSearchTerm(val);
    setSelectedCustomer(null);
    setSelectedCustomerId(null);
    setIsAddingNew(false);

    if (country) {
      const lowerCaseVal = val.toLowerCase();
      setFilteredCustomers(allCustomers.filter(
        c => c.country?.name === country && c.customer_name.toLowerCase().includes(lowerCaseVal)
      ));
    } else {
      setFilteredCustomers([]);
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSelectedCustomerId(customer.id);
    setCustomerSearchTerm(customer.customer_name);
    setCustomerName(customer.customer_name); // Set customerName for form submission
    setIsAddingNew(false);
    setPaymentTerms(customer.payment_terms || '');
    setAgreementStatus(customer.agreement_status || 'Pending');
    setAgreementValidity(customer.agreement_validity ? customer.agreement_validity.split('T')[0] : '');
  };

  const handleAddNewCustomer = () => {
    setIsAddingNew(true);
    setCustomerName(customerSearchTerm);
    setSelectedCustomer(null);
    setSelectedCustomerId(null);
    setPaymentTerms('');
    setAgreementStatus('Pending');
    setAgreementValidity('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    const customerData = {
      customer_name: isAddingNew ? customerName : (selectedCustomer?.customer_name || customerSearchTerm),
      country: country,
      payment_terms: paymentTerms,
      agreement_status: agreementStatus,
      agreement_validity: agreementValidity || undefined,
    };

    try {
      if (selectedCustomer && selectedCustomerId && !isAddingNew) {
        await customerAPI.updateCustomer(selectedCustomerId, customerData);
        setMessage('Customer updated successfully!');
        const updatedAll = allCustomers.map(c => c.id === selectedCustomerId ? { ...c, ...customerData } : c);
        setAllCustomers(updatedAll);
        setFilteredCustomers(updatedAll.filter(c => c.country?.name === country));
      } else {
        const res = await customerAPI.createCustomer(customerData);
        setMessage('Customer created successfully!');
        setAllCustomers([...allCustomers, res.data]);
        setFilteredCustomers([...filteredCustomers, res.data]);
      }

      // Clear form
      setCustomerName('');
      setCustomerSearchTerm('');
      setSelectedCustomer(null);
      setSelectedCustomerId(null);
      setIsAddingNew(false);
      setPaymentTerms('');
      setAgreementStatus('Pending');
      setAgreementValidity('');

    } catch (err: any) {
      setError(formatErrorMessage(err, 'Failed to process customer.'));
    } finally {
      setLoading(false);
    }
  };

  const countries = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Côte d'Ivoire", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Holy See", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
  ];


  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Create New Customer</h1>
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        {message && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">{message}</div>}
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="country">
            Country:
          </label>
          <select
            id="country"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={country}
            onChange={handleCountryChange}
            required
          >
            <option value="">Select Country</option>
            {countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="customerSearch">
            Customer Name:
          </label>
          <input
            type="text"
            id="customerSearch"
            placeholder="Search or enter customer name"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={customerSearchTerm}
            onChange={handleCustomerSearchChange}
            disabled={!country}
          />

          {country && customerSearchTerm && filteredCustomers.length > 0 && !selectedCustomer && (
            <ul className="border border-gray-300 rounded mt-2 max-h-48 overflow-y-auto bg-white">
              {filteredCustomers.map((c: Customer) => (
                <li
                  key={c.id}
                  className="px-3 py-2 cursor-pointer hover:bg-gray-200"
                  onClick={() => handleCustomerSelect(c)}
                >
                  {c.customer_name}
                </li>
              ))}
            </ul>
          )}

          {country && customerSearchTerm && filteredCustomers.length === 0 && !isAddingNew && (
            <button
              type="button"
              onClick={handleAddNewCustomer}
              className="mt-2 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Add "{customerSearchTerm}" as New Customer
            </button>
          )}

          {(isAddingNew || (!country && customerSearchTerm)) && (
            <input
              type="text"
              id="customerName"
              placeholder="Enter new customer name"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mt-2"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
            />
          )}
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
            {loading ? 'Processing...' : (isAddingNew || !selectedCustomerId ? 'Create Customer' : 'Update Customer')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCustomer;
