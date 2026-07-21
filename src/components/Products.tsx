import React, { useState, useEffect } from 'react';
import { productAPI } from '../services/api';
import Header from './Header';

interface ProductsProps {
  user: any;
  onLogout: () => void;
}

const Products: React.FC<ProductsProps> = ({ user, onLogout }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [pmModal, setPmModal] = useState<{ sku: string; primaryPmCode: string; secondaryPmCode: string; leafPmCode: string } | null>(null);
  const [primaryPmCodeInput, setPrimaryPmCodeInput] = useState('');
  const [secondaryPmCodeInput, setSecondaryPmCodeInput] = useState('');
  const [leafPmCodeInput, setLeafPmCodeInput] = useState('');
  
  // PM Code Request workflow states
  const [historyModal, setHistoryModal] = useState<any | null>(null);
  const [rejectModal, setRejectModal] = useState<{ requestId: number } | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [artworkSubmitModal, setArtworkSubmitModal] = useState<{ requestId: number; sku: string } | null>(null);
  const [artworkPmCode, setArtworkPmCode] = useState('');
  const [artworkRemarks, setArtworkRemarks] = useState('');
  const [acceptModal, setAcceptModal] = useState<{ requestId: number; primaryPmCode: string; secondaryPmCode: string; leafPmCode: string } | null>(null);
  const [acceptRemarks, setAcceptRemarks] = useState('');

  const [formData, setFormData] = useState({
    sku_code: '',
    product_name: '',
    category: '',
    country: '',
    customer: '',
    pack_size: '',
    standard_batch_size: '',
    moq: '',
    primary_pm_code: '',
    secondary_pm_code: '',
    leaf_pm_code: '',
    artwork_status: 'Not Available',
  });

  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [hasMore, setHasMore] = useState(true);

  const isRegulatory = user?.department === 'Regulatory';

  useEffect(() => {
    fetchProducts(1);
  }, []);

  const fetchProducts = async (p: number = page) => {
    try {
      setLoading(true);
      const skip = (p - 1) * pageSize;
      const response = await productAPI.getProducts(skip, pageSize);
      setProducts(response.data);
      setHasMore(response.data.length === pageSize);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log("Submitting product with PM Codes:", formData.primary_pm_code, formData.secondary_pm_code, formData.leaf_pm_code);
      await productAPI.createProduct({
        ...formData,
        standard_batch_size: parseInt(formData.standard_batch_size) || null,
        moq: parseInt(formData.moq) || null,
        // pm_codes only sent if artwork is Available
        primary_pm_code: formData.artwork_status === 'Available' ? formData.primary_pm_code : '',
        secondary_pm_code: formData.artwork_status === 'Available' ? formData.secondary_pm_code : '',
        leaf_pm_code: formData.artwork_status === 'Available' ? formData.leaf_pm_code : '',
        current_artwork_version: '',
      });
      setShowModal(false);
      fetchProducts();
      setFormData({
        sku_code: '',
        product_name: '',
        category: '',
        country: '',
        customer: '',
        pack_size: '',
        standard_batch_size: '',
        moq: '',
        primary_pm_code: '',
        secondary_pm_code: '',
        leaf_pm_code: '',
        artwork_status: 'Not Available',
      });
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Error creating product');
    }
  };

  const handlePmCodeUpdate = async () => {
    if (!pmModal) return;
    console.log("Updating PM Codes for SKU:", pmModal.sku, "with values:", primaryPmCodeInput, secondaryPmCodeInput, leafPmCodeInput);
    try {
      await productAPI.updatePmCode(pmModal.sku, primaryPmCodeInput, secondaryPmCodeInput, leafPmCodeInput);
      setPmModal(null);
      setPrimaryPmCodeInput('');
      setSecondaryPmCodeInput('');
      setLeafPmCodeInput('');
      fetchProducts();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error updating PM Codes');
    }
  };

  const handleRequestPmCode = async (sku: string) => {
    try {
      await productAPI.requestPmCode(sku);
      fetchProducts();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error requesting PM Code');
    }
  };

  const handleDecidePmCode = async (requestId: number, decision: 'ACCEPT' | 'REJECT', remarks?: string) => {
    try {
      await productAPI.decidePmCode(requestId, decision, remarks);
      fetchProducts();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error submitting decision');
    }
  };

  const handleArtworkSubmit = async () => {
    if (!artworkSubmitModal || !primaryPmCodeInput.trim()) return;
    console.log("Artwork submitting PM Codes for request:", artworkSubmitModal.requestId, "with values:", primaryPmCodeInput, secondaryPmCodeInput, leafPmCodeInput);
    try {
      await productAPI.submitPmCode(artworkSubmitModal.requestId, primaryPmCodeInput, secondaryPmCodeInput, leafPmCodeInput, artworkRemarks);
      setArtworkSubmitModal(null);
      setPrimaryPmCodeInput('');
      setSecondaryPmCodeInput('');
      setLeafPmCodeInput('');
      setArtworkRemarks('');
      fetchProducts();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error submitting PM Codes');
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
    return <div className="loading">Loading products...</div>;
  }

  return (
    <div className="dashboard-container">
      <Header user={user} onLogout={onLogout} />

      <div className="panel">
        <div className="panel-header">
          <h2>Products</h2>
          {/* Only show "Add Product" for Regulatory department */}
          {user.department === 'Regulatory' && (
            <button className="submit-button" onClick={() => setShowModal(true)}>
              + Add Product
            </button>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU Code</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Country</th>
                <th>Customer</th>
                <th>Pack Size</th>
                <th>Batch Size</th>
                <th>MOQ</th>
                <th>Primary PM Code</th>
                <th>Secondary PM Code</th>
                <th>Leaf PM Code</th>
                <th>Artwork Status</th>
                <th>PM Request Status</th>
                <th>History</th>
                {(isRegulatory || user.department === 'Artwork') && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const requests = product.pm_code_requests || [];
                const latestRequest = requests[requests.length - 1];
                const showGetPmCode = isRegulatory && (product.artwork_status !== 'Available') && (!product.pm_code) && (!latestRequest || latestRequest.status === 'APPROVED');
                
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

                return (
                  <tr key={product.id}>
                    <td>{product.sku_code}</td>
                    <td>{product.product_name}</td>
                    <td>{product.category}</td>
                    <td>{product.country}</td>
                    <td>{product.customer}</td>
                    <td>{product.pack_size}</td>
                    <td>{product.standard_batch_size}</td>
                    <td>{product.moq}</td>
                    <td>{product.primary_pm_code || '—'}</td>
                    <td>{product.secondary_pm_code || '—'}</td>
                    <td>{product.leaf_pm_code || '—'}</td>
                    <td>
                      <span className={`status-badge ${getArtworkStatusClass(product.artwork_status)}`}>
                        {product.artwork_status}
                      </span>
                    </td>
                    <td>
                      {latestRequest ? (
                        <span className={`status-badge ${getPmRequestStatusClass()}`}>
                          {getPmRequestStatusText()}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      {requests.length > 0 ? (
                        <button
                          className="nav-button"
                          onClick={() => setHistoryModal(product)}
                        >
                          Show History
                        </button>
                      ) : '—'}
                    </td>
                    {(isRegulatory || user.department === 'Artwork') && (
                      <td>
                        {showGetPmCode && (
                          <button
                            className="submit-button"
                            onClick={() => handleRequestPmCode(product.sku_code)}
                          >
                            Get PM Code
                          </button>
                        )}
                        {isRegulatory && latestRequest && latestRequest.status === 'PENDING_ARTWORK' && (
                          <span style={{ color: '#666', fontSize: '0.9em' }}>Awaiting Artwork</span>
                        )}
                        {isRegulatory && latestRequest && latestRequest.status === 'AWAITING_REGULATORY_APPROVAL' && (
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <button
                              className="submit-button"
                              style={{ background: '#4caf50', borderColor: '#4caf50', padding: '4px 8px', fontSize: '0.85em' }}
                              onClick={() => setAcceptModal({ requestId: latestRequest.id, primaryPmCode: latestRequest.current_pm_code || '', secondaryPmCode: latestRequest.secondary_pm_code || '', leafPmCode: latestRequest.leaf_pm_code || '' })}
                            >
                              Accept ({latestRequest.current_pm_code})
                            </button>
                            <button
                              className="nav-button"
                              style={{ background: '#f44336', borderColor: '#f44336', color: '#fff', padding: '4px 8px', fontSize: '0.85em' }}
                              onClick={() => setRejectModal({ requestId: latestRequest.id })}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {user.department === 'Artwork' && latestRequest && latestRequest.status === 'PENDING_ARTWORK' && (
                          <button
                            className="submit-button"
                            style={{ background: '#ff9800', borderColor: '#ff9800' }}
                            onClick={() => {
                              setArtworkSubmitModal({ requestId: latestRequest.id, sku: product.sku_code });
                              setPrimaryPmCodeInput(product.primary_pm_code || '');
                              setSecondaryPmCodeInput(product.secondary_pm_code || '');
                              setLeafPmCodeInput(product.leaf_pm_code || '');
                            }}
                          >
                            Submit PM Code
                          </button>
                        )}
                        {user.department === 'Artwork' && latestRequest && latestRequest.status === 'AWAITING_REGULATORY_APPROVAL' && (
                          <span style={{ color: '#666', fontSize: '0.9em' }}>Pending Regulatory Review</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="mobile-table-cards">
          {products.map((product) => {
            const requests = product.pm_code_requests || [];
            const latestRequest = requests[requests.length - 1];
            const showGetPmCode = isRegulatory && (product.artwork_status !== 'Available') && (!product.pm_code) && (!latestRequest || latestRequest.status === 'APPROVED');
            
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

            return (
              <div key={product.id} className="mobile-card">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">SKU Code</span>
                  <span className="mobile-card-value">{product.sku_code}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Product Name</span>
                  <span className="mobile-card-value">{product.product_name}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Category</span>
                  <span className="mobile-card-value">{product.category}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Country</span>
                  <span className="mobile-card-value">{product.country}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Customer</span>
                  <span className="mobile-card-value">{product.customer}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Pack Size</span>
                  <span className="mobile-card-value">{product.pack_size}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Batch Size</span>
                  <span className="mobile-card-value">{product.standard_batch_size}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">MOQ</span>
                  <span className="mobile-card-value">{product.moq}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Primary PM Code</span>
                  <span className="mobile-card-value">{product.primary_pm_code || '—'}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Secondary PM Code</span>
                  <span className="mobile-card-value">{product.secondary_pm_code || '—'}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Leaf PM Code</span>
                  <span className="mobile-card-value">{product.leaf_pm_code || '—'}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Artwork Status</span>
                  <span className="mobile-card-value">
                    <span className={`status-badge ${getArtworkStatusClass(product.artwork_status)}`}>
                      {product.artwork_status}
                    </span>
                  </span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">PM Request Status</span>
                  <span className="mobile-card-value">
                    {latestRequest ? (
                      <span className={`status-badge ${getPmRequestStatusClass()}`}>
                        {getPmRequestStatusText()}
                      </span>
                    ) : '—'}
                  </span>
                </div>
                {requests.length > 0 && (
                  <div className="mobile-card-row" style={{ marginTop: '8px' }}>
                    <button
                      className="nav-button"
                      style={{ width: '100%' }}
                      onClick={() => setHistoryModal(product)}
                    >
                      Show History
                    </button>
                  </div>
                )}
                {(isRegulatory || user.department === 'Artwork') && (
                  <div className="mobile-card-row" style={{ marginTop: '8px' }}>
                    {showGetPmCode && (
                      <button
                        className="submit-button"
                        style={{ width: '100%' }}
                        onClick={() => handleRequestPmCode(product.sku_code)}
                      >
                        Get PM Code
                      </button>
                    )}
                    {isRegulatory && latestRequest && latestRequest.status === 'PENDING_ARTWORK' && (
                      <span style={{ color: '#666', fontSize: '0.9em', textAlign: 'center', width: '100%', display: 'block' }}>Awaiting Artwork</span>
                    )}
                    {isRegulatory && latestRequest && latestRequest.status === 'AWAITING_REGULATORY_APPROVAL' && (
                      <div style={{ display: 'flex', gap: '5px', width: '100%' }}>
                        <button
                          className="submit-button"
                          style={{ background: '#4caf50', borderColor: '#4caf50', flex: 1, padding: '6px', fontSize: '0.85em' }}
                          onClick={() => setAcceptModal({ requestId: latestRequest.id, primaryPmCode: latestRequest.current_pm_code || '', secondaryPmCode: '', leafPmCode: '' })}
                        >
                          Accept ({latestRequest.current_pm_code})
                        </button>
                        <button
                          className="nav-button"
                          style={{ background: '#f44336', borderColor: '#f44336', color: '#fff', flex: 1, padding: '6px', fontSize: '0.85em' }}
                          onClick={() => setRejectModal({ requestId: latestRequest.id })}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {user.department === 'Artwork' && latestRequest && latestRequest.status === 'PENDING_ARTWORK' && (
                      <button
                        className="submit-button"
                        style={{ background: '#ff9800', borderColor: '#ff9800', width: '100%' }}
                        onClick={() => {
                          setArtworkSubmitModal({ requestId: latestRequest.id, sku: product.sku_code });
                          setArtworkPmCode(product.pm_code || '');
                        }}
                      >
                        Submit PM Code
                      </button>
                    )}
                    {user.department === 'Artwork' && latestRequest && latestRequest.status === 'AWAITING_REGULATORY_APPROVAL' && (
                      <span style={{ color: '#666', fontSize: '0.9em', textAlign: 'center', width: '100%', display: 'block' }}>Pending Regulatory Review</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {products.length === 0 && (
          <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            No products found
          </p>
        )}

        {/* Pagination Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <button 
            className="nav-button" 
            disabled={page === 1 || loading} 
            onClick={() => { const newPage = page - 1; setPage(newPage); fetchProducts(newPage); }}
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
            onClick={() => { const newPage = page + 1; setPage(newPage); fetchProducts(newPage); }}
            style={{ opacity: (!hasMore || loading) ? 0.5 : 1, cursor: (!hasMore || loading) ? 'not-allowed' : 'pointer' }}
          >
            Next →
          </button>
        </div>
      </div>


      {/* Add Product Modal — hidden for Regulatory */}
      {showModal && isRegulatory && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Product</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>SKU Code *</label>
                <input
                  type="text"
                  value={formData.sku_code}
                  onChange={(e) => setFormData({ ...formData, sku_code: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Product Name *</label>
                <input
                  type="text"
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Country</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Customer</label>
                <input
                  type="text"
                  value={formData.customer}
                  onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Pack Size</label>
                <input
                  type="text"
                  value={formData.pack_size}
                  onChange={(e) => setFormData({ ...formData, pack_size: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Standard Batch Size</label>
                <input
                  type="number"
                  value={formData.standard_batch_size}
                  onChange={(e) => setFormData({ ...formData, standard_batch_size: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>MOQ</label>
                <input
                  type="number"
                  value={formData.moq}
                  onChange={(e) => setFormData({ ...formData, moq: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Artwork Status</label>
                <select
                  value={formData.artwork_status}
                  onChange={(e) => setFormData({ ...formData, artwork_status: e.target.value, primary_pm_code: '', secondary_pm_code: '', leaf_pm_code: '' })}
                >
                  <option value="Available">Available</option>
                  <option value="Pending">Pending</option>
                  <option value="Not Available">Not Available</option>
                </select>
              </div>

              {/* PM Code — only editable if Artwork Status = Available */}
              {formData.artwork_status === 'Available' && (
                <>
                <div className="form-group">
                  <label>Primary PM Code *</label>
                  <input
                    type="text"
                    value={formData.primary_pm_code}
                    onChange={(e) => setFormData({ ...formData, primary_pm_code: e.target.value })}
                    required
                    placeholder="e.g. PM-PARA-500"
                  />
                </div>
                <div className="form-group">
                  <label>Secondary PM Code</label>
                  <input
                    type="text"
                    value={formData.secondary_pm_code}
                    onChange={(e) => setFormData({ ...formData, secondary_pm_code: e.target.value })}
                    placeholder="Optional Secondary PM Code"
                  />
                </div>
                <div className="form-group">
                  <label>Leaf PM Code</label>
                  <input
                    type="text"
                    value={formData.leaf_pm_code}
                    onChange={(e) => setFormData({ ...formData, leaf_pm_code: e.target.value })}
                    placeholder="Optional Leaf PM Code"
                  />
                </div>
                </>
              )}
              {formData.artwork_status !== 'Available' && (
                <>
                <div className="form-group">
                  <label>Primary PM Code</label>
                  <input
                    type="text"
                    value="To be updated by Artwork via Get PM Code workflow"
                    disabled
                    style={{ color: '#999', background: '#f5f5f5' }}
                  />
                </div>
                <div className="form-group">
                  <label>Secondary PM Code</label>
                  <input
                    type="text"
                    value="To be updated by Artwork via Get PM Code workflow"
                    disabled
                    style={{ color: '#999', background: '#f5f5f5' }}
                  />
                </div>
                <div className="form-group">
                  <label>Leaf PM Code</label>
                  <input
                    type="text"
                    value="To be updated by Artwork via Get PM Code workflow"
                    disabled
                    style={{ color: '#999', background: '#f5f5f5' }}
                  />
                </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="submit-button">Add Product</button>
                <button type="button" className="nav-button" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PM Code Update Modal for Regulatory */}
      {pmModal && (
        <div className="modal-overlay" onClick={() => setPmModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Update PM Codes — {pmModal.sku}</h2>
            <div className="form-group">
              <label>Primary PM Code *</label>
              <input
                type="text"
                value={primaryPmCodeInput}
                onChange={(e) => setPrimaryPmCodeInput(e.target.value)}
                placeholder="Enter Primary PM Code"
                required
              />
            </div>
            <div className="form-group">
              <label>Secondary PM Code</label>
              <input
                type="text"
                value={secondaryPmCodeInput}
                onChange={(e) => setSecondaryPmCodeInput(e.target.value)}
                placeholder="Enter Secondary PM Code"
              />
            </div>
            <div className="form-group">
              <label>Leaf PM Code</label>
              <input
                type="text"
                value={leafPmCodeInput}
                onChange={(e) => setLeafPmCodeInput(e.target.value)}
                placeholder="Enter Leaf PM Code"
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button className="submit-button" onClick={handlePmCodeUpdate} disabled={!primaryPmCodeInput.trim()}>
                Save PM Codes
              </button>
              <button className="nav-button" onClick={() => setPmModal(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accept PM Code Modal for Regulatory */}
      {acceptModal && (
        <div className="modal-overlay" onClick={() => { setAcceptModal(null); setAcceptRemarks(''); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Accept PM Code Request</h2>
            <div style={{
              background: '#e8f5e9',
              border: '1px solid #4caf50',
              borderRadius: '6px',
              padding: '12px 16px',
              marginBottom: '16px',
              fontSize: '1em',
              color: '#2e7d32'
            }}>
              Please review the PM Code submitted by the Artwork team:<br/>
              <strong style={{ fontSize: '1.2em', display: 'block', marginTop: '6px' }}>
                Primary: {acceptModal.primaryPmCode || 'N/A'}<br/>
                Secondary: {acceptModal.secondaryPmCode || 'N/A'}<br/>
                Leaf: {acceptModal.leafPmCode || 'N/A'}
              </strong>
            </div>
            <div className="form-group">
              <label>Remarks (Optional)</label>
              <textarea
                value={acceptRemarks}
                onChange={(e) => setAcceptRemarks(e.target.value)}
                placeholder="Enter approval remarks..."
                rows={3}
                style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', padding: '8px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button 
                className="submit-button" 
                style={{ background: '#4caf50', borderColor: '#4caf50' }}
                onClick={() => {
                  handleDecidePmCode(acceptModal.requestId, 'ACCEPT', acceptRemarks);
                  setAcceptModal(null);
                  setAcceptRemarks('');
                }}
              >
                Confirm & Accept
              </button>
              <button className="nav-button" onClick={() => { setAcceptModal(null); setAcceptRemarks(''); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject PM Code Modal for Regulatory */}
      {rejectModal && (
        <div className="modal-overlay" onClick={() => { setRejectModal(null); setRejectRemarks(''); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Reject PM Code Request</h2>
            <div style={{
              background: '#ffebee',
              border: '1px solid #f44336',
              borderRadius: '6px',
              padding: '10px 14px',
              marginBottom: '14px',
              fontSize: '0.9em',
              color: '#c62828'
            }}>
              ⚠️ You are rejecting the PM Code submitted by the Artwork team. Please specify remarks/reasons for rejection. <strong>Remarks are mandatory.</strong>
            </div>
            <div className="form-group">
              <label>Remarks *</label>
              <textarea
                value={rejectRemarks}
                onChange={(e) => setRejectRemarks(e.target.value)}
                placeholder="Enter rejection reasons..."
                rows={4}
                required
                style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', padding: '8px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button 
                className="submit-button" 
                style={{ background: '#f44336', borderColor: '#f44336' }}
                onClick={() => {
                  if (!rejectRemarks.trim()) {
                    alert('Remarks are required for rejection');
                    return;
                  }
                  handleDecidePmCode(rejectModal.requestId, 'REJECT', rejectRemarks);
                  setRejectModal(null);
                  setRejectRemarks('');
                }}
                disabled={!rejectRemarks.trim()}
              >
                Reject PM Code
              </button>
              <button className="nav-button" onClick={() => { setRejectModal(null); setRejectRemarks(''); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit PM Code Modal for Artwork */}
      {artworkSubmitModal && (
        <div className="modal-overlay" onClick={() => { setArtworkSubmitModal(null); setPrimaryPmCodeInput(''); setSecondaryPmCodeInput(''); setLeafPmCodeInput(''); setArtworkRemarks(''); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Submit PM Codes for SKU: {artworkSubmitModal.sku}</h2>
            <div className="form-group">
              <label>Primary PM Code *</label>
              <input
                type="text"
                value={primaryPmCodeInput}
                onChange={(e) => setPrimaryPmCodeInput(e.target.value)}
                placeholder="Enter Primary PM Code (e.g. PM-PARA-500)"
                required
              />
            </div>
            <div className="form-group">
              <label>Secondary PM Code</label>
              <input
                type="text"
                value={secondaryPmCodeInput}
                onChange={(e) => setSecondaryPmCodeInput(e.target.value)}
                placeholder="Enter Secondary PM Code"
              />
            </div>
            <div className="form-group">
              <label>Leaf PM Code</label>
              <input
                type="text"
                value={leafPmCodeInput}
                onChange={(e) => setLeafPmCodeInput(e.target.value)}
                placeholder="Enter Leaf PM Code"
              />
            </div>
            <div className="form-group">
              <label>Remarks (Optional)</label>
              <textarea
                value={artworkRemarks}
                onChange={(e) => setArtworkRemarks(e.target.value)}
                placeholder="Enter any additional details or remarks..."
                rows={3}
                style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', padding: '8px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                className="submit-button"
                onClick={handleArtworkSubmit}
                disabled={!primaryPmCodeInput.trim()}
              >
                Submit to Regulatory
              </button>
              <button className="nav-button" onClick={() => { setArtworkSubmitModal(null); setPrimaryPmCodeInput(''); setSecondaryPmCodeInput(''); setLeafPmCodeInput(''); setArtworkRemarks(''); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModal && (
        <div className="modal-overlay" onClick={() => setHistoryModal(null)}>
          <div className="modal" style={{ maxWidth: '800px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <h2>PM Code Request History — SKU: {historyModal.sku_code}</h2>
            <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Dept</th>
                    <th>Action</th>
                    <th>PM Code</th>
                    <th>Remarks</th>
                    <th>Response Time</th>
                  </tr>
                </thead>
                <tbody>
                  {(historyModal.pm_code_requests?.flatMap((req: any) => req.transactions || []) || [])
                    .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                    .map((tx: any) => (
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
                        <td>{tx.pm_code || '—'}</td>
                        <td>{tx.remarks || '—'}</td>
                        <td>
                          {tx.response_time_days > 0 ? (
                            <span style={{ fontWeight: 'bold', color: '#e65100' }}>
                              {tx.response_time_days} day(s)
                            </span>
                          ) : (
                            <span style={{ color: '#999' }}>&lt; 1 day</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="submit-button" onClick={() => setHistoryModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
