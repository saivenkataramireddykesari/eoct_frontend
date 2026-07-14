import React, { useEffect } from 'react';

interface ProductItemProps {
  product: any;
  customerProducts: any[];
  onUpdate: (id: string, field: string, value: any) => void;
  onUpdateMany: (id: string, fields: Record<string, any>) => void; // Bulk update — avoids stale closure
  onRemove: (id: string) => void;
  errors: any;
  currencies: string[]; // Add this
}

const ProductItem: React.FC<ProductItemProps> = ({ product, customerProducts, onUpdate, onUpdateMany, onRemove, errors, currencies }) => {

  const totalQuantity = (parseInt(product.salesQty) || 0) + (parseInt(product.freeQty) || 0);
  const totalPrice = totalQuantity * (parseFloat(product.price) || 0);

  // Populate product fields from the already-fetched customerProducts list
  // Uses onUpdateMany to merge all fields in ONE setState call — avoids the stale-closure
  // problem where successive onUpdate() calls each only see the original product snapshot.
  useEffect(() => {
    if (product.skuCode && customerProducts.length > 0) {
      const found = customerProducts.find((p: any) => p.sku_code === product.skuCode);
      if (found) {
        onUpdateMany(product.id, {
          productName:  found.product_name                                     || '',
          category:     found.category                                         || '',
          packSize:     found.pack_size                                        || '',
          batchSize:    found.standard_batch_size ? String(found.standard_batch_size) : '',
          moq:          found.moq                 ? String(found.moq)          : '',
          artworkStatus: found.artwork_status                                  || 'Not Available',
          pmCode:       found.pm_code                                          || '',
          price:        found.price               ? String(found.price)        : '', // Assuming product data has a price field
        });
      }
    }
    if (!product.skuCode) {
      onUpdateMany(product.id, {
        productName: '', category: '', packSize: '',
        batchSize: '', moq: '', artworkStatus: 'Not Available', pmCode: '',
        price: '', totalPrice: 0, // Reset price and totalPrice
      });
    }
  }, [product.skuCode, customerProducts]); // deps: SKU selection + available product list

  // Recalculate totalPrice whenever salesQty, freeQty, or price changes
  useEffect(() => {
    const newTotal = totalQuantity * (parseFloat(product.price) || 0);
    if (newTotal !== product.totalPrice) {
      onUpdate(product.id, 'totalPrice', newTotal);
    }
  }, [totalQuantity, product.price, onUpdate, product.id, product.totalPrice]); // Add product.price and totalQuantity to dependencies

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
    <div style={cardBlue}>
      <div style={{...cardTitleBlue, justifyContent: 'space-between' }}>
        <span>📦 Product Details</span>
        <button type="button" className="nav-button" onClick={() => onRemove(product.id)}>
          Remove
        </button>
      </div>
      <div style={grid2}>
        <div style={fld}>
          <label style={lbl}>SKU Code *</label>
          <select value={product.skuCode} onChange={e => onUpdate(product.id, 'skuCode', e.target.value)} required
            style={customerProducts.length > 0 ? inp : inpDis} disabled={customerProducts.length === 0}>
            <option value="">{customerProducts.length > 0 ? '— Select SKU —' : 'No products for this customer'}</option>
            {customerProducts.map((p: any) => (
              <option key={p.sku_code} value={p.sku_code}>{p.sku_code}</option>
            ))}
          </select>
        </div>
        <div style={fld}>
          <label style={lbl}>Product Name *</label>
          <input type="text" value={product.productName} readOnly style={inpDis} placeholder="Auto-filled from SKU" />
        </div>
        <div style={fld}>
          <label style={lbl}>Category</label>
          <input type="text" value={product.category} readOnly style={inpDis} placeholder="Auto-filled from SKU" />
        </div>
        <div style={fld}>
          <label style={lbl}>Pack Size</label>
          <input type="text" value={product.packSize} readOnly style={inpDis} placeholder="Auto-filled from SKU" />
        </div>
        <div style={fld}>
          <label style={lbl}>Standard Batch Size</label>
          <input type="number" value={product.batchSize} readOnly style={inpDis} placeholder="Auto-filled from SKU" min="0" />
        </div>
        <div style={fld}>
          <label style={lbl}>MOQ</label>
          <input type="number" value={product.moq} readOnly style={inpDis} placeholder="Auto-filled from SKU" min="0" />
        </div>
        <div style={fld}>
          <label style={lbl}>Artwork Status *</label>
          <select value={product.artworkStatus} onChange={e => onUpdate(product.id, 'artworkStatus', e.target.value)} style={inp}>
            <option value="Not Available">Not Available</option>
            <option value="Pending">Pending</option>
            <option value="Available">Available</option>
          </select>
        </div>
        {product.artworkStatus === 'Available' && (
          <div style={fld}>
            <label style={lbl}>PM Code *</label>
            <input type="text" value={product.pmCode} onChange={e => onUpdate(product.id, 'pmCode', e.target.value)}
              required style={inp} placeholder="e.g. PM-PARA-500" />
          </div>
        )}
      </div>

      {/* ── Quantity ── */}
      <div style={card}>
        <div style={cardTitle}>🔢 Quantity</div>
        <div style={grid3}>
          <div style={fld}>
            <label style={lbl}>Sales Quantity *</label>
            <input type="number" value={product.salesQty} onChange={e => onUpdate(product.id, 'salesQty', e.target.value)}
              required min="0" placeholder="0" style={inp} />
          </div>
          <div style={fld}>
            <label style={lbl}>Free Quantity</label>
            <input type="number" value={product.freeQty} onChange={e => onUpdate(product.id, 'freeQty', e.target.value)}
              min="0" placeholder="0" style={inp} />
          </div>
          <div style={fld}>
            <label style={lbl}>Total Quantity (Sales + Free)</label>
            <input type="number" value={totalQuantity} disabled style={inpTotal} />
          </div>
        </div>
        <div style={{ ...grid2, marginTop: '16px' }}> {/* New grid for price and currency */}
          <div style={fld}>
            <label style={lbl}>Price per Unit *</label>
            <input type="number" value={product.price} onChange={e => onUpdate(product.id, 'price', e.target.value)}
              required min="0" step="0.01" placeholder="0.00" style={inp} />
          </div>
          <div style={fld}>
            <label style={lbl}>Currency *</label>
            <select value={product.currency} onChange={e => onUpdate(product.id, 'currency', e.target.value)}
              required style={inp}>
              {currencies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div style={{ ...fld, marginTop: '16px' }}> {/* Total Price field */}
          <label style={lbl}>Total Price (auto)</label>
          <input type="text" value={`${product.currency} ${product.totalPrice.toFixed(2)}`} disabled style={inpTotal} />
        </div>
      </div>
    </div>
  );
};

export default ProductItem;
