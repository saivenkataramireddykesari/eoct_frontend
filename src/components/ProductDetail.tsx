import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productAPI, orderAPI, formatErrorMessage } from '../services/api';
import Header from './Header';

interface ProductDetailProps {
  user: any;
  onLogout: () => void;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ user, onLogout }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // PM Code update states
  const [pmModal, setPmModal] = useState(false);
  const [primaryPmCodeInput, setPrimaryPmCodeInput] = useState('');
  const [secondaryPmCodeInput, setSecondaryPmCodeInput] = useState('');
  const [leafPmCodeInput, setLeafPmCodeInput] = useState('');

  // Artwork submission modal states
  const [artworkSubmitModal, setArtworkSubmitModal] = useState<any | null>(null);
  const [artworkRemarks, setArtworkRemarks] = useState('');

  // Regulatory Decision Modal states
  const [acceptModal, setAcceptModal] = useState<any | null>(null);
  const [rejectModal, setRejectModal] = useState<any | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState('');

  const isRegulatory = user?.department === 'Regulatory';
  const isArtwork = user?.department === 'Artwork';

  useEffect(() => {
    if (id) {
      fetchProductDetails(parseInt(id));
    }
  }, [id]);

  const fetchProductDetails = async (productId: number) => {
    try {
      setLoading(true);
      setError(null);
      const res = await productAPI.getProductDetail(productId);
      setProduct(res.data);

      // Fetch related orders for this product's SKU
      if (res.data && res.data.sku_code) {
        try {
          const ordersRes = await orderAPI.getOrders(undefined, undefined, 0, 100);
          const matchedOrders = (ordersRes.data || []).filter(
            (o: any) => o.sku === res.data.sku_code || o.product_id === res.data.id
          );
          setOrders(matchedOrders);
        } catch (e) {
          console.error('Error fetching product orders:', e);
        }
      }
    } catch (err: any) {
      console.error('Error fetching product details:', err);
      setError(formatErrorMessage(err, 'Failed to load product details'));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPmCode = async () => {
    if (!product) return;
    try {
      await productAPI.requestPmCode(product.sku_code);
      alert('PM Code request submitted successfully!');
      fetchProductDetails(product.id);
    } catch (err: any) {
      alert(formatErrorMessage(err, 'Error requesting PM Code'));
    }
  };

  const handlePmCodeUpdate = async () => {
    if (!product) return;
    try {
      await productAPI.updatePmCode(product.sku_code, primaryPmCodeInput, secondaryPmCodeInput, leafPmCodeInput);
      setPmModal(false);
      alert('PM Code updated successfully!');
      fetchProductDetails(product.id);
    } catch (err: any) {
      alert(formatErrorMessage(err, 'Error updating PM Code'));
    }
  };

  const handleArtworkSubmit = async () => {
    if (!artworkSubmitModal || !primaryPmCodeInput.trim()) return;
    try {
      await productAPI.submitArtworkPmCode(
        artworkSubmitModal.id,
        primaryPmCodeInput.trim(),
        secondaryPmCodeInput.trim(),
        leafPmCodeInput.trim(),
        artworkRemarks
      );
      setArtworkSubmitModal(null);
      setPrimaryPmCodeInput('');
      setSecondaryPmCodeInput('');
      setLeafPmCodeInput('');
      setArtworkRemarks('');
      alert('PM Code submitted for Regulatory approval!');
      fetchProductDetails(product.id);
    } catch (err: any) {
      alert(formatErrorMessage(err, 'Error submitting PM Code'));
    }
  };

  const handleDecidePmCode = async (
    requestId: number,
    decision: 'ACCEPT' | 'REJECT',
    remarks?: string,
    primaryPmCode?: string,
    secondaryPmCode?: string,
    leafPmCode?: string,
    artworkStatus?: string
  ) => {
    try {
      await productAPI.decidePmCode(requestId, decision, remarks, primaryPmCode, secondaryPmCode, leafPmCode, artworkStatus);
      setAcceptModal(null);
      setRejectModal(null);
      setRejectRemarks('');
      alert(`PM Code request ${decision.toLowerCase()}ed successfully!`);
      fetchProductDetails(product.id);
    } catch (err: any) {
      alert(formatErrorMessage(err, 'Error submitting decision'));
    }
  };

  const getArtworkStatusClass = (status: string) => {
    switch (status) {
      case 'Available': return 'status-accepted';
      case 'Pending': return 'status-hold';
      default: return 'status-risk';
    }
  };

  if (loading) {
    return <div className="loading">Loading product full details...</div>;
  }

  if (error || !product) {
    return (
      <div className="main-container">
        <Header user={user} onLogout={onLogout} />
        <div className="panel" style={{ textAlign: 'center', padding: '40px' }}>
          <h2 style={{ color: '#ef4444' }}>{error || 'Product Not Found'}</h2>
          <button className="submit-button" onClick={() => navigate('/products')} style={{ marginTop: '20px' }}>
            ← Back to Products
          </button>
        </div>
      </div>
    );
  }

  const requests = product.pm_code_requests || [];
  const latestRequest = requests[requests.length - 1];
  const showGetPmCode = isRegulatory && (product.artwork_status !== 'Available') && (!product.primary_pm_code) && (!latestRequest || latestRequest.status === 'APPROVED');

  const getPmRequestStatusText = () => {
    if (!latestRequest) return '—';
    switch (latestRequest.status) {
      case 'PENDING_ARTWORK': return 'Awaiting Artwork PM Code';
      case 'AWAITING_REGULATORY_APPROVAL': return 'Awaiting Regulatory Approval';
      case 'APPROVED': return 'Approved';
      case 'REJECTED': return 'Rejected';
      default: return latestRequest.status;
    }
  };

  const getPmRequestStatusClass = () => {
    if (!latestRequest) return '';
    switch (latestRequest.status) {
      case 'PENDING_ARTWORK': return 'status-hold';
      case 'AWAITING_REGULATORY_APPROVAL': return 'status-new';
      case 'APPROVED': return 'status-accepted';
      case 'REJECTED': return 'status-risk';
      default: return '';
    }
  };

  const allTransactions = (requests.flatMap((req: any) => req.transactions || []) || [])
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="main-container">
      <Header user={user} onLogout={onLogout} />

      <div className="panel" style={{ maxWidth: '1200px', margin: '20px auto' }}>
        {/* Navigation & Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <button
              className="nav-button"
              onClick={() => navigate('/products')}
              style={{ marginBottom: '12px', padding: '6px 14px', background: '#e2e8f0', color: '#334155' }}
            >
              ← Back to Products
            </button>
            <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px' }}>
              📦 {product.product_name}
              <span className="status-badge status-new" style={{ fontSize: '0.85rem' }}>{product.sku_code}</span>
            </h1>
            <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>
              Country: <strong>{product.country?.name || '—'}</strong> | Customer: <strong>{product.customer || '—'}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {showGetPmCode && (
              <button className="submit-button" onClick={handleRequestPmCode}>
                Get PM Code
              </button>
            )}

            {isRegulatory && latestRequest && latestRequest.status === 'AWAITING_REGULATORY_APPROVAL' && (
              <>
                <button
                  className="submit-button"
                  style={{ background: '#22c55e', borderColor: '#22c55e' }}
                  onClick={() => setAcceptModal(latestRequest)}
                >
                  Accept PM Code
                </button>
                <button
                  className="nav-button"
                  style={{ background: '#ef4444', borderColor: '#ef4444', color: '#fff' }}
                  onClick={() => setRejectModal(latestRequest)}
                >
                  Reject
                </button>
              </>
            )}

            {isArtwork && latestRequest && latestRequest.status === 'PENDING_ARTWORK' && (
              <button
                className="submit-button"
                style={{ background: '#f59e0b', borderColor: '#f59e0b' }}
                onClick={() => {
                  setArtworkSubmitModal(latestRequest);
                  setPrimaryPmCodeInput(latestRequest.current_primary_pm_code || product.primary_pm_code || '');
                  setSecondaryPmCodeInput(latestRequest.current_secondary_pm_code || product.secondary_pm_code || '');
                  setLeafPmCodeInput(latestRequest.current_leaf_pm_code || product.leaf_pm_code || '');
                }}
              >
                Submit PM Code
              </button>
            )}

            {isArtwork && (!latestRequest || latestRequest.status !== 'PENDING_ARTWORK') && (
              <button
                className="submit-button"
                style={{ background: '#f59e0b', borderColor: '#f59e0b' }}
                onClick={() => {
                  setPmModal(true);
                  setPrimaryPmCodeInput(product.primary_pm_code || '');
                  setSecondaryPmCodeInput(product.secondary_pm_code || '');
                  setLeafPmCodeInput(product.leaf_pm_code || '');
                }}
              >
                Update PM Code
              </button>
            )}
          </div>
        </div>

        {/* Complete Product Details Grid */}
        <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', marginBottom: '32px' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#334155', borderBottom: '2px solid #cbd5e1', paddingBottom: '8px' }}>
            📋 Product Master Information
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.9rem', display: 'block' }}>SKU Code</span>
              <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{product.sku_code}</strong>
            </div>

            <div>
              <span style={{ color: '#64748b', fontSize: '0.9rem', display: 'block' }}>Product Name</span>
              <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{product.product_name}</strong>
            </div>

            <div>
              <span style={{ color: '#64748b', fontSize: '0.9rem', display: 'block' }}>Country</span>
              <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{product.country?.name || '—'}</strong>
            </div>

            <div>
              <span style={{ color: '#64748b', fontSize: '0.9rem', display: 'block' }}>Customer</span>
              <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{product.customer || '—'}</strong>
            </div>

            <div>
              <span style={{ color: '#64748b', fontSize: '0.9rem', display: 'block' }}>Pack Size</span>
              <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{product.pack_size || '—'}</strong>
            </div>

            <div>
              <span style={{ color: '#64748b', fontSize: '0.9rem', display: 'block' }}>Standard Batch Size</span>
              <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{product.standard_batch_size || '—'}</strong>
            </div>

            <div>
              <span style={{ color: '#64748b', fontSize: '0.9rem', display: 'block' }}>Minimum Order Quantity (MOQ)</span>
              <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{product.moq || '—'}</strong>
            </div>

            <div>
              <span style={{ color: '#64748b', fontSize: '0.9rem', display: 'block' }}>Primary PM Code</span>
              <strong style={{ fontSize: '1.05rem', color: '#0284c7' }}>{product.primary_pm_code || latestRequest?.current_primary_pm_code || '—'}</strong>
            </div>

            <div>
              <span style={{ color: '#64748b', fontSize: '0.9rem', display: 'block' }}>Secondary PM Code</span>
              <strong style={{ fontSize: '1.05rem', color: '#0284c7' }}>{product.secondary_pm_code || latestRequest?.current_secondary_pm_code || '—'}</strong>
            </div>

            <div>
              <span style={{ color: '#64748b', fontSize: '0.9rem', display: 'block' }}>Leaflet PM Code</span>
              <strong style={{ fontSize: '1.05rem', color: '#0284c7' }}>{product.leaf_pm_code || latestRequest?.current_leaf_pm_code || '—'}</strong>
            </div>

            <div>
              <span style={{ color: '#64748b', fontSize: '0.9rem', display: 'block' }}>Artwork Status</span>
              <span className={`status-badge ${getArtworkStatusClass(product.artwork_status)}`}>
                {product.artwork_status}
              </span>
            </div>

            <div>
              <span style={{ color: '#64748b', fontSize: '0.9rem', display: 'block' }}>PM Request Status</span>
              {latestRequest ? (
                <span className={`status-badge ${getPmRequestStatusClass()}`}>
                  {getPmRequestStatusText()}
                </span>
              ) : (
                <span style={{ color: '#94a3b8' }}>—</span>
              )}
            </div>
          </div>
        </div>

        {/* PM Code Request & Action History Section */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#334155', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
            📜 PM Code Workflow History
          </h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Department</th>
                  <th>Action / Workflow Transition</th>
                  <th>PM Code</th>
                  <th>Remarks</th>
                  <th>Response Time</th>
                </tr>
              </thead>
              <tbody>
                {allTransactions.map((tx: any) => (
                  <tr key={tx.id}>
                    <td>{new Date(tx.created_at).toLocaleString()}</td>
                    <td>
                      <span className={`status-badge ${tx.action_by_dept === 'Regulatory' ? 'status-new' : 'status-execution'}`}>
                        {tx.action_by_dept}
                      </span>
                    </td>
                    <td>
                      {tx.from_state ? (
                        <span>{tx.from_state} ➔ {tx.to_state}</span>
                      ) : (
                        <span>Created ➔ {tx.to_state}</span>
                      )}
                    </td>
                    <td>{tx.primary_pm_code || tx.pm_code || '—'}</td>
                    <td>{tx.remarks || '—'}</td>
                    <td>
                      {tx.response_time_days > 0 ? (
                        <span style={{ fontWeight: 'bold', color: '#e65100' }}>
                          {tx.response_time_days} day(s)
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>&lt; 1 day</span>
                      )}
                    </td>
                  </tr>
                ))}
                {allTransactions.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                      No workflow history recorded for this product yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Associated Orders for this Product */}
        <div>
          <h3 style={{ margin: '0 0 16px 0', color: '#334155', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
            🛒 Associated Orders ({orders.length})
          </h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Order Number</th>
                  <th>Customer</th>
                  <th>Quantity</th>
                  <th>Delivery Date</th>
                  <th>Status</th>
                  <th>Compliance</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o: any) => (
                  <tr
                    key={o.id}
                    onClick={() => navigate(`/orders/${o.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td><strong>{o.order_id}</strong></td>
                    <td>{o.order_number}</td>
                    <td>{o.customer?.customer_name}</td>
                    <td>{o.quantity}</td>
                    <td>{new Date(o.requested_delivery_date).toLocaleDateString()}</td>
                    <td><span className="status-badge status-pending">{o.status}</span></td>
                    <td>
                      <span className={`status-badge ${o.compliance_status === 'PASSED' ? 'status-accepted' : 'status-risk'}`}>
                        {o.compliance_status || 'PENDING'}
                      </span>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                      No active orders associated with this product SKU.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Update PM Code Modal */}
      {pmModal && (
        <div className="modal-overlay" onClick={() => setPmModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Update PM Codes — {product.sku_code}</h2>
            <div className="form-group">
              <label>Primary PM Code</label>
              <input
                type="text"
                value={primaryPmCodeInput}
                onChange={(e) => setPrimaryPmCodeInput(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Secondary PM Code</label>
              <input
                type="text"
                value={secondaryPmCodeInput}
                onChange={(e) => setSecondaryPmCodeInput(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Leaflet PM Code</label>
              <input
                type="text"
                value={leafPmCodeInput}
                onChange={(e) => setLeafPmCodeInput(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button className="nav-button" onClick={() => setPmModal(false)}>Cancel</button>
              <button className="submit-button" onClick={handlePmCodeUpdate}>Save PM Codes</button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Artwork PM Code Modal */}
      {artworkSubmitModal && (
        <div className="modal-overlay" onClick={() => setArtworkSubmitModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Submit Artwork PM Code</h2>
            <div className="form-group">
              <label>Primary PM Code *</label>
              <input
                type="text"
                value={primaryPmCodeInput}
                onChange={(e) => setPrimaryPmCodeInput(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Secondary PM Code</label>
              <input
                type="text"
                value={secondaryPmCodeInput}
                onChange={(e) => setSecondaryPmCodeInput(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Leaflet PM Code</label>
              <input
                type="text"
                value={leafPmCodeInput}
                onChange={(e) => setLeafPmCodeInput(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Remarks</label>
              <textarea
                value={artworkRemarks}
                onChange={(e) => setArtworkRemarks(e.target.value)}
                placeholder="Optional submission remarks..."
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button className="nav-button" onClick={() => setArtworkSubmitModal(null)}>Cancel</button>
              <button className="submit-button" onClick={handleArtworkSubmit}>Submit to Regulatory</button>
            </div>
          </div>
        </div>
      )}

      {/* Accept PM Code Modal */}
      {acceptModal && (
        <div className="modal-overlay" onClick={() => setAcceptModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Accept PM Code</h2>
            <p>Confirm accepting PM Code for SKU <strong>{product.sku_code}</strong>?</p>
            <div style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '12px 16px',
              margin: '12px 0 16px 0',
              fontSize: '0.9em'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#1e293b' }}>PM Codes to Accept:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#334155' }}>
                <div>🔹 <strong>Primary PM Code:</strong> <span style={{ color: '#0284c7', fontWeight: 600 }}>{acceptModal.current_primary_pm_code || acceptModal.current_pm_code || '—'}</span></div>
                <div>🔹 <strong>Secondary PM Code:</strong> <span style={{ color: '#0284c7', fontWeight: 600 }}>{acceptModal.current_secondary_pm_code || '—'}</span></div>
                <div>🔹 <strong>Leaflet PM Code:</strong> <span style={{ color: '#0284c7', fontWeight: 600 }}>{acceptModal.current_leaf_pm_code || '—'}</span></div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button className="nav-button" onClick={() => setAcceptModal(null)}>Cancel</button>
              <button
                className="submit-button"
                style={{ background: '#22c55e', borderColor: '#22c55e' }}
                onClick={() => handleDecidePmCode(
                  acceptModal.id,
                  'ACCEPT',
                  'Approved by Regulatory',
                  acceptModal.current_primary_pm_code || acceptModal.current_pm_code || '',
                  acceptModal.current_secondary_pm_code || '',
                  acceptModal.current_leaf_pm_code || '',
                  'Available'
                )}
              >
                Confirm Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject PM Code Modal */}
      {rejectModal && (
        <div className="modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Reject PM Code</h2>
            <div style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '14px',
              fontSize: '0.9em'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#1e293b' }}>PM Codes Being Rejected (SKU: {product.sku_code}):</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#334155' }}>
                <div>❌ <strong>Primary PM Code:</strong> {rejectModal.current_primary_pm_code || rejectModal.current_pm_code || '—'}</div>
                <div>❌ <strong>Secondary PM Code:</strong> {rejectModal.current_secondary_pm_code || '—'}</div>
                <div>❌ <strong>Leaflet PM Code:</strong> {rejectModal.current_leaf_pm_code || '—'}</div>
              </div>
            </div>
            <div className="form-group">
              <label>Rejection Remarks *</label>
              <textarea
                value={rejectRemarks}
                onChange={(e) => setRejectRemarks(e.target.value)}
                placeholder="Specify reason for rejection..."
                required
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button className="nav-button" onClick={() => setRejectModal(null)}>Cancel</button>
              <button
                className="submit-button"
                style={{ background: '#ef4444', borderColor: '#ef4444' }}
                onClick={() => {
                  if (!rejectRemarks.trim()) {
                    alert('Please enter rejection remarks');
                    return;
                  }
                  handleDecidePmCode(rejectModal.id, 'REJECT', rejectRemarks.trim());
                }}
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
