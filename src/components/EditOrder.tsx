import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { orderAPI, customerAPI, productAPI } from '../services/api';
import Header from './Header';

interface EditOrderProps {
  user: any;
  onLogout: () => void;
}

const EditOrder: React.FC<EditOrderProps> = ({ user, onLogout }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.department !== 'Exports' || user.role !== 'user') {
      navigate('/dashboard'); // Or any other appropriate route
      alert('You are not authorized to edit orders.');
    }
  }, [user, navigate]);

  const [allCustomers, setAllCustomers]           = useState<any[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct]     = useState<any>(null);
  const [countries, setCountries]                 = useState<string[]>([]);
  const [loading, setLoading]                     = useState(false);
  const [loadingDetails, setLoadingDetails]       = useState(true);
  const [error, setError]                         = useState('');
  const [success, setSuccess]                     = useState('');

  const [formData, setFormData] = useState({
    country: '',
    customer_id: '',
    sku: '',
    order_number: '',
    po_number: '',
    po_date: '',
    requested_delivery_date: '',
    shipping_terms: '',
    sales_quantity: '',
    free_quantity: '',
    import_license_required: 'Yes',
    import_license_validity: '',
    remarks: '',
  });

  const totalQuantity =
    (parseInt(formData.sales_quantity) || 0) + (parseInt(formData.free_quantity) || 0);

  const fmt = (d: string | null) => {
    if (!d) return '';
    try { return new Date(d).toISOString().split('T')[0]; } catch { return ''; }
  };

  useEffect(() => { fetchAll(); }, [id]);

  const fetchAll = async () => {
    try {
      setLoadingDetails(true);
      const [custRes, orderRes] = await Promise.all([
        customerAPI.getCustomers(),
        orderAPI.getOrder(parseInt(id!)),
      ]);

      const customers = custRes.data;
      setAllCustomers(customers);
      const uniqueCountries: string[] = Array.from(
        new Set(customers.map((c: any) => c.country as string))
      ).sort() as string[];
      setCountries(uniqueCountries);

      const order = orderRes.data;
      const country = order.country || '';
      setFilteredCustomers(customers.filter((c: any) => c.country === country));

      let products: any[] = [];
      if (country) {
        try {
          const p = await productAPI.getProductsByCountry(country);
          products = p.data;
          setAvailableProducts(products);
        } catch { /* noop */ }
      }

      const prod = products.find((p: any) => p.sku_code === order.sku);
      setSelectedProduct(prod || null);

      setFormData({
        country,
        customer_id: order.customer_id?.toString() || '',
        sku: order.sku || '',
        order_number: order.order_number || '',
        po_number: order.po_number || '',
        po_date: fmt(order.po_date),
        requested_delivery_date: fmt(order.requested_delivery_date),
        shipping_terms: order.shipping_terms || '',
        sales_quantity: (order.sales_quantity ?? order.quantity ?? 0).toString(),
        free_quantity: (order.free_quantity ?? 0).toString(),
        import_license_required: order.import_license_required ? 'Yes' : 'No',
        import_license_validity: fmt(order.import_license_validity),
        remarks: order.remarks || '',
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error loading order');
    } finally { setLoadingDetails(false); }
  };

  const handleCountryChange = async (country: string) => {
    setFormData(prev => ({ ...prev, country, customer_id: '', sku: '', sales_quantity: '', free_quantity: '' }));
    setSelectedProduct(null); setAvailableProducts([]);
    if (!country) { setFilteredCustomers([]); return; }
    setFilteredCustomers(allCustomers.filter((c: any) => c.country === country));
    try {
      const res = await productAPI.getProductsByCountry(country);
      setAvailableProducts(res.data);
    } catch { /* noop */ }
  };

  const handleSkuChange = (skuCode: string) => {
    const product = availableProducts.find((p: any) => p.sku_code === skuCode);
    setSelectedProduct(product || null);
    setFormData(prev => ({ ...prev, sku: skuCode }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'country') handleCountryChange(value);
    else if (name === 'sku') handleSkuChange(value);
    else setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalQuantity <= 0) { setError('Total quantity must be > 0'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      const data = {
        ...formData,
        customer_id: parseInt(formData.customer_id),
        sales_quantity: parseInt(formData.sales_quantity) || 0,
        free_quantity: parseInt(formData.free_quantity) || 0,
        quantity: totalQuantity,
        import_license_required: formData.import_license_required === 'Yes',
        po_date: formData.po_date || null,
        requested_delivery_date: formData.requested_delivery_date || null,
        import_license_validity: formData.import_license_validity || null,
      };
      await orderAPI.updateOrder(parseInt(id!), data);
      setSuccess('Order updated successfully!');
      setTimeout(() => navigate(`/orders/${id}`), 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error updating order');
    } finally { setLoading(false); }
  };

  /* ───── shared styles ───── */
  const sectionStyle: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '10px',
    padding: '24px',
    marginBottom: '20px',
  };
  const sectionTitle: React.CSSProperties = {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#1a237e',
    margin: '0 0 16px 0',
    paddingBottom: '10px',
    borderBottom: '2px solid #e8eaf6',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };
  const row2: React.CSSProperties   = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' };
  const row3: React.CSSProperties   = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' };
  const group: React.CSSProperties  = { display: 'flex', flexDirection: 'column', gap: '6px' };
  const lbl: React.CSSProperties    = { fontSize: '0.8rem', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em' };
  const inp: React.CSSProperties    = { padding: '10px 12px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '0.95rem', width: '100%', boxSizing: 'border-box' };
  const disInp: React.CSSProperties = { ...inp, background: '#f5f5f5', color: '#888', cursor: 'default' };
  const totInp: React.CSSProperties = { ...inp, background: '#e8f5e9', color: '#2e7d32', fontWeight: 700, fontSize: '1.05rem' };
  const infoCard: React.CSSProperties = {
    background: '#f0f4ff',
    border: '1px solid #c5cae9',
    borderRadius: '8px',
    padding: '14px 18px',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px 24px',
    marginTop: '12px',
  };
  const infoItem: React.CSSProperties  = { display: 'flex', flexDirection: 'column', gap: '2px' };
  const infoLbl: React.CSSProperties   = { fontSize: '0.72rem', fontWeight: 600, color: '#7986cb', textTransform: 'uppercase' };
  const infoVal: React.CSSProperties   = { fontSize: '0.92rem', color: '#1a237e', fontWeight: 500 };

  if (loadingDetails) return <div className="loading">Loading order details...</div>;

  return (
    <div className="dashboard-container">
      <Header user={user} onLogout={onLogout} />

      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, color: '#1a237e' }}>Edit Order</h2>
          <button className="nav-button" onClick={() => navigate(`/orders/${id}`)}>← Back</button>
        </div>

        {error   && <div className="error-message"   style={{ marginBottom: '16px' }}>{error}</div>}
        {success && <div className="success-message" style={{ marginBottom: '16px' }}>{success}</div>}

        <form onSubmit={handleSubmit}>

          {/* ── Section 1: Destination & Product ── */}
          <div style={sectionStyle}>
            <h3 style={sectionTitle}>🌍 Step 1 — Destination & Product</h3>
            <div style={row2}>
              <div style={group}>
                <label style={lbl}>Country *</label>
                <select name="country" value={formData.country} onChange={handleChange} required style={inp}>
                  <option value="">Select Country</option>
                  {countries.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={group}>
                <label style={lbl}>Customer *</label>
                <select name="customer_id" value={formData.customer_id} onChange={handleChange} required disabled={!formData.country} style={formData.country ? inp : disInp}>
                  <option value="">{formData.country ? 'Select Customer' : 'Select Country first'}</option>
                  {filteredCustomers.map(c => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ ...group, marginTop: '16px' }}>
              <label style={lbl}>SKU / Product *</label>
              <select name="sku" value={formData.sku} onChange={handleChange} required disabled={!formData.country} style={formData.country ? inp : disInp}>
                <option value="">{formData.country ? 'Select SKU' : 'Select Country first'}</option>
                {availableProducts.map((p: any) => (
                  <option key={p.id} value={p.sku_code}>{p.sku_code} — {p.product_name}</option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div style={infoCard}>
                <div style={infoItem}><span style={infoLbl}>Product Name</span><span style={infoVal}>{selectedProduct.product_name}</span></div>
                <div style={infoItem}><span style={infoLbl}>Category</span><span style={infoVal}>{selectedProduct.category || '—'}</span></div>
                <div style={infoItem}><span style={infoLbl}>Pack Size</span><span style={infoVal}>{selectedProduct.pack_size || '—'}</span></div>
                <div style={infoItem}><span style={infoLbl}>Batch Size</span><span style={infoVal}>{selectedProduct.standard_batch_size || '—'}</span></div>
                <div style={infoItem}><span style={infoLbl}>MOQ</span><span style={infoVal}>{selectedProduct.moq || '—'}</span></div>
                <div style={infoItem}><span style={infoLbl}>Artwork Status</span><span style={infoVal}>{selectedProduct.artwork_status || '—'}</span></div>
              </div>
            )}
          </div>

          {/* ── Section 2: Order Information ── */}
          <div style={sectionStyle}>
            <h3 style={sectionTitle}>📋 Step 2 — Order Information</h3>
            <div style={row2}>
              <div style={group}>
                <label style={lbl}>PO Number *</label>
                <input type="text" name="po_number" value={formData.po_number} onChange={handleChange} required style={inp} />
              </div>
              <div style={group}>
                <label style={lbl}>PO Date *</label>
                <input type="date" name="po_date" value={formData.po_date} onChange={handleChange} required style={inp} />
              </div>
              <div style={group}>
                <label style={lbl}>Requested Delivery Date *</label>
                <input type="date" name="requested_delivery_date" value={formData.requested_delivery_date} onChange={handleChange} required style={inp} />
              </div>
              <div style={{ ...group, gridColumn: '1 / -1' }}>
                <label style={lbl}>Shipping Terms</label>
                <input type="text" name="shipping_terms" value={formData.shipping_terms} onChange={handleChange} style={inp} placeholder="e.g. FOB Mumbai, CIF London" />
              </div>
            </div>
          </div>

          {/* ── Section 3: Quantity ── */}
          <div style={sectionStyle}>
            <h3 style={sectionTitle}>📦 Step 3 — Quantity</h3>
            <div style={row3}>
              <div style={group}>
                <label style={lbl}>Sales Quantity *</label>
                <input type="number" name="sales_quantity" value={formData.sales_quantity} onChange={handleChange} required min="0" placeholder="0" style={inp} />
              </div>
              <div style={group}>
                <label style={lbl}>Free Quantity</label>
                <input type="number" name="free_quantity" value={formData.free_quantity} onChange={handleChange} min="0" placeholder="0" style={inp} />
              </div>
              <div style={group}>
                <label style={lbl}>Total Quantity (auto)</label>
                <input type="number" value={totalQuantity} disabled style={totInp} />
              </div>
            </div>
          </div>

          {/* ── Section 4: Import License ── */}
          <div style={sectionStyle}>
            <h3 style={sectionTitle}>📄 Step 4 — Import License</h3>
            <div style={row2}>
              <div style={group}>
                <label style={lbl}>Import License Required *</label>
                <select name="import_license_required" value={formData.import_license_required} onChange={handleChange} required style={inp}>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div style={group}>
                <label style={lbl}>License Validity *</label>
                <input type="date" name="import_license_validity" value={formData.import_license_validity} onChange={handleChange} required style={inp} />
              </div>
            </div>
          </div>

          {/* ── Section 5: Remarks ── */}
          <div style={sectionStyle}>
            <h3 style={sectionTitle}>💬 Remarks</h3>
            <div style={group}>
              <label style={lbl}>Additional Remarks</label>
              <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows={3} style={{ ...inp, resize: 'vertical' }} placeholder="Any additional notes..." />
            </div>
          </div>

          {/* ── Actions ── */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" className="nav-button" onClick={() => navigate(`/orders/${id}`)}>Cancel</button>
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? 'Saving...' : 'Update Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditOrder;
