import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../services/api';
import Header from './Header';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await dashboardAPI.getDashboard();
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'NEW ORDER': 'status-new',
      'HOLD': 'status-hold',
      'ORDER ACCEPTED': 'status-accepted',
      'IN EXECUTION': 'status-execution',
      'AT RISK': 'status-risk',
      'READY FOR SHIPMENT': 'status-shipped',
      'SHIPPED': 'status-shipped',
      'DELIVERED': 'status-delivered',
    };
    return statusMap[status] || 'status-new';
  };

  const renderStats = () => {
    if (!dashboardData) return null;
    
    const { stats } = dashboardData;
    const userDept = user.department;

    let statCards = [];

    if (userDept === 'Exports') {
      statCards = [
        { label: 'New Orders', value: stats.new_orders, class: '' },
        { label: 'Pending Approval', value: stats.pending_approval, class: 'warning' },
        { label: 'Accepted', value: stats.accepted, class: 'success' },
        { label: 'In Execution', value: stats.in_execution, class: '' },
        { label: 'Ready for Shipment', value: stats.ready_shipment, class: '' },
        { label: 'Shipped', value: stats.shipped, class: '' },
        { label: 'Delivered', value: stats.delivered, class: 'success' },
        { label: 'At Risk', value: stats.at_risk, class: 'danger' },
      ];
    } else if (userDept === 'Regulatory') {
      statCards = [
        { label: 'Expiring Registrations', value: stats.expiring_registrations, class: 'warning' },
        { label: 'Missing Certificates', value: stats.missing_certificates, class: 'danger' },
        { label: 'Pending Approvals', value: stats.pending_approvals, class: '' },
      ];
    } else if (userDept === 'Management') {
      statCards = [
        { label: 'Open Orders', value: stats.open_orders, class: '' },
        { label: 'At Risk', value: stats.at_risk, class: 'danger' },
        { label: 'Delayed', value: stats.delayed, class: 'danger' },
        { label: 'On-Time Deliveries', value: `${stats.on_time_deliveries}/${stats.total_delivered}`, class: 'success' },
        { label: 'Compliance Issues', value: stats.compliance_issues, class: 'warning' },
      ];
    } else {
      statCards = [
        { label: 'Pending Approvals', value: stats.pending_approvals || 0, class: '' },
      ];
    }

    return (
      <div className="stats-grid">
        {statCards.map((stat, index) => (
          <div key={index} className={`stat-card ${stat.class}`}>
            <h3>{stat.label}</h3>
            <div className="stat-value">{stat.value}</div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard-container">
      <Header user={user} onLogout={onLogout} />
      
      {renderStats()}

      <div className="content-grid">
        <div className="panel">
          <h2>Recent Orders</h2>
          {/* Desktop Table View */}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>SKU</th>
                  {user.department === 'Exports' && <th>Package Size</th>}
                  <th>Quantity</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData?.recent_orders?.map((order: any) => (
                  <tr key={order.id} onClick={() => navigate(`/orders/${order.id}`)} style={{ cursor: 'pointer' }}>
                    <td>{order.order_id}</td>
                    <td>{order.customer?.customer_name}</td>
                    <td>{order.sku}</td>
                    {user.department === 'Exports' && <td>{order.product?.pack_size || '-'}</td>}
                    <td>{order.quantity}</td>
                    <td>
                      <span className={`status-badge ${getStatusClass(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>{new Date(order.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile Card View */}
          <div className="mobile-table-cards">
            {dashboardData?.recent_orders?.map((order: any) => (
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
                  <span className="mobile-card-label">Customer</span>
                  <span className="mobile-card-value">{order.customer?.customer_name}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">SKU</span>
                  <span className="mobile-card-value">{order.sku}</span>
                </div>
                {user.department === 'Exports' && (
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Package Size</span>
                    <span className="mobile-card-value">{order.product?.pack_size || '-'}</span>
                  </div>
                )}
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Quantity</span>
                  <span className="mobile-card-value">{order.quantity}</span>
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
                  <span className="mobile-card-label">Created</span>
                  <span className="mobile-card-value">{new Date(order.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>Alerts</h2>
          {dashboardData?.alerts?.length === 0 ? (
            <p>No unread alerts</p>
          ) : (
            dashboardData?.alerts?.map((alert: any) => (
              <div key={alert.id} className={`alert-item ${alert.priority.toLowerCase()}`}>
                <p>{alert.message}</p>
                <small>{new Date(alert.created_at).toLocaleString()}</small>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
