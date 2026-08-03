import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderAPI, customerAPI, productAPI, formatErrorMessage } from '../services/api';
import { Customer } from '../shared-types';
import Header from './Header';
import ProductItem from './ProductItem';

const CURRENCIES = ['USD', 'EUR', 'INR', 'RUB','GBP','AED'];


interface CreateOrderProps {
  user: any;
  onLogout: () => void;
}

/* ── Generate PO Number: first3(country) + first3(customer) + MMYY from selected PO date + serial ── */
const generatePoNumber = (country: string, customerName: string, poDateStr: string, orderCount: number = 0): string => {
  const c  = country.replace(/\s+/g, '').substring(0, 3).toUpperCase().padEnd(3, 'X');
  const k  = customerName.replace(/\s+/g, '').substring(0, 3).toUpperCase().padEnd(3, 'X');
  // Use selected PO date if available, otherwise today
  const d  = poDateStr ? new Date(poDateStr) : new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  const serial = orderCount + 1;
  return `${c}-${k}-${mm}/${yy}-${serial}`;
};


const CreateOrder: React.FC<CreateOrderProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.department !== 'Exports' || !['user', 'Team', 'Manager'].includes(user.role)) {
      navigate('/dashboard');
      alert('You are not authorized to create orders.');
    }
  }, [user, navigate]);

  const [allCustomers, setAllCustomers]           = useState<any[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [countries, setCountries]                 = useState<string[]>([]);

  const [selectedCustomerOrderCount, setSelectedCustomerOrderCount] = useState(0);
  const [loading, setLoading]                     = useState(false);
  const [error, setError]                         = useState('');
  const [success, setSuccess]                     = useState('');


  /* ── Order state ── */
  const [country, setCountry]       = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [poNumber, setPoNumber]     = useState('');
  const [poDate, setPoDate]         = useState('');
  const [requestedDate, setRequestedDate] = useState('');
  const [shippingTerms, setShippingTerms] = useState('');
  const [orderType, setOrderType]   = useState('PNS');   // PNS or PP
  const [orderCategory, setOrderCategory] = useState(''); // Drug, Nutra, Excipient
  const [newCustomerName, setNewCustomerName]     = useState('');
  const [isAddingNewCustomer, setIsAddingNewCustomer] = useState(false);
  const [salesQty, setSalesQty]     = useState('');
  const [freeQty, setFreeQty]       = useState('');
  const [importLicRequired, setImportLicRequired] = useState('Yes');
  const [importLicValidity, setImportLicValidity] = useState('');
  const [remarks, setRemarks]       = useState('');

  /* ── Product filtering states ── */
  const [selectedProductSku, setSelectedProductSku] = useState<string>('');
  const [selectedProductName, setSelectedProductName] = useState<string>('');


  /* ── Products State (multiple) ── */
  interface OrderProduct {
    id: string;
    skuCode: string;
    productName: string;
    category: string;
    packSize: string;
    batchSize: string;
    moq: string;
    artworkStatus: string;
    pmCode: string;
    salesQty: string;
    freeQty: string;
    price: string;
    currency: string;
    totalPrice: number; // Calculated field
  }

  const generateEmptyProduct = (defaultArtworkStatus: string = 'Not Available'): OrderProduct => ({
    id: Date.now().toString(), // Unique ID for keying
    skuCode: '',
    productName: '',
    category: '',
    packSize: '',
    batchSize: '',
    moq: '',
    artworkStatus: defaultArtworkStatus,
    pmCode: '',
    salesQty: '',
    freeQty: '',
    price: '',
    currency: CURRENCIES[0], // Default to first currency
    totalPrice: 0,
  });

  const [products, setProducts] = useState<OrderProduct[]>([generateEmptyProduct('Not Available')]);


  /* ── Product state ── */


  const handleAddProduct = () => {
    setProducts([...products, generateEmptyProduct(products[0]?.artworkStatus || 'Not Available')]);
  };

  const handleRemoveProduct = (id: string) => {
    setProducts(products.filter(product => product.id !== id));
  };

  const handleUpdateProduct = (id: string, field: string, value: any) => {
    // Functional form ensures we always operate on the latest state
    setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));

    // If the updated product is the first one, update the selected SKU/Product Name states
    // This assumes the first product in the array is the one whose selection should influence customer filtering
    if (products[0]?.id === id) {
      if (field === 'skuCode') setSelectedProductSku(value);
      if (field === 'productName') setSelectedProductName(value);
    }
  };

  // Bulk-update multiple fields at once in a single setState call
  const handleUpdateManyProducts = (id: string, fields: Record<string, any>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...fields } : p));
    if (products[0]?.id === id) {
      if (fields.skuCode) setSelectedProductSku(fields.skuCode);
      if (fields.productName) setSelectedProductName(fields.productName);
    }
  };

  /* Function to fetch filtered customers */
  const fetchFilteredCustomers = async (currentCountry: string) => {
    try {
      const response = await customerAPI.getCustomers(currentCountry);
      setFilteredCustomers(response.data);
    } catch (err: any) { // Corrected catch syntax
      console.error("Error fetching filtered customers:", err);
      setError("Failed to load customers.");
    }
  };

  /* Load all customers and countries on initial render */
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [custRes, countryRes] = await Promise.all([
          customerAPI.getCustomers(undefined, undefined, undefined, undefined, 0, 1000),
          productAPI.getCountries()
        ]);
        const customers = custRes.data;
        setAllCustomers(customers);
        if (countryRes.data && Array.isArray(countryRes.data)) {
          const cNames = countryRes.data.map((c: any) => typeof c === 'string' ? c : c.name).sort();
          setCountries(cNames);
        } else {
          const uniqueCountries: string[] = Array.from(
            new Set(customers.map((c: any) => c.country?.name || c.country as string))
          ).filter(Boolean).sort() as string[];
          setCountries(uniqueCountries);
        }
      } catch (err: any) { // Corrected catch syntax
        console.error("Error fetching initial data:", err);
        setError("Failed to load initial data (customers/countries).");
      }
    };
    loadInitialData();
  }, []);

  /* Effect to re-fetch filtered customers when relevant filters change */
  useEffect(() => {
    if (country) {
      const customersForCountry = allCustomers.filter(c => (c.country?.name || c.country) === country);
      setFilteredCustomers(customersForCountry);
    } else {
      setFilteredCustomers([]);
    }
  }, [country, allCustomers]);


  /* Update customer list + clear selections when country changes */
  const handleCountryChange = (val: string) => {
    setCountry(val);
    setCustomerId('');
    setCustomerName('');
    setPoNumber('');
    setIsAddingNewCustomer(false); // Reset adding new customer state
    setNewCustomerName('');       // Clear new customer name input
    if (val) {
      const customersForCountry = allCustomers.filter(c => (c.country?.name || c.country) === val);
      setFilteredCustomers(customersForCountry);
    } else {
      setFilteredCustomers([]);
    }
  };

  /* Update customer list + clear selections when order category changes */
  const handleOrderCategoryChange = (val: string) => {
    setOrderCategory(val);
  };

  /* auto-generate PO number when customer is picked */
  const handleCustomerChange = (id: string) => {
    if (id === "addNewCustomer") {
      setIsAddingNewCustomer(true);
      console.log("isAddingNewCustomer set to true");
      setCustomerId(""); // Clear selected customer ID
      setCustomerName(""); // Clear selected customer name
      setPoNumber("");    // Clear PO number
      setSelectedCustomerOrderCount(0); // Reset order count
      setNewCustomerName(""); // Clear new customer name input
    } else {
      setIsAddingNewCustomer(false);
      setCustomerId(id);
      const cust = filteredCustomers.find((c: any) => String(c.id) === id);
      if (cust) {
        setCustomerName(cust.customer_name);
        if (poDate) {
          customerAPI.getCustomer(parseInt(id)).then(customerDetails => {
            const orderCount = customerDetails.data.order_count || 0;
            setSelectedCustomerOrderCount(orderCount);
            setPoNumber(generatePoNumber(country, cust.customer_name, poDate, orderCount));
          }).catch(err => {
            console.error('Error fetching customer details for order count:', err);
            setError('Failed to load customer order count.');
          });
        } else {
          setPoNumber('');
        }
      } else {
        setCustomerName('');
        setPoNumber('');
        setSelectedCustomerOrderCount(0);
      }
    }
  };

  /* Regenerate PO number when PO date changes (if customer already selected) */
  const handlePoDateChange = (val: string) => {
    setPoDate(val);
    if (val && customerId && customerName) {
      setPoNumber(generatePoNumber(country, customerName, val, selectedCustomerOrderCount));
    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("handleSubmit called.");
    console.log("isAddingNewCustomer:", isAddingNewCustomer);
    console.log("newCustomerName:", newCustomerName);

    // Input validation
    if (!country) { setError('Please select a country.'); return; }
    if (isAddingNewCustomer && !newCustomerName.trim()) { setError('Please enter a new customer name.'); return; }
    if (!customerId && !isAddingNewCustomer) { setError('Please select an existing customer or add a new one.'); return; }

    // Validate each product
    for (const product of products) {
      if (!product.skuCode.trim()) { setError('SKU Code is required for all products'); return; }
      const productTotalQty = (parseInt(product.salesQty) || 0) + (parseInt(product.freeQty) || 0);
      if (productTotalQty <= 0) { setError(`Total quantity must be greater than 0 for product ${product.skuCode}`); return; }
    }

    // Calculate total quantity across all products for a general check, if needed
    const overallTotalQty = products.reduce((sum, product) => sum + ((parseInt(product.salesQty) || 0) + (parseInt(product.freeQty) || 0)), 0);
    if (overallTotalQty <= 0) { setError('At least one product must have a total quantity greater than 0'); return; }

    setLoading(true); setError(''); setSuccess('');
    let currentCustomerId = customerId;
    let currentCustomerName = customerName;

    try {
      if (isAddingNewCustomer) {
        console.log("Attempting to add new customer...");
        // 1. Check for duplicate customer name in the selected country
        const duplicateCustomer = allCustomers.find(
          (c: any) => c.country?.name === country && c.customer_name.toLowerCase() === newCustomerName.trim().toLowerCase()
        );

        if (duplicateCustomer) {
          setError(`Customer '${newCustomerName}' already exists in ${country || ""}.`);
          setLoading(false);
          return;
        }

        // 2. Create new customer
        const newCustData = { customer_name: newCustomerName.trim(), country: country };
        console.log("Calling customerAPI.createCustomer with:", newCustData);
        const res = await customerAPI.createCustomer(newCustData);
        const createdCustomer = res.data;
        console.log("New customer created:", createdCustomer);

        // Update states to reflect new customer
        setAllCustomers(prev => [...prev, createdCustomer]);
        setFilteredCustomers(prev => [...prev, createdCustomer]);
        setCustomerId(String(createdCustomer.id));
        setCustomerName(createdCustomer.customer_name);
        currentCustomerId = String(createdCustomer.id);
        currentCustomerName = createdCustomer.customer_name;

        setIsAddingNewCustomer(false);
        setNewCustomerName("");

        setSuccess(`New customer '${createdCustomer.customer_name}' added successfully.`);
      }

      /* 2. Create order */
      const createdOrderNumbers: string[] = [];



      for (const product of products) {
        const productTotalQty = (parseInt(product.salesQty) || 0) + (parseInt(product.freeQty) || 0);

        console.log(`Creating order for product ID: ${product.id}, SKU Code: ${product.skuCode}, Sales Quantity: ${product.salesQty}, Free Quantity: ${product.freeQty}`);
        console.log("Full product data being sent:", product);

        const res = await orderAPI.createOrder({
          country,
          customer_id: parseInt(currentCustomerId),
          sku: product.skuCode,
          order_type: orderType,
          category: orderCategory || null,
          po_number: poNumber,
          po_date: poDate || null,
          requested_delivery_date: requestedDate || null,
          shipping_terms: shippingTerms || null,
          sales_quantity: parseInt(product.salesQty) || 0,
          free_quantity: parseInt(product.freeQty) || 0,
          quantity: productTotalQty,
          price: parseFloat(product.price) || 0,
          currency: product.currency,
          total_price: product.totalPrice,
          import_license_required: importLicRequired === 'Yes',
          import_license_validity: importLicValidity || null,
          remarks: remarks || null,
        });
        createdOrderNumbers.push(res.data.order_number);
      }
      setSuccess(`✅ Orders created successfully! Order No(s): ${createdOrderNumbers.join(', ')}`);
      setTimeout(() => navigate('/orders'), 2500);
    } catch (err: any) {
      setError(formatErrorMessage(err, 'Error creating order'));
    } finally { setLoading(false); }
  };

  /* ── styles ── */
  const card: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '28px',
    marginBottom: '20px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  };
  const cardBlue: React.CSSProperties = { ...card, background: '#f0f4ff', border: '1.5px solid #c5cae9' };
  const cardTitle: React.CSSProperties = {
    fontWeight: 700, fontSize: '0.95rem', color: '#1a237e',
    marginBottom: '18px', paddingBottom: '10px',
    borderBottom: '2px solid #e8eaf6',
    display: 'flex', alignItems: 'center', gap: '8px',
  };
  const cardTitleBlue: React.CSSProperties = { ...cardTitle, color: '#3f51b5', borderBottomColor: '#c5cae9' };
  const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' };
  const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' };
  const fld: React.CSSProperties  = { display: 'flex', flexDirection: 'column', gap: '5px' };
  const lbl: React.CSSProperties  = { fontSize: '0.78rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' };
  const inp: React.CSSProperties  = { padding: '10px 13px', border: '1px solid #cbd5e1', borderRadius: '7px', fontSize: '0.93rem', width: '100%', boxSizing: 'border-box', background: '#fff' };
  const inpDis: React.CSSProperties = { ...inp, background: '#f1f5f9', color: '#94a3b8', cursor: 'default' };
  const inpAuto: React.CSSProperties = { ...inp, background: '#e8f5e9', color: '#1b5e20', fontWeight: 600 };
  const inpTotal: React.CSSProperties = { ...inp, background: '#fff3e0', color: '#e65100', fontWeight: 700, fontSize: '1rem' };

  return (
    <div className="dashboard-container">
      <Header user={user} onLogout={onLogout} />

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '24px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#1a237e', fontSize: '1.4rem' }}>Create New Order</h2>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
              Fill in all the details below — product, order info, and quantities.
            </p>
          </div>
          <button className="nav-button" onClick={() => navigate('/orders')}>← Back</button>
        </div>

        {error   && <div className="error-message"   style={{ marginBottom: '16px' }}>{error}</div>}
        {success && <div className="success-message" style={{ marginBottom: '16px' }}>{success}</div>}

        <form onSubmit={handleSubmit}>

          {/* ── 1. Destination ── */}
          <div style={card}>
            <div style={cardTitle}>🌍 Customer Details</div>
            <div style={grid2}>
              <div style={fld}>
                <label style={lbl}>Country *</label>
                <select value={country} onChange={e => handleCountryChange(e.target.value)} required style={inp}>
                  <option value="">— Select Country —</option>
                  {countries.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={fld}>
                <label style={lbl}>Customer Name *</label>
                <select
                  value={isAddingNewCustomer ? "addNewCustomer" : customerId}
                  onChange={e => handleCustomerChange(e.target.value)}
                  required
                  disabled={!country}
                  style={country ? inp : inpDis}
                >
                  <option value="">{country ? '— Select Customer —' : 'Select Country first'}</option>
                  {filteredCustomers.map(c => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
                  {!(user.department === 'Exports' && user.role === 'Team') && (
                    <option value="addNewCustomer">— Add New Customer —</option>
                  )}
                </select>
                {isAddingNewCustomer && (
                  <input
                    type="text"
                    value={newCustomerName}
                    onChange={e => setNewCustomerName(e.target.value)}
                    placeholder="Enter new customer name"
                    style={{ ...inp, marginTop: '8px' }}
                    required
                  />
                )}
              </div>
              <div style={fld}>
                <label style={lbl}>PO Date *</label>
                <input
                  type="date"
                  value={poDate}
                  onChange={e => handlePoDateChange(e.target.value)}
                  required
                  disabled={!customerId}
                  style={customerId ? inp : inpDis}
                />
              </div>
              <div style={fld}>
                <label style={lbl}>PO Number (auto-generated)</label>
                <input
                  type="text"
                  value={poNumber}
                  readOnly
                  style={poNumber ? inpAuto : inpDis}
                  placeholder={!customerId ? 'Select customer first' : !poDate ? 'Select PO Date to generate' : ''}
                />
              </div>
              <div style={fld}>
                <label style={lbl}>Order Requested Date *</label>
                <input type="date" value={requestedDate} onChange={e => setRequestedDate(e.target.value)} required style={inp} />
              </div>
              <div style={fld}>
                <label style={lbl}>Shipping Terms</label>
                <input type="text" value={shippingTerms} onChange={e => setShippingTerms(e.target.value)}
                  style={inp} placeholder="e.g. FOB Mumbai" />
              </div>
            </div>
            {/* Order Type & Category (Commented out per request) */}
            {/*
            <div style={{ ...grid2, marginTop: '16px' }}>
              <div style={fld}>
                <label style={lbl}>Order Type *</label>
                <select value={orderType} onChange={e => setOrderType(e.target.value)} style={inp}>
                  <option value="PNS">PNS</option>
                  <option value="PP">PP</option>
                </select>
              </div>
              <div style={fld}>
                <label style={lbl}>Category *</label>
                <select value={orderCategory} onChange={e => handleOrderCategoryChange(e.target.value)} required style={inp}>
                  <option value="">— Select Category —</option>
                  <option value="Drug">Drug</option>
                  <option value="Nutra">Nutra</option>
                  <option value="Excipient">Excipient</option>
                </select>
              </div>
            </div>
            */}
          </div>

          {/* ── All Other Details ── */}
          <div style={cardBlue}>
            <div style={cardTitleBlue}>📦 Order Details (Products, Quantity, Import License, Remarks)</div>

            {products.map((product, index) => (
            <ProductItem
                key={product.id}
                product={product}
                onUpdate={handleUpdateProduct}
                onUpdateMany={handleUpdateManyProducts}
                onRemove={handleRemoveProduct}
                errors={{}}
                currencies={CURRENCIES}
                selectedCountry={country}
                selectedCustomerId={customerId}
              />
            ))}

            <button
              type="button"
              onClick={handleAddProduct}
              style={{
                background: '#4CAF50',
                color: 'white',
                padding: '10px 15px',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                marginTop: '20px',
                fontSize: '1rem',
              }}
            >
              Add More Product
            </button>

            {/* ── 4. Import License (Global) ── */}
            <div style={{...card, marginTop: '20px'}}>
              <div style={cardTitle}>📄 Import License</div>
              <div style={grid2}>
                <div style={fld}>
                  <label style={lbl}>Import License Required *</label>
                  <select value={importLicRequired} onChange={e => setImportLicRequired(e.target.value)} style={inp}>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                {importLicRequired === 'Yes' && (
                  <div style={fld}>
                    <label style={lbl}>License Validity *</label>
                    <input type="date" value={importLicValidity}
                      onChange={e => setImportLicValidity(e.target.value)} required style={inp} />
                  </div>
                )}
              </div>
            </div>

            {/* ── 5. Remarks (Global) ── */}
            <div style={{...card, marginTop: '20px'}}>
              <div style={cardTitle}>💬 Remarks</div>
              <textarea value={remarks} onChange={e => setRemarks(e.target.value)}
                rows={3} style={{ ...inp, resize: 'vertical' }} placeholder="Any additional notes..." />
            </div>
          </div>

          {/* ── Submit ── */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingBottom: '40px' }}>
            <button type="button" className="nav-button" onClick={() => navigate('/orders')}>Cancel</button>
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? 'Creating…' : '✅ Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOrder;
