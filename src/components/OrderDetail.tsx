import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderAPI, auditAPI } from '../services/api';
import Header from './Header';

interface OrderDetailProps {
  user: any;
  onLogout: () => void;
}

const OrderDetail: React.FC<OrderDetailProps> = ({ user, onLogout }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [canApproveStatus, setCanApproveStatus] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]); // New auditLogs state
  const [approvalModal, setApprovalModal] = useState(false);
  const [approvalData, setApprovalData] = useState({
    decision: 'APPROVED',
    remarks: '',
    tentative_production_date: '',
    tentative_release_date: '',
    regulatory_action: '', // Add new state for regulatory action
    target_department: '', // New: for SCM override
  });
  const [remarksRequired, setRemarksRequired] = useState(false);
  const [milestoneModal, setMilestoneModal] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<any>(null);
  const [milestoneData, setMilestoneData] = useState({
    status: 'COMPLETED',
    target_date: '',
    actual_date: '',
    remarks: '',
  });
  const [milestoneHistory, setMilestoneHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  useEffect(() => {
    const fetchMilestoneHistory = async () => {
      if (selectedMilestone) {
        try {
          const response = await orderAPI.getMilestoneHistory(selectedMilestone.id);
          setMilestoneHistory(response.data);
        } catch (error) {
          console.error('Error fetching milestone history:', error);
          setMilestoneHistory([]);
        }
      }
    };
    fetchMilestoneHistory();
  }, [selectedMilestone]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getOrder(parseInt(id!));
      setOrder(response.data);
      
      // Fetch audit logs
      try {
        const auditResponse = await auditAPI.getAuditLogs(parseInt(id!));
        setAuditLogs(auditResponse.data);
      } catch (err) {
        console.error('Error fetching audit logs:', err);
      }
      
      // Check if user can approve based on sequential workflow
      await checkCanApprove();
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkCanApprove = async () => {
    try {
      const response = await orderAPI.canApproveOrder(parseInt(id!));
      setCanApproveStatus(response.data);
    } catch (error) {
      console.error('Error checking can approve:', error);
      setCanApproveStatus({ can_approve: false, reason: 'Unable to check approval status' });
    }
  };

  const handleApprovalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Remarks are mandatory for SCM override OR rejection
    const needsRemarks =
      user.department === 'SCM' || approvalData.decision === 'REJECTED';
    if (needsRemarks && !approvalData.remarks.trim()) {
      alert(
        user.department === 'SCM'
          ? 'SCM must provide remarks when overriding an approval.'
          : 'Remarks are mandatory when rejecting an order.'
      );
      return;
    }

    try {
      const submitData = {
        decision: approvalData.decision,
        remarks: approvalData.remarks.trim() || null, // Ensure remarks are trimmed and sent as null if empty
        tentative_production_date: approvalData.tentative_production_date || null,
        tentative_release_date: approvalData.tentative_release_date || null,
        regulatory_action: approvalData.regulatory_action || null,
        target_department: approvalData.target_department || null,
      };
      await orderAPI.approveOrder(parseInt(id!), submitData);
      setApprovalModal(false);
      setApprovalData({
        decision: 'APPROVED',
        remarks: '',
        tentative_production_date: '',
        tentative_release_date: '',
        regulatory_action: '', // Initialize regulatory_action
        target_department: '', // Initialize target_department
      });
      fetchOrder();
    } catch (error: any) {
      console.error('Error submitting approval:', error);
      alert(error.response?.data?.detail || 'Error submitting approval');
    }
  };

  const handleMilestoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSend = {
        ...milestoneData,
        target_date: milestoneData.target_date || null, // Convert empty string to null
        actual_date: milestoneData.actual_date || null, // Convert empty string to null
      };
      await orderAPI.updateMilestone(
        selectedMilestone.id,
        dataToSend
      );
      setMilestoneModal(false);
      fetchOrder();
    } catch (error) {
      console.error('Error updating milestone:', error);
    }
  };

  const getStatusClass = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'REGULATORY_CREATED': 'status-new',
      'PENDING_EXPORTS_MANAGER_APPROVAL': 'status-pending',
      'PENDING_EXPORTS_REVIEW': 'status-hold',
      'EXPORTS_REVIEWED': 'status-accepted',
      'PENDING_REGULATORY_REVISION': 'status-hold',
      'REGULATORY_REVISED': 'status-accepted',
      'PENDING_ARTWORK_PROCESS': 'status-hold',
      'ARTWORK_PROCESSED_AWAITING_REGULATORY': 'status-hold',
      'PENDING_FINANCE_APPROVAL': 'status-hold',
      'FINANCE_APPROVED': 'status-accepted',
      'PENDING_FINAL_EXPORTS_CHECK': 'status-hold',
      'ORDER_FINALIZED': 'status-accepted',
      'REJECTED': 'status-risk',
      'HOLD': 'status-hold',
      'IN_EXECUTION': 'status-execution',
      'AT_RISK': 'status-risk',
      'READY_FOR_SHIPMENT': 'status-shipped',
      'SHIPPED': 'status-shipped',
      'DELIVERED': 'status-delivered',
      // Also keep approval/milestone specific statuses if they are used elsewhere
      'PENDING': 'status-hold',
      'APPROVED': 'status-accepted',
      'APPROVED_WITH_REMARKS': 'status-accepted',
      'COMPLETED': 'status-accepted',
      'IN PROGRESS': 'status-execution',
      'DELAYED': 'status-risk',
    };
    return statusMap[status] || 'status-new';
  };

  // Check if user has any pending approval for this order
  const hasPendingApproval = () => {
    if (!order?.approvals) return false;
    return order.approvals.some(
      (a: any) => a.department === user.department && a.status === 'PENDING'
    );
  };

  // Get approval workflow status message
  const getWorkflowMessage = () => {
    if (!canApproveStatus) return null;
    if (canApproveStatus.can_approve) return null;
    if (canApproveStatus.waiting_for) {
      return `Waiting for ${canApproveStatus.waiting_for.department} to approve first`;
    }
    return canApproveStatus.reason;
  };

  // Check if user can edit order
  // Only Exports Team members (role = 'Team' or 'user') can edit before any approvals start
  const canEditOrder = () => {
    if (!order?.approvals) return false;
    const isExportsTeam =
      user.department === 'Exports' &&
      user.role?.toLowerCase() !== 'manager'; // Team members, not the manager
    if (!isExportsTeam) return false;
    const allPending = order.approvals.every((a: any) => a.status === 'PENDING');
    return allPending;
  };

  // Logistics milestones: ONLY Exports team (user or manager). Management cannot edit.
  // SCM/Artwork milestones: SCM or Management.
  const canUpdateMilestone = (milestoneCategory: string) => {
    if (milestoneCategory === 'Logistics') {
      return user.department === 'Exports'; // Exports team only — no Management override
    }
    if (milestoneCategory === 'SCM' || milestoneCategory === 'Artwork') {
      return user.department === 'SCM' || user.department === 'Management';
    }
    return false;
  };

  // Get sorted approvals by sequence
  const getSortedApprovals = () => {
    if (!order?.approvals) return [];
    return [...order.approvals].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  };

  if (loading) {
    return <div className="loading">Loading order details...</div>;
  }

  if (!order) {
    return <div className="loading">Order not found</div>;
  }

  const workflowMessage = getWorkflowMessage();
  const sortedApprovals = getSortedApprovals();

  return (
    <div className="dashboard-container">
      <Header user={user} onLogout={onLogout} />

      <div className="panel">
        <div className="panel-header">
          <h2>Order Details: {order.order_id}</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            {canEditOrder() && (
              <button className="nav-button" onClick={() => navigate(`/orders/edit/${id}`)}>
                Edit Order
              </button>
            )}
            <button className="nav-button" onClick={() => navigate('/orders')}>
              Back to Orders
            </button>
          </div>
        </div>

        <div className="form-grid">
          <div className="form-section">
            <h3>Order Information</h3>
            <p><strong>Order Number:</strong> {order.order_number}</p>
            <p><strong>Customer:</strong> {order.customer?.customer_name}</p>
            <p><strong>Country:</strong> {order.country}</p>
            <p><strong>PO Number:</strong> {order.po_number}</p>
            <p><strong>PO Date:</strong> {new Date(order.po_date).toLocaleDateString()}</p>
          </div>

          <div className="form-section">
            <h3>Product Information</h3>
            <p><strong>SKU:</strong> {order.sku}</p>
            <p><strong>Product:</strong> {order.product?.product_name}</p>
            <p><strong>Quantity:</strong> {order.quantity}</p>
            <p><strong>Delivery Date:</strong> {new Date(order.requested_delivery_date).toLocaleDateString()}</p>
            <p><strong>Shipping Terms:</strong> {order.shipping_terms || 'N/A'}</p>
          </div>

          <div className="form-section">
            <h3>Status</h3>
            <p>
              <strong>Current Status:</strong>{' '}
              <span className={`status-badge ${getStatusClass(order.status)}`}>
                {order.status}
              </span>
            </p>
            <p>
              <strong>Compliance:</strong>{' '}
              <span className={`status-badge ${order.compliance_status === 'PASSED' ? 'status-accepted' : 'status-risk'}`}>
                {order.compliance_status || 'PENDING'}
              </span>
            </p>
            {order.compliance_remarks && (
              <p><strong>Compliance Remarks:</strong> {order.compliance_remarks}</p>
            )}
          </div>

          <div className="form-section">
            <h3>SCM Planning</h3>
            <p><strong>Tentative Production Date:</strong> {order.tentative_production_date ? new Date(order.tentative_production_date).toLocaleDateString() : 'N/A'}</p>
            <p><strong>Tentative Release Date:</strong> {order.tentative_release_date ? new Date(order.tentative_release_date).toLocaleDateString() : 'N/A'}</p>
          </div>

          {/* Packing Details — visible only for Regulatory department */}
          {user.department === 'Regulatory' && order.product && (
            <div className="form-section" style={{ border: '2px solid #3f51b5', borderRadius: '8px', padding: '16px', background: '#f3f4ff' }}>
              <h3 style={{ color: '#3f51b5', marginTop: 0 }}>📦 Packing Details</h3>
              <p><strong>Pack Size:</strong> {order.product.pack_size || 'N/A'}</p>
              <p><strong>Standard Batch Size:</strong> {order.product.standard_batch_size || 'N/A'}</p>
              <p><strong>MOQ:</strong> {order.product.moq || 'N/A'}</p>
              <p><strong>Primary PM Code:</strong> {order.product.primary_pm_code || <span style={{ color: '#e53935' }}>Not set — update in Products page</span>}</p>
              <p><strong>Secondary PM Code:</strong> {order.product.secondary_pm_code || 'N/A'}</p>
              <p><strong>Leaf PM Code:</strong> {order.product.leaf_pm_code || 'N/A'}</p>
              <p>
                <strong>Artwork Status:</strong>{' '}
                <span className={`status-badge ${
                  order.product.artwork_status === 'Available' ? 'status-accepted' :
                  order.product.artwork_status === 'Pending' ? 'status-hold' : 'status-risk'
                }`}>
                  {order.product.artwork_status || 'N/A'}
                </span>
              </p>
              {order.product.artwork_status !== 'Available' && (
                <p style={{ color: '#e65100', fontSize: '0.9em', marginTop: '8px' }}>
                  ⚠️ PM Code must be set by Regulatory before production can begin.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Workflow Status Banner */}
        {workflowMessage && (
          <div style={{ 
            marginTop: '20px', 
            padding: '15px', 
            backgroundColor: '#fff3cd', 
            border: '1px solid #ffc107',
            borderRadius: '5px',
            color: '#856404'
          }}>
            <strong>Approval Workflow:</strong> {workflowMessage}
          </div>
        )}

        {/* Approvals Section */}
        <div style={{ marginTop: '30px' }}>
          <h3>Department Approvals (Sequential Workflow)</h3>
          <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '10px' }}>
            Flow: <strong>Exports Manager</strong> (1-Initial) → <strong>Regulatory</strong> (2) → <strong>Finance</strong> (3) → <strong>Exports Manager</strong> (4-Final Sign-off)
          </p>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sequence</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Approver</th>
                  <th>Remarks</th>
                  <th>Date</th>
                  <th>Time Taken</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedApprovals.map((approval: any) => {
                  const getDays = () => {
                    if (!approval.approved_at || !order?.created_at) return '-';
                    const diffTime = new Date(approval.approved_at).getTime() - new Date(order.created_at).getTime();
                    const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                    return `${diffDays} day(s)`;
                  };

                  // Detect SCM override from remarks prefix
                  const isScmOverride =
                    approval.remarks && approval.remarks.startsWith('[SCM Override]');

                  // Show Approve/Reject button only on the correct row for this user's turn.
                  // Exports Manager (role='Manager') handles seq 1 (INITIAL) and seq 5 (FINAL).
                  // Other depts handle the row matching their department name.
                  // SCM can override any pending row.
                  const isExportsManagerApproval =
                    approval.department === 'EXPORTS_MANAGER_INITIAL' ||
                    approval.department === 'EXPORTS_MANAGER_FINAL';

                  const isExportsManager =
                    user.department === 'Exports' && user.role?.toLowerCase() === 'manager';

                  const deptMatchesThisRow = isExportsManager
                    ? isExportsManagerApproval && approval.sequence === canApproveStatus?.current_sequence
                    : approval.department.toUpperCase() === user.department.toUpperCase();

                  const showApproveBtn =
                    approval.status === 'PENDING' &&
                    canApproveStatus?.can_approve &&
                    (deptMatchesThisRow || (user.department === 'SCM' && canApproveStatus?.is_scm_override));

                  return (
                  <tr key={approval.id}>
                    <td>{approval.sequence || '-'}</td>
                    <td>
                      <strong>
                      {approval.department === 'EXPORTS_MANAGER_INITIAL' ? '✉ Exports Manager (Initial)' :
                       approval.department === 'EXPORTS_MANAGER_FINAL' ? '✅ Exports Manager (Final Sign-off)' :
                       approval.department === 'REGULATORY' ? '🔬 Regulatory' :
                       approval.department === 'ARTWORK' ? '🎨 Artwork' :
                       approval.department === 'FINANCE' ? '💰 Finance' :
                       approval.department}
                      </strong>
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusClass(approval.status)}`}>
                        {approval.status}
                      </span>
                    </td>
                    <td>
                      {approval.approver?.name
                        ? <span><strong>{approval.approver.name}</strong><br/><small style={{color:'#64748b'}}>{approval.approver.department}</small></span>
                        : <span style={{color:'#94a3b8'}}>—</span>}
                      {isScmOverride && (
                        <span style={{
                          marginLeft: '6px',
                          fontSize: '0.75em',
                          background: '#ff6f00',
                          color: '#fff',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 600
                        }}>SCM Override</span>
                      )}
                    </td>
                    <td>
                      {approval.remarks
                        ? approval.remarks.replace('[SCM Override] ', '')
                        : '—'}
                    </td>
                    <td>{approval.approved_at ? new Date(approval.approved_at).toLocaleDateString() : '—'}</td>
                    <td>{getDays()}</td>
                    <td>
                      {showApproveBtn && (
                        <button
                          className="nav-button"
                          style={canApproveStatus?.is_scm_override ? { background: '#ff6f00', borderColor: '#e65100', color: '#fff' } : {}}
                          onClick={() => setApprovalModal(true)}
                        >
                          {canApproveStatus?.is_scm_override ? '⚡ Override' : '✔ Approve / Reject'}
                        </button>
                      )}
                      {approval.status === 'PENDING' &&
                       !canApproveStatus?.can_approve && (
                        <span style={{ color: '#94a3b8', fontSize: '0.82em' }}>
                          ⏳ Waiting for prior approval
                        </span>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View for Approvals */}
          <div className="mobile-table-cards">
            {sortedApprovals.map((approval: any) => {
              const isScmOverride =
                approval.remarks && approval.remarks.startsWith('[SCM Override]');
              const showApproveBtn =
                approval.status === 'PENDING' &&
                canApproveStatus?.can_approve &&
                (
                  approval.department.toUpperCase() === user.department.toUpperCase() ||
                  (user.department === 'SCM' && canApproveStatus?.is_scm_override) ||
                  (user.department === 'Exports' && user.role === 'manager' &&
                    (approval.department === 'EXPORTS_MANAGER_INITIAL' || approval.department === 'EXPORTS_MANAGER_FINAL'))
                );
              return (
              <div key={approval.id} className="mobile-card">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Sequence</span>
                  <span className="mobile-card-value">{approval.sequence || '-'}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Department</span>
                  <span className="mobile-card-value">
                  {approval.department} {approval.sequence === 1 ? '(Initial)' : approval.sequence === 5 ? '(Final)' : ''}
                  </span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Status</span>
                  <span className="mobile-card-value">
                    <span className={`status-badge ${getStatusClass(approval.status)}`}>
                      {approval.status}
                    </span>
                  </span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Approver</span>
                  <span className="mobile-card-value">
                    {approval.approver?.name || '-'}
                    {isScmOverride && (
                      <span style={{
                        marginLeft: '6px',
                        fontSize: '0.75em',
                        background: '#ff6f00',
                        color: '#fff',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 600
                      }}>SCM Override</span>
                    )}
                  </span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Remarks</span>
                  <span className="mobile-card-value">
                    {approval.remarks ? approval.remarks.replace('[SCM Override] ', '') : '-'}
                  </span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Date</span>
                  <span className="mobile-card-value">
                    {approval.approved_at ? new Date(approval.approved_at).toLocaleDateString() : '-'}
                  </span>
                </div>
                {showApproveBtn && (
                  <div className="mobile-card-row">
                    <button
                      className="nav-button"
                      style={canApproveStatus?.is_scm_override ? { background: '#ff6f00', borderColor: '#e65100', color: '#fff', width: '100%', marginTop: '10px' } : { width: '100%', marginTop: '10px' }}
                      onClick={() => setApprovalModal(true)}
                    >
                      {canApproveStatus?.is_scm_override ? '⚡ Override' : 'Approve'}
                    </button>
                  </div>
                )}
                {approval.status === 'PENDING' &&
                 !canApproveStatus?.can_approve &&
                 approval.department === user.department && (
                  <div className="mobile-card-row">
                    <span style={{ color: '#999', fontSize: '0.85em' }}>
                      Waiting for previous approvals...
                    </span>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </div>

        {/* Milestones Section */}
        <div style={{ marginTop: '30px' }}>
          <h3>Execution Milestones</h3>
          
          {['Artwork', 'SCM', 'Logistics'].map((category) => (
            <div key={category} style={{ marginBottom: '20px' }}>
              <h4>{category}</h4>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Milestone</th>
                      <th>Status</th>
                      <th>Target Date</th>
                      <th>Actual Date</th>
                      <th>Remarks</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.milestones
                      ?.filter((m: any) => m.category === category)
                      .map((milestone: any) => (
                        <tr key={milestone.id}>
                          <td>{milestone.name}</td>
                          <td>
                            <span className={`status-badge ${getStatusClass(milestone.status)}`}>
                              {milestone.status}
                            </span>
                          </td>
                          <td>{milestone.target_date ? new Date(milestone.target_date).toLocaleDateString() : '-'}</td>
                          <td>{milestone.actual_date ? new Date(milestone.actual_date).toLocaleDateString() : '-'}</td>
                          <td>{milestone.remarks || '-'}</td>
                          <td>
                            {canUpdateMilestone(category) ? (
                              <button
                                className="nav-button"
                                onClick={() => {
                                  setSelectedMilestone(milestone);
                                  setMilestoneModal(true);
                                }}
                              >
                                Update
                              </button>
                            ) : (
                              <span style={{ color: '#999', fontSize: '0.85em' }}>View Only</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View for Milestones */}
              <div className="mobile-table-cards">
                {order.milestones
                  ?.filter((m: any) => m.category === category)
                  .map((milestone: any) => (
                    <div key={milestone.id} className="mobile-card">
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">Milestone</span>
                        <span className="mobile-card-value">{milestone.name}</span>
                      </div>
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">Status</span>
                        <span className="mobile-card-value">
                          <span className={`status-badge ${getStatusClass(milestone.status)}`}>
                            {milestone.status}
                          </span>
                        </span>
                      </div>
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">Target Date</span>
                        <span className="mobile-card-value">
                          {milestone.target_date ? new Date(milestone.target_date).toLocaleDateString() : '-'}
                        </span>
                      </div>
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">Actual Date</span>
                        <span className="mobile-card-value">
                          {milestone.actual_date ? new Date(milestone.actual_date).toLocaleDateString() : '-'}
                        </span>
                      </div>
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">Remarks</span>
                        <span className="mobile-card-value">{milestone.remarks || '-'}</span>
                      </div>
                      <div className="mobile-card-row">
                        {canUpdateMilestone(category) ? (
                          <button
                            className="nav-button"
                            onClick={() => {
                              setSelectedMilestone(milestone);
                              setMilestoneModal(true);
                            }}
                            style={{ width: '100%', marginTop: '10px' }}
                          >
                            Update
                          </button>
                        ) : (
                          <span style={{ color: '#999', fontSize: '0.85em' }}>View Only</span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Audit Trail Section */}
        <div style={{ marginTop: '30px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
          <h3>Order Audit Trail & Update History</h3>
          <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '15px' }}>
            Detailed logs of all updates, approvals, status changes, and milestones.
          </p>
          {auditLogs.length === 0 ? (
            <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>No audit logs recorded for this order.</p>
          ) : (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px',
              maxHeight: '400px',
              overflowY: 'auto',
              paddingRight: '10px'
            }}>
              {auditLogs.map((log: any) => (
                <div key={log.id} style={{
                  padding: '14px 16px',
                  background: '#f8fafc',
                  borderLeft: '4px solid #3b82f6',
                  borderRadius: '0 8px 8px 0',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.95rem' }}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '0.88rem', color: '#334155', marginBottom: '6px' }}>
                    <strong>User:</strong> {log.user ? `${log.user.name} (${log.user.department})` : 'System'}
                  </div>

                  {log.remarks && (
                    <div style={{ fontSize: '0.88rem', color: '#475569', background: '#f1f5f9', padding: '6px 10px', borderRadius: '4px', fontStyle: 'italic' }}>
                      &ldquo;{log.remarks}&rdquo;
                    </div>
                  )}

                  {(log.previous_status || log.new_status) && (
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span>Status transition:</span>
                      {log.previous_status && <span className="status-badge status-hold" style={{ fontSize: '0.75rem', padding: '2px 6px' }}>{log.previous_status}</span>}
                      {log.previous_status && <span>&rarr;</span>}
                      {log.new_status && <span className="status-badge status-accepted" style={{ fontSize: '0.75rem', padding: '2px 6px' }}>{log.new_status}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Approval Modal */}
      {approvalModal && (
        <div className="modal-overlay" onClick={() => setApprovalModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>
              {canApproveStatus?.is_scm_override
                ? `⚡ SCM Override — ${canApproveStatus?.pending_department || ''} Approval`
                : canApproveStatus?.is_exports_override
                ? `⭐ Exports Manager Override — ${canApproveStatus?.pending_department || ''} Approval`
                : 'Submit Approval'}
            </h2>
            {canApproveStatus?.is_scm_override && (
              <div style={{
                background: '#fff3e0',
                border: '1px solid #ff6f00',
                borderRadius: '6px',
                padding: '10px 14px',
                marginBottom: '14px',
                fontSize: '0.9em',
                color: '#e65100'
              }}>
                ⚠️ You are overriding the <strong>{canApproveStatus?.pending_department}</strong> department approval as SCM.
                This action will be recorded in the audit trail. <strong>Remarks are mandatory.</strong>
              </div>
            )}

            {canApproveStatus?.is_exports_override && (
              <div style={{
                background: '#e0f7fa',
                border: '1px solid #00bcd4',
                borderRadius: '6px',
                padding: '10px 14px',
                marginBottom: '14px',
                fontSize: '0.9em',
                color: '#00838f'
              }}>
                ⭐ As an Exports Manager, you are approving the <strong>{canApproveStatus?.pending_department}</strong> approval.
                This action will be recorded in the audit trail.
              </div>
            )}
            <form onSubmit={handleApprovalSubmit}>
              <div className="form-group">
                <label>Decision</label>
                <select
                  value={approvalData.decision}
                  onChange={(e) => setApprovalData({ ...approvalData, decision: e.target.value })}
                >
                  <option value="APPROVED">Approve</option>
                  <option value="APPROVED_WITH_REMARKS">Approve with Remarks</option>
                  <option value="REJECTED">Reject</option>
                </select>
              </div>

              {user.department === 'SCM' && (
                <div className="form-group">
                  <label htmlFor="targetDepartment">Override Department</label>
                  <select
                    id="targetDepartment"
                    value={approvalData.target_department}
                    onChange={(e) => setApprovalData({ ...approvalData, target_department: e.target.value })}
                  >
                    <option value="">Select Department to Override</option>
                    {order?.approvals.map((approval: any) => (
                      <option key={approval.id} value={approval.department}>
                        {approval.department} (Current Status: {approval.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>
                  Remarks
                  {(user.department === 'SCM' || approvalData.decision === 'REJECTED') && (
                    <span style={{ color: '#e53935', marginLeft: '4px' }}>* (Required)</span>
                  )}
                </label>
                <textarea
                  value={approvalData.remarks}
                  onChange={(e) => setApprovalData({ ...approvalData, remarks: e.target.value })}
                  rows={3}
                  placeholder={user.department === 'SCM' ? 'Enter reason for SCM override...' : 'Optional remarks'}
                />
              </div>



              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="submit-button"
                  style={canApproveStatus?.is_scm_override ? { background: '#ff6f00' } : {}}>
                  {canApproveStatus?.is_scm_override ? '⚡ Confirm Override' : 'Submit'}
                </button>
                <button type="button" className="nav-button" onClick={() => setApprovalModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Milestone Modal */}
      {milestoneModal && selectedMilestone && (
        <div className="modal-overlay" onClick={() => setMilestoneModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Update Milestone: {selectedMilestone.name}</h2>
            <form onSubmit={handleMilestoneSubmit}>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={milestoneData.status}
                  onChange={(e) => setMilestoneData({ ...milestoneData, status: e.target.value })}
                >
                  <option value="PENDING">Pending</option>
                  <option value="IN PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="DELAYED">Delayed</option>
                </select>
              </div>

              <div className="form-group">
                <label>Target Date</label>
                <input
                  type="date"
                  value={milestoneData.target_date}
                  onChange={(e) => setMilestoneData({ ...milestoneData, target_date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Actual Date</label>
                <input
                  type="date"
                  value={milestoneData.actual_date}
                  onChange={(e) => setMilestoneData({ ...milestoneData, actual_date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Remarks</label>
                <textarea
                  value={milestoneData.remarks}
                  onChange={(e) => setMilestoneData({ ...milestoneData, remarks: e.target.value })}
                  rows={3}
                />
              </div>

              {milestoneHistory.length > 0 && (
                <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                  <h3>Milestone History</h3>
                  <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '5px', padding: '10px' }}>
                    {milestoneHistory.map((entry: any) => (
                      <div key={entry.id} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px dotted #eee' }}>
                        <p style={{ margin: 0, fontWeight: 'bold' }}>
                          {new Date(entry.changed_at).toLocaleString()} - {entry.changed_by?.name || 'Unknown User'}
                        </p>
                        <p style={{ margin: '5px 0 0 0', fontSize: '0.9em' }}>
                          <strong>Type:</strong> {entry.change_type}
                        </p>
                        <p style={{ margin: '0 0 0 0', fontSize: '0.9em' }}>
                          <strong>Old Value:</strong> {entry.old_value ? new Date(entry.old_value).toLocaleDateString() : 'N/A'}
                        </p>
                        <p style={{ margin: '0 0 0 0', fontSize: '0.9em' }}>
                          <strong>New Value:</strong> {entry.new_value ? new Date(entry.new_value).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="submit-button">Update</button>
                <button type="button" className="nav-button" onClick={() => setMilestoneModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;
