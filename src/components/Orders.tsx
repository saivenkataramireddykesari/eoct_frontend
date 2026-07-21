import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderAPI } from '../services/api';
import Header from './Header';

interface OrdersProps {
  user: any;
  onLogout: () => void;
}

const Orders: React.FC<OrdersProps> = ({ user, onLogout }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [hasMore, setHasMore] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setPage(1);
    fetchOrders(1);
  }, [statusFilter]);

  const fetchOrders = async (p: number = page) => {
    try {
      setLoading(true);
      const skip = (p - 1) * pageSize;
      const response = await orderAPI.getOrders(statusFilter || undefined, skip, pageSize);
      setOrders(response.data);
      setHasMore(response.data.length === pageSize);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };


  const getStatusClass = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'REGULATORY_CREATED': 'status-new',
      'PENDING_EXPORTS_MANAGER_APPROVAL': 'status-pending',
      'PENDING_EXPORTS_REVIEW': 'status-pending',
      'EXPORTS_REVIEWED': 'status-approved',
      'PENDING_REGULATORY_REVISION': 'status-pending',
      'REGULATORY_REVISED': 'status-approved',
      'PENDING_ARTWORK_PROCESS': 'status-pending',
      'ARTWORK_PROCESSED_AWAITING_REGULATORY': 'status-pending',
      'PENDING_FINANCE_APPROVAL': 'status-pending',
      'FINANCE_APPROVED': 'status-approved',
      'PENDING_FINAL_EXPORTS_CHECK': 'status-pending',
      'ORDER_FINALIZED': 'status-accepted',
      'REJECTED': 'status-rejected',
      'HOLD': 'status-hold',
      'IN_EXECUTION': 'status-execution',
      'AT_RISK': 'status-risk',
      'READY_FOR_SHIPMENT': 'status-shipped',
      'SHIPPED': 'status-shipped',
      'DELIVERED': 'status-delivered',
    };
    return statusMap[status] || 'status-new';
  };

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'REGULATORY_CREATED', label: 'Regulatory Created' },
    { value: 'PENDING_EXPORTS_MANAGER_APPROVAL', label: 'Pending Exports Manager Approval' },
    { value: 'PENDING_EXPORTS_REVIEW', label: 'Pending Exports Review' },
    { value: 'EXPORTS_REVIEWED', label: 'Exports Reviewed' },
    { value: 'PENDING_REGULATORY_REVISION', label: 'Pending Regulatory Revision' },
    { value: 'REGULATORY_REVISED', label: 'Regulatory Revised' },
    { value: 'PENDING_ARTWORK_PROCESS', label: 'Pending Artwork Process' },
    { value: 'ARTWORK_PROCESSED_AWAITING_REGULATORY', label: 'Artwork Processed Awaiting Regulatory' },
    { value: 'PENDING_FINANCE_APPROVAL', label: 'Pending Finance Approval' },
    { value: 'FINANCE_APPROVED', label: 'Finance Approved' },
    { value: 'PENDING_FINAL_EXPORTS_CHECK', label: 'Pending Final Exports Check' },
    { value: 'ORDER_FINALIZED', label: 'Order Finalized' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'HOLD', label: 'On Hold' },
    { value: 'IN_EXECUTION', label: 'In Execution' },
    { value: 'AT_RISK', label: 'At Risk' },
    { value: 'READY_FOR_SHIPMENT', label: 'Ready for Shipment' },
    { value: 'SHIPPED', label: 'Shipped' },
    { value: 'DELIVERED', label: 'Delivered' },
  ];

  if (loading) {
    return <div className="loading">Loading orders...</div>;
  }

  return (
    <div className="dashboard-container">
      <Header user={user} onLogout={onLogout} />

      <div className="panel">
        <div className="panel-header">
          <h2>Orders</h2>
          {user.department === 'Exports' && (
            <button
              className="submit-button"
              onClick={() => navigate('/orders/create')}
            >
              + Create New Order
            </button>
          )}
        </div>

        <div className="filter-section">
          <label>Filter by Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Desktop Table View */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Order Number</th>
                <th>Customer</th>
                <th>Country</th>
                <th>SKU</th>
                <th>Quantity</th>
                <th>Delivery Date</th>
                <th>Status</th>
                <th>Compliance</th>
                <th>Price</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => navigate(`/orders/${order.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>{order.order_id}</td>
                  <td>{order.order_number}</td>
                  <td>{order.customer?.customer_name}</td>
                  <td>{order.country}</td>
                  <td>{order.sku}</td>
                  <td>{order.quantity}</td>
                  <td>{new Date(order.requested_delivery_date).toLocaleDateString()}</td>
                  <td>
                    <span className={`status-badge ${getStatusClass(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`status-badge ${
                        order.compliance_status === 'PASSED' ? 'status-accepted' : 'status-risk'
                      }`}
                    >
                      {order.compliance_status || 'PENDING'}
                    </span>
                  </td>
                  <td>{order.price}</td>
                  <td>{new Date(order.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="mobile-table-cards">
          {orders.map((order) => (
            <div
              key={order.id}
              className="mobile-card"
              onClick={() => navigate(`/orders/${order.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <div className="mobile-card-row">
                <span className="mobile-card-label">Order ID</span>
                <span className="mobile-card-value">{order.order_id}</span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Order Number</span>
                <span className="mobile-card-value">{order.order_number}</span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Customer</span>
                <span className="mobile-card-value">{order.customer?.customer_name}</span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Country</span>
                <span className="mobile-card-value">{order.country}</span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">SKU</span>
                <span className="mobile-card-value">{order.sku}</span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Quantity</span>
                <span className="mobile-card-value">{order.quantity}</span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Price</span>
                <span className="mobile-card-value">{order.price}</span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Delivery Date</span>
                <span className="mobile-card-value">
                  {new Date(order.requested_delivery_date).toLocaleDateString()}
                </span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Status</span>
                <span className="mobile-card-value">
                  <span className={`status-badge ${getStatusClass(order.status)}`}>
                    {order.status}
                  </span>
                </span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Compliance</span>
                <span className="mobile-card-value">
                  <span
                    className={`status-badge ${
                      order.compliance_status === 'PASSED' ? 'status-accepted' : 'status-risk'
                    }`}
                  >
                    {order.compliance_status || 'PENDING'}
                  </span>
                </span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Created</span>
                <span className="mobile-card-value">
                  {new Date(order.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>

        {orders.length === 0 && (
          <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            No orders found
          </p>
        )}

        {/* Pagination Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <button 
            className="nav-button" 
            disabled={page === 1 || loading} 
            onClick={() => { const newPage = page - 1; setPage(newPage); fetchOrders(newPage); }}
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
            onClick={() => { const newPage = page + 1; setPage(newPage); fetchOrders(newPage); }}
            style={{ opacity: (!hasMore || loading) ? 0.5 : 1, cursor: (!hasMore || loading) ? 'not-allowed' : 'pointer' }}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
};


export default Orders;
