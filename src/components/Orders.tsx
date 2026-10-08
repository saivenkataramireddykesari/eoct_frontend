import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { orderAPI, productAPI } from '../services/api';
import Header from './Header';
import { formatDate } from '../utils/dateUtils';
import { useExcelTableFilter } from './useExcelTableFilter';
import { ExcelHeaderCell, ExcelActiveFiltersBar } from './ExcelHeaderCell';

interface OrdersProps {
  user: any;
  onLogout: () => void;
}

const Orders: React.FC<OrdersProps> = ({ user, onLogout }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [productTypeFilter, setProductTypeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [hasMore, setHasMore] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('search') || params.get('query');
    if (q) {
      setSearchTerm(q);
    }
  }, [location.search]);

  useEffect(() => {
    setPage(1);
    fetchOrders(1);
  }, [statusFilter, productTypeFilter]);

  const fetchOrders = async (p: number = page) => {
    try {
      setLoading(true);
      const skip = (p - 1) * pageSize;
      const response = await orderAPI.getOrders(statusFilter || undefined, productTypeFilter || undefined, skip, pageSize);
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

  const handleRequestPmCode = async (e: React.MouseEvent, order: any) => {
    e.stopPropagation();
    const sku = order.sku || order.product?.sku_code;
    if (!sku) {
      alert('SKU is not available for this order.');
      return;
    }

    try {
      setLoading(true);
      await productAPI.requestPmCode(sku);
      alert(`PM Code request submitted successfully for SKU: ${sku}`);
      await fetchOrders(page);
    } catch (error: any) {
      console.error('Error requesting PM Code:', error);
      alert(
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        'Failed to request PM Code.'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderPmCodeAction = (order: any) => {
    const product = order.product;
    const sku = order.sku || product?.sku_code;
    const primaryPmCode = product?.primary_pm_code;
    const requests = product?.pm_code_requests || [];
    const latestRequest = requests.length > 0 ? requests[requests.length - 1] : null;
    const artworkStatus = product?.artwork_status;

    if (primaryPmCode) {
      return (
        <span style={{ fontWeight: 600, color: '#2e7d32', fontSize: '0.88rem' }}>
          {primaryPmCode}
        </span>
      );
    }

    if (latestRequest) {
      if (latestRequest.status === 'PENDING_ARTWORK') {
        return (
          <span className="status-badge status-hold" style={{ fontSize: '0.8rem' }}>
            Awaiting Artwork
          </span>
        );
      }
      if (latestRequest.status === 'AWAITING_REGULATORY_APPROVAL') {
        return (
          <span className="status-badge status-new" style={{ fontSize: '0.8rem' }}>
            Awaiting Approval
          </span>
        );
      }
    }

    const isRegulatory = user?.department === 'Regulatory';
    const showGetButton = isRegulatory && !!sku && artworkStatus !== 'Available' && (!latestRequest || latestRequest.status === 'APPROVED' || latestRequest.status === 'REJECTED');

    if (showGetButton) {
      return (
        <button
          className="submit-button"
          style={{ padding: '4px 10px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
          onClick={(e) => handleRequestPmCode(e, order)}
        >
          Get PM Code
        </button>
      );
    }

    return '—';
  };

  const filteredOrders = orders.filter((order) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (order.order_id && String(order.order_id).toLowerCase().includes(term)) ||
      (order.order_number && order.order_number.toLowerCase().includes(term)) ||
      (order.customer?.customer_name && order.customer.customer_name.toLowerCase().includes(term)) ||
      (order.country?.name && order.country.name.toLowerCase().includes(term)) ||
      (order.sku && order.sku.toLowerCase().includes(term)) ||
      (order.status && order.status.toLowerCase().includes(term)) ||
      (order.compliance_status && order.compliance_status.toLowerCase().includes(term))
    );
  });

  const columnAccessors = useMemo(() => ({
    order_number: (o: any) => o.order_number || '-',
    customer: (o: any) => o.customer?.customer_name || '-',
    country: (o: any) => o.country?.name || '-',
    product_name: (o: any) => o.product?.product_name || o.product_name || '-',
    category: (o: any) => o.product?.category || '-',
    quantity: (o: any) => o.quantity ?? '-',
    delivery_date: (o: any) => formatDate(o.requested_delivery_date),
    status: (o: any) => o.status || '-',
    compliance: (o: any) => o.compliance_status || 'PENDING',
    price: (o: any) => o.price ?? '-',
    pm_code: (o: any) => o.primary_pm_code || o.pm_code || '-',
    created: (o: any) => formatDate(o.created_at),
  }), []);

  const {
    filteredAndSortedData: excelFilteredOrders,
    filterState,
    sortState,
    uniqueValuesMap,
    setColumnFilter,
    handleSort,
    clearColumnFilter,
    clearAllFilters,
    activeFilterCount,
  } = useExcelTableFilter(filteredOrders, columnAccessors);

  if (loading) {
    return <div className="loading">Loading orders...</div>;
  }

  return (
    <div className="main-container">
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

        <div className="filter-section" style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>

          <div>
            <label style={{ marginRight: '8px' }}>Filter by Status:</label>
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

          {user.department === 'SCM' && (
            <div>
              <label style={{ marginRight: '8px' }}>Filter by Product Type:</label>
              <select
                value={productTypeFilter}
                onChange={(e) => setProductTypeFilter(e.target.value)}
              >
                <option value="">All Product Types</option>
                <option value="PP">PP</option>
              </select>
            </div>
          )}
        </div>

        <ExcelActiveFiltersBar
          activeCount={activeFilterCount}
          isSorted={!!sortState.direction}
          onClearAll={clearAllFilters}
        />

        {/* Desktop Table View */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <ExcelHeaderCell
                    columnKey="order_number"
                    label="Order Number"
                    uniqueValues={uniqueValuesMap.order_number}
                    selectedValues={filterState.order_number}
                    sortDirection={sortState.columnKey === 'order_number' ? sortState.direction : null}
                    onFilterChange={(sel) => setColumnFilter('order_number', sel)}
                    onSortChange={(dir) => handleSort('order_number', dir)}
                    onClearFilter={() => clearColumnFilter('order_number')}
                  />
                </th>
                <th>
                  <ExcelHeaderCell
                    columnKey="customer"
                    label="Customer"
                    uniqueValues={uniqueValuesMap.customer}
                    selectedValues={filterState.customer}
                    sortDirection={sortState.columnKey === 'customer' ? sortState.direction : null}
                    onFilterChange={(sel) => setColumnFilter('customer', sel)}
                    onSortChange={(dir) => handleSort('customer', dir)}
                    onClearFilter={() => clearColumnFilter('customer')}
                  />
                </th>
                <th>
                  <ExcelHeaderCell
                    columnKey="country"
                    label="Country"
                    uniqueValues={uniqueValuesMap.country}
                    selectedValues={filterState.country}
                    sortDirection={sortState.columnKey === 'country' ? sortState.direction : null}
                    onFilterChange={(sel) => setColumnFilter('country', sel)}
                    onSortChange={(dir) => handleSort('country', dir)}
                    onClearFilter={() => clearColumnFilter('country')}
                  />
                </th>
                <th>
                  <ExcelHeaderCell
                    columnKey="product_name"
                    label="Product Name"
                    uniqueValues={uniqueValuesMap.product_name}
                    selectedValues={filterState.product_name}
                    sortDirection={sortState.columnKey === 'product_name' ? sortState.direction : null}
                    onFilterChange={(sel) => setColumnFilter('product_name', sel)}
                    onSortChange={(dir) => handleSort('product_name', dir)}
                    onClearFilter={() => clearColumnFilter('product_name')}
                  />
                </th>
                <th>
                  <ExcelHeaderCell
                    columnKey="category"
                    label="Manufacturing Unit"
                    uniqueValues={uniqueValuesMap.category}
                    selectedValues={filterState.category}
                    sortDirection={sortState.columnKey === 'category' ? sortState.direction : null}
                    onFilterChange={(sel) => setColumnFilter('category', sel)}
                    onSortChange={(dir) => handleSort('category', dir)}
                    onClearFilter={() => clearColumnFilter('category')}
                  />
                </th>
                <th>
                  <ExcelHeaderCell
                    columnKey="quantity"
                    label="Quantity"
                    uniqueValues={uniqueValuesMap.quantity}
                    selectedValues={filterState.quantity}
                    sortDirection={sortState.columnKey === 'quantity' ? sortState.direction : null}
                    onFilterChange={(sel) => setColumnFilter('quantity', sel)}
                    onSortChange={(dir) => handleSort('quantity', dir)}
                    onClearFilter={() => clearColumnFilter('quantity')}
                  />
                </th>
                <th>
                  <ExcelHeaderCell
                    columnKey="delivery_date"
                    label="Delivery Date"
                    uniqueValues={uniqueValuesMap.delivery_date}
                    selectedValues={filterState.delivery_date}
                    sortDirection={sortState.columnKey === 'delivery_date' ? sortState.direction : null}
                    onFilterChange={(sel) => setColumnFilter('delivery_date', sel)}
                    onSortChange={(dir) => handleSort('delivery_date', dir)}
                    onClearFilter={() => clearColumnFilter('delivery_date')}
                  />
                </th>
                <th>
                  <ExcelHeaderCell
                    columnKey="status"
                    label="Status"
                    uniqueValues={uniqueValuesMap.status}
                    selectedValues={filterState.status}
                    sortDirection={sortState.columnKey === 'status' ? sortState.direction : null}
                    onFilterChange={(sel) => setColumnFilter('status', sel)}
                    onSortChange={(dir) => handleSort('status', dir)}
                    onClearFilter={() => clearColumnFilter('status')}
                  />
                </th>
                <th>
                  <ExcelHeaderCell
                    columnKey="compliance"
                    label="Compliance"
                    uniqueValues={uniqueValuesMap.compliance}
                    selectedValues={filterState.compliance}
                    sortDirection={sortState.columnKey === 'compliance' ? sortState.direction : null}
                    onFilterChange={(sel) => setColumnFilter('compliance', sel)}
                    onSortChange={(dir) => handleSort('compliance', dir)}
                    onClearFilter={() => clearColumnFilter('compliance')}
                  />
                </th>
                <th>
                  <ExcelHeaderCell
                    columnKey="price"
                    label="Price"
                    uniqueValues={uniqueValuesMap.price}
                    selectedValues={filterState.price}
                    sortDirection={sortState.columnKey === 'price' ? sortState.direction : null}
                    onFilterChange={(sel) => setColumnFilter('price', sel)}
                    onSortChange={(dir) => handleSort('price', dir)}
                    onClearFilter={() => clearColumnFilter('price')}
                  />
                </th>
                <th>
                  <ExcelHeaderCell
                    columnKey="pm_code"
                    label="PM Code"
                    uniqueValues={uniqueValuesMap.pm_code}
                    selectedValues={filterState.pm_code}
                    sortDirection={sortState.columnKey === 'pm_code' ? sortState.direction : null}
                    onFilterChange={(sel) => setColumnFilter('pm_code', sel)}
                    onSortChange={(dir) => handleSort('pm_code', dir)}
                    onClearFilter={() => clearColumnFilter('pm_code')}
                  />
                </th>
                <th>
                  <ExcelHeaderCell
                    columnKey="created"
                    label="Created"
                    uniqueValues={uniqueValuesMap.created}
                    selectedValues={filterState.created}
                    sortDirection={sortState.columnKey === 'created' ? sortState.direction : null}
                    onFilterChange={(sel) => setColumnFilter('created', sel)}
                    onSortChange={(dir) => handleSort('created', dir)}
                    onClearFilter={() => clearColumnFilter('created')}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {excelFilteredOrders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => navigate(`/orders/${order.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>{order.order_number}</td>
                  <td>{order.customer?.customer_name}</td>
                  <td>{order.country?.name || "-"}</td>
                  <td>{order.product?.product_name || order.product_name || "-"}</td>
                  <td>{order.product?.category || "-"}</td>
                  <td>{order.quantity}</td>
                  <td>{formatDate(order.requested_delivery_date)}</td>
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
                  <td>{renderPmCodeAction(order)}</td>
                  <td>{formatDate(order.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="mobile-table-cards">
          {excelFilteredOrders.map((order) => (
            <div
              key={order.id}
              className="mobile-card"
              onClick={() => navigate(`/orders/${order.id}`)}
              style={{ cursor: 'pointer' }}
            >
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
                <span className="mobile-card-value">{order.country?.name || "-"}</span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Product Name</span>
                <span className="mobile-card-value">{order.product?.product_name || order.product_name || "-"}</span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Category</span>
                <span className="mobile-card-value">{order.product?.category || "-"}</span>
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
                  {formatDate(order.requested_delivery_date)}
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
                <span className="mobile-card-label">PM Code</span>
                <span className="mobile-card-value" onClick={(e) => e.stopPropagation()}>
                  {renderPmCodeAction(order)}
                </span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Created</span>
                <span className="mobile-card-value">
                  {formatDate(order.created_at)}
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
