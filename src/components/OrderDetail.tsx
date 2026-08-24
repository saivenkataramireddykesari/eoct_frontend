import React, { useState, useEffect, useRef } from 'react';
import { IMilestone, IOrder, IApproval, IUser, IAuditLog, IMilestoneHistoryEntry } from '../types';
import { useParams, useNavigate } from 'react-router-dom';
import { orderAPI, auditAPI } from '../services/api';
import Header from './Header';

interface OrderDetailProps {
  user: IUser;
  onLogout: () => void;
}

const OrderDetail: React.FC<OrderDetailProps> = ({ user, onLogout }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<IOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [canApproveStatus, setCanApproveStatus] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<IAuditLog[]>([]); // New auditLogs state
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
  const [selectedMilestone, setSelectedMilestone] = useState<IMilestone | null>(null);
  const [milestoneData, setMilestoneData] = useState({
    status: 'COMPLETED',
    target_date: '',
    actual_date: '',
    remarks: '',
  });
  const [milestoneHistory, setMilestoneHistory] = useState<IMilestoneHistoryEntry[]>([]);
  const [showMilestoneHistoryModal, setShowMilestoneHistoryModal] = useState(false);
  const [bulkTargetModal, setBulkTargetModal] = useState(false);
  // Keyed by NORMALIZED milestone NAME — works even when the milestone doesn't exist in DB yet
  const [bulkTargetDates, setBulkTargetDates] = useState<Record<string, string>>({});
  const [bulkMilestoneIds, setBulkMilestoneIds] = useState<Record<string, number | null>>({});
  const originalBulkTargetDatesRef = useRef<Record<string, string>>({});
  const currentBulkTargetDatesRef = useRef<Record<string, string>>({});
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);
  // Helper function to normalize date strings for comparison
  const normalizeDate = (dateInput: string | null | undefined): string => {
    if (!dateInput) return '';
    const dateString = String(dateInput).trim();
    if (!dateString) return '';

    // Check for YYYY-MM-DD format (HTML date input standard)
    const yyyyMmDdMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (yyyyMmDdMatch) {
      // Validate if it's a real date
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return dateString;
      }
    }

    // Check for DD-MM-YYYY format
    const ddMmYyyyMatch = dateString.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (ddMmYyyyMatch) {
      const [, day, month, year] = ddMmYyyyMatch;
      const isoDateString = `${year}-${month}-${day}`;
      // Validate if it's a real date
      const date = new Date(isoDateString);
      if (!isNaN(date.getTime())) {
        return isoDateString;
      }
    }

    // Attempt to parse with new Date() as a fallback for other formats, then validate
    const fallbackDate = new Date(dateString);
    if (!isNaN(fallbackDate.getTime())) {
      return fallbackDate.toISOString().split('T')[0];
    }

    return ''; // Invalid date format, return empty string
  };

  const formatDateDisplay = (dateInput: string | null | undefined): string => {
    if (!dateInput) return '-';
    const dateString = String(dateInput).trim();
    if (!dateString) return '-';
    const cleanStr = dateString.split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? dateString : d.toLocaleDateString();
  };

  const getCurrencySymbol = (currencyCode: string): string => {
    switch (currencyCode) {
      case 'INR': return '₹';
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'RUB': return '₽';
      case 'GBP': return '£';
      case 'AED': return 'د.إ';
      default: return currencyCode; // Fallback to code if symbol not found
    }
  };

  const REQUIRED_TARGET_MILESTONES = [
    'PO Released',
    'PM Received',
    'Production Planned',
    'Production Started',
    'Production Completed',
    'Batch Released'
  ];

  const normalizeMilestoneName = (value: unknown) =>
    String(value ?? '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();

  const openBulkTargetModal = () => {
  // Map existing DB milestones by normalized name (handles the PM Procurement Released → PO Released alias)
  const milestoneMap = new Map<string, IMilestone>(
    (order?.milestones || []).map((milestone: IMilestone) => [
      normalizeMilestoneName(milestone.name === 'PM Procurement Released' ? 'PO Released' : milestone.name),
      milestone
    ])
  );

  // DEBUG: see which milestones exist in DB and which are missing
  console.table(
    REQUIRED_TARGET_MILESTONES.map(name => {
      const key = normalizeMilestoneName(name);
      const milestone = milestoneMap.get(key);
      return {
        requiredName: name,
        existsInDb: Boolean(milestone),
        databaseId: milestone?.id ?? null,
        existingTargetDate: milestone?.target_date ?? null,
      };
    })
  );

  const initialDates: Record<string, string> = {};
  const ids: Record<string, number | null> = {};

  // ✅ ALWAYS create an entry for every required milestone —
  // missing ones get a real DB id later (or null = will be created on save)
  REQUIRED_TARGET_MILESTONES.forEach(name => {
    const key = normalizeMilestoneName(name);
    const milestone = milestoneMap.get(key);
    ids[key] = milestone && typeof milestone.id === 'number' ? milestone.id : null;
    initialDates[key] = normalizeDate(milestone?.target_date);
  });

  setBulkMilestoneIds(ids);
  originalBulkTargetDatesRef.current = { ...initialDates };
  currentBulkTargetDatesRef.current = { ...initialDates };
  setBulkTargetDates({ ...initialDates });
  setBulkTargetModal(true);
};

  const handleBulkTargetSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (isSubmittingBulk) return;

  if (!order) {
    alert('Order data is missing.');
    return;
  }

  // 1. Every required milestone must have a valid date
  const missing = REQUIRED_TARGET_MILESTONES.filter(
    name => !normalizeDate(currentBulkTargetDatesRef.current[normalizeMilestoneName(name)])
  );
  if (missing.length > 0) {
    alert('Please enter a target date for:\n• ' + missing.join('\n• '));
    return;
  }

  // 2. Only send milestones whose date actually changed
  const changed = REQUIRED_TARGET_MILESTONES.filter(name => {
    const key = normalizeMilestoneName(name);
    return (
      normalizeDate(currentBulkTargetDatesRef.current[key]) !==
      normalizeDate(originalBulkTargetDatesRef.current[key])
    );
  });

  if (changed.length === 0) {
    alert('No target dates were changed.');
    return;
  }

  // 3. Build payload — real id when available, name ALWAYS (backend fallback)
  const milestonesPayload = changed.map(name => {
    const key = normalizeMilestoneName(name);
    const realId = bulkMilestoneIds[key];
    return {
      milestone_id: typeof realId === 'number' ? realId : null,   // ✅ null, not 0
      milestone_name: name,                                        // ✅ always send
      target_date: normalizeDate(currentBulkTargetDatesRef.current[key]) || null,
    };
  });

  console.log('[MILESTONE BULK PAYLOAD]', milestonesPayload);

  try {
    setIsSubmittingBulk(true);
    await orderAPI.setBulkTargetDates(order.id, milestonesPayload);
    setBulkTargetModal(false);
    await fetchOrder(false);
  } catch (error: any) {
    console.error('Error saving bulk target dates:', error);
    alert(error.response?.data?.detail || 'Failed to save milestone target dates');
  } finally {
    setIsSubmittingBulk(false);
  }
};

  useEffect(() => {
    fetchOrder(); // Initial fetch should not skip audit/approval
  }, [id]);

  useEffect(() => {
    const fetchMilestoneHistory = async () => {
      if (selectedMilestone) {
        let realId = selectedMilestone.id;
        if (typeof realId === 'string' && realId.startsWith('virtual-')) {
          const foundReal = (order?.milestones || []).find((m: IMilestone) => {
            if (!m?.name) return false;
            const normName = m.name === 'PM Procurement Released' ? 'PO Released' : m.name.trim();
            return normName === selectedMilestone.name;
          });
          if (foundReal && typeof foundReal.id === 'number') {
            realId = foundReal.id;
          } else {
            setMilestoneHistory([]);
            return;
          }
        }
        try {
          if (typeof realId !== 'number') { // Added check
            console.error('Milestone history can only be fetched for numeric IDs.');
            setMilestoneHistory([]);
            return;
          }
          const response = await orderAPI.getMilestoneHistory(realId);
          setMilestoneHistory(response.data);
        } catch (error) {
          console.error('Error fetching milestone history:', error);
          setMilestoneHistory([]);
        }
      }
    };
    fetchMilestoneHistory();
  }, [selectedMilestone]);

  const fetchOrder = async (skipAuditAndApproval = false) => {
    const orderIdNum = parseInt(id || '');
    if (!id || isNaN(orderIdNum)) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await orderAPI.getOrder(orderIdNum);
      setOrder(response.data);
      
      if (!skipAuditAndApproval) {
        // Fetch audit logs
        try {
          const auditResponse = await auditAPI.getAuditLogs(orderIdNum);
          setAuditLogs(auditResponse.data);
        } catch (err) {
          console.error('Error fetching audit logs:', err);
        }
        
        // Check if user can approve based on sequential workflow
        await checkCanApprove(orderIdNum);
      }
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkCanApprove = async (orderIdNum: number) => {
    try {
      const response = await orderAPI.canApproveOrder(orderIdNum);
      setCanApproveStatus(response.data);
    } catch (error) {
      console.error('Error checking can approve:', error);
      setCanApproveStatus({ can_approve: false, reason: 'Unable to check approval status' });
    }
  };

  const handleApprovalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (user.department === 'Regulatory' && approvalData.decision === 'APPROVED' && !approvalData.regulatory_action) {
      alert('Regulatory action is mandatory for Regulatory department approval.');
      return;
    }

    // Remarks are mandatory for SCM override OR when rejecting an order
    const needsRemarks =
      (user.department === 'SCM' && canApproveStatus?.is_scm_override) || approvalData.decision === 'REJECTED';
    if (needsRemarks && !approvalData.remarks.trim()) {
      alert(
        approvalData.decision === 'REJECTED'
          ? 'Remarks are mandatory when rejecting an order.'
          : 'SCM must provide remarks when overriding an approval.'
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
    if (!milestoneData.remarks || !milestoneData.remarks.trim()) {
      alert('Remarks are mandatory when updating a milestone.');
      return;
    }
    try {
      const dataToSend = {
        ...milestoneData,
        target_date: milestoneData.target_date || null, // Convert empty string to null
        actual_date: milestoneData.actual_date || null, // Convert empty string to null
        remarks: milestoneData.remarks.trim(),
      };
      console.log('Sending milestone update data:', dataToSend);

      // Find real milestone ID if virtual item was selected
      let realId = selectedMilestone!.id;
      if (typeof realId === 'string' && realId.startsWith('virtual-')) {
        const foundReal = (order?.milestones || []).find((m: IMilestone) => {
          if (!m?.name) return false;
          const normName = m.name === 'PM Procurement Released' ? 'PO Released' : m.name.trim();
          return normName === selectedMilestone!.name;
        });
        if (foundReal) {
          realId = foundReal.id;
        } else {
          alert('Milestone record not initialized in database yet.');
          return;
        }
      }

      if (typeof realId !== 'number') { // Added check
        alert('Cannot update milestone with a non-numeric ID.');
        return;
      }
      const response = await orderAPI.updateMilestone(
        realId,
        dataToSend
      );
      console.log('Milestone update response:', response.data);
      setMilestoneModal(false);
      fetchOrder();
    } catch (error: any) {
      console.error('Error updating milestone:', error);
      alert(error.response?.data?.detail || 'Failed to update milestone');
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
      (a: IApproval) => a.department === user.department && a.status === 'PENDING'
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
    const allPending = order.approvals.every((a: IApproval) => a.status === 'PENDING');
    return allPending;
  };

  // Milestones editable by SCM: PO Released, PM Received, Production Planned, Production Started, Production Completed, Batch Released
  // Remaining milestones (Ready for Shipment, Freight Booked, Shipped, Delivered) editable by Exports team
  const canUpdateMilestone = (milestone: IMilestone) => {
    const scmMilestones = [
      'PO Released',
      'PM Procurement Released',
      'PM Received',
      'Production Planned',
      'Production Started',
      'Production Completed',
      'Batch Released'
    ];
    const rawName = milestone?.name ? String(milestone.name).trim() : '';
    const isSCMMilestone = scmMilestones.includes(rawName);

    if (isSCMMilestone) {
      return user.department === 'SCM' || user.department === 'Management';
    } else {
      return user.department === 'Exports' || user.department === 'Exports Team' || user.department?.startsWith('Exports') || user.department === 'Management';
    }
  };

  // Get sorted and deduplicated approvals (1: Exports Initial, 2: Regulatory, 3: Finance, 4: Exports Final)
  const getSortedApprovals = () => {
    if (!order?.approvals) return [];
    const seqMap: { [key: string]: number } = {
      'EXPORTS_MANAGER_INITIAL': 1,
      'REGULATORY': 2,
      'FINANCE': 3,
      'EXPORTS_MANAGER_FINAL': 4
    };
    const uniqueMap = new Map<string, IApproval>();
    [...order.approvals].forEach((app: IApproval) => {
      const deptKey = app.department;
      if (!uniqueMap.has(deptKey) || (app.status !== 'PENDING' && uniqueMap.get(deptKey)?.status === 'PENDING')) {
        uniqueMap.set(deptKey, {
          ...app,
          sequence: seqMap[app.department] || app.sequence
        });
      }
    });
    return Array.from(uniqueMap.values()).sort((a: IApproval, b: IApproval) => (a.sequence || 0) - (b.sequence || 0));
  };

  // Standard list of required execution milestones in specified sequence
  const STANDARD_EXECUTION_MILESTONES = [
    { name: 'PO Released', category: 'Artwork' },
    { name: 'PM Received', category: 'Artwork' },
    { name: 'Production Planned', category: 'SCM' },
    { name: 'Production Started', category: 'SCM' },
    { name: 'Production Completed', category: 'SCM' },
    { name: 'Batch Released', category: 'SCM' },
    { name: 'Ready for Shipment', category: 'Logistics' },
    { name: 'Freight Booked', category: 'Logistics' },
    { name: 'Shipped', category: 'Logistics' },
    { name: 'Delivered', category: 'Logistics' },
  ];

  // Get deduplicated milestones safely for all 10 standard milestone names
  const getUniqueMilestones = () => {
    const rawMilestones: IMilestone[] = order && Array.isArray(order.milestones) ? order.milestones : [];
    const milestoneMap = new Map<string, IMilestone>();

    rawMilestones.forEach((m: IMilestone) => {
      if (!m) return;
      const rawName = m.name ? String(m.name).trim() : '';
      const normName = rawName === 'PM Procurement Released' ? 'PO Released' : rawName;
      if (!normName) return;
      if (!milestoneMap.has(normName) || (m.status === 'COMPLETED' && milestoneMap.get(normName)?.status !== 'COMPLETED')) {
        milestoneMap.set(normName, m);
      }
    });

    return STANDARD_EXECUTION_MILESTONES.map((std, idx) => {
      const existing = milestoneMap.get(std.name);
      if (existing) {
        return {
          ...existing,
          name: std.name,
          category: existing.category || std.category,
        };
      }
      return {
        id: `virtual-${idx}-${std.name}`,
        name: std.name,
        category: std.category,
        status: 'PENDING',
        target_date: null,
        actual_date: null,
        remarks: null,
      };
    });
  };

  const canShowApproveButton = (approval: IApproval) => {
    if (approval.status !== 'PENDING') {
      return false;
    }

    // For Exports Manager
    const isExportsManager = user.department === 'Exports';
    if (isExportsManager) {
      // Only Exports Manager (role === 'manager') handles initial and final approvals.
      return (
        user.role === 'manager' &&
        (approval.department === 'EXPORTS_MANAGER_INITIAL' || approval.department === 'EXPORTS_MANAGER_FINAL') &&
        canApproveStatus?.can_approve === true &&
        approval.sequence === canApproveStatus?.current_sequence
      );
    }

    // For normal departments
    if (approval.department.toUpperCase() === user.department.toUpperCase()) {
      return canApproveStatus?.can_approve === true;
    }

    // For SCM override
    if (user.department === 'SCM') {
      return canApproveStatus?.is_scm_override === true;
    }

    return false;
  };

  if (loading) {
    return <div className="loading">Loading order details...</div>;
  }

  if (!order) {
    return <div className="loading">Order not found</div>;
  }

  const workflowMessage = getWorkflowMessage();
  const sortedApprovals = getSortedApprovals();
  const isSCMTeam = user.department === 'SCM';

  return (
    <div className="main-container">
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
            <p><strong>Country:</strong> {order.country?.name || "-"}</p>
            <p><strong>PO Number:</strong> {order.po_number}</p>
            <p><strong>PO Date:</strong> {new Date(order.po_date).toLocaleDateString()}</p>
            <p><strong>Order Price:</strong> {getCurrencySymbol(order.currency)} {order.order_price ? order.order_price.toFixed(2) : 'N/A'}</p>
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
                {sortedApprovals.map((approval: IApproval) => {
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

                  const isExportsManager = user.department === 'Exports';

                  const deptMatchesThisRow = isExportsManager
                    ? isExportsManagerApproval && approval.sequence === canApproveStatus?.current_sequence
                    : approval.department.toUpperCase() === user.department.toUpperCase();

                  const showApproveBtn = canShowApproveButton(approval);

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
                      {showApproveBtn && !isSCMTeam && (
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
            {sortedApprovals.map((approval: IApproval) => {
              const isScmOverride =
                approval.remarks && approval.remarks.startsWith('[SCM Override]');
              const showApproveBtn = canShowApproveButton(approval);
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
                      {canApproveStatus?.is_scm_override ? '⚡ Override' : '✔ Approve / Reject'}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>Execution Milestones</h3>

            {user.department === 'SCM' && (
              <button className="nav-button" onClick={openBulkTargetModal}>
                Set Target Dates
              </button>
            )}
          </div>



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
                {getUniqueMilestones().map((milestone: IMilestone) => (
                  <tr key={milestone.id}>
                    <td>
                      {milestone.name === "PM Procurement Released"
                        ? "PO Released"
                        : milestone.name}
                    </td>

                    <td>
                      <span className={`status-badge ${getStatusClass(milestone.status)}`}>
                        {milestone.status}
                      </span>
                    </td>

                    <td>{formatDateDisplay(milestone.target_date)}</td>
                    <td>{formatDateDisplay(milestone.actual_date)}</td>

                    <td>{milestone.remarks || "-"}</td>

                    <td>
                      <div style={{ display: "flex", gap: "6px" }}>
                        {canUpdateMilestone(milestone) && (
                          <button
                            className="nav-button"
                            onClick={() => {
                              setSelectedMilestone(milestone);
                              setMilestoneModal(true);
                            }}
                          >
                            Update
                          </button>
                        )}

                        <button
                          className="nav-button"
                          style={{
                            background: "#f1f5f9",
                            color: "#334155",
                            border: "1px solid #cbd5e1",
                          }}
                          onClick={() => {
                            setSelectedMilestone(milestone);
                            setShowMilestoneHistoryModal(true);
                          }}
                        >
                          History
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

              {['Artwork', 'SCM', 'Logistics'].map((category) => (
                <div key={category} className="mobile-table-cards">
                {getUniqueMilestones()
                  ?.filter((m: IMilestone) => m.category === category)
                  .map((milestone: IMilestone) => (
                    <div key={milestone.id} className="mobile-card">
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">Milestone</span>
                        <span className="mobile-card-value">{milestone.name === 'PM Procurement Released' ? 'PO Released' : milestone.name}</span>
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
                        {canUpdateMilestone(milestone) ? (
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
              {auditLogs.map((log: IAuditLog) => (
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
              {isSCMTeam ? 'Submit Approval' : (canApproveStatus?.is_scm_override
                ? `⚡ SCM Override — ${canApproveStatus?.pending_department || ''} Approval`
                : canApproveStatus?.is_exports_override
                ? `⭐ Exports Manager Override — ${canApproveStatus?.pending_department || ''} Approval`
                : 'Submit Approval')}
            </h2>
            {/* Show Primary, Secondary, and Leaf PM codes inside the modal */}
            {order?.product && (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '16px',
                fontSize: '0.9em'
              }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>📦 PM Codes for SKU ({order.sku})</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.85em' }}>Primary PM Code</span>
                    <strong style={{ color: order.product.primary_pm_code ? '#0f172a' : '#ef4444' }}>
                      {order.product.primary_pm_code || 'Not Set'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.85em' }}>Secondary PM Code</span>
                    <strong>{order.product.secondary_pm_code || 'N/A'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.85em' }}>Leaf PM Code</span>
                    <strong>{order.product.leaf_pm_code || 'N/A'}</strong>
                  </div>
                </div>
              </div>
            )}

            {!isSCMTeam && canApproveStatus?.is_scm_override && (
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

              {!isSCMTeam && user.department === 'SCM' && (
                <div className="form-group">
                  <label htmlFor="targetDepartment">Override Department</label>
                  <select
                    id="targetDepartment"
                    value={approvalData.target_department}
                    onChange={(e) => setApprovalData({ ...approvalData, target_department: e.target.value })}
                  >
                    <option value="">Select Department to Override</option>
                    {order?.approvals.map((approval: IApproval) => (
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

              {user.department === 'Regulatory' && canApproveStatus?.pending_department === 'REGULATORY' && (
                <div className="form-group">
                  <label>Regulatory Action</label>
                  <select
                    value={approvalData.regulatory_action}
                    onChange={(e) => setApprovalData({ ...approvalData, regulatory_action: e.target.value })}
                  >
                    <option value="">Select Action</option>
                    <option value="SEND_TO_ARTWORK">Send to Artwork for Processing</option>
                    <option value="APPROVE_TO_FINANCE">Approve to Finance</option>
                  </select>
                </div>
              )}


              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="submit-button"
                  style={!isSCMTeam && canApproveStatus?.is_scm_override ? { background: '#ff6f00' } : {}}>
                  {isSCMTeam ? 'Submit' : (canApproveStatus?.is_scm_override ? '⚡ Confirm Override' : 'Submit')}
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
            <h2>Update Milestone: {selectedMilestone.name === 'PM Procurement Released' ? 'PO Released' : selectedMilestone.name}</h2>
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
                <label>
                  Remarks <span style={{ color: '#e53935', marginLeft: '4px' }}>* (Required)</span>
                </label>
                <textarea
                  value={milestoneData.remarks}
                  onChange={(e) => setMilestoneData({ ...milestoneData, remarks: e.target.value })}
                  rows={3}
                  required
                  placeholder="Enter mandatory remarks for updating this milestone..."
                />
              </div>


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

      {/* Milestone History Modal */}
      {showMilestoneHistoryModal && selectedMilestone && (
        <div className="modal-overlay" onClick={() => setShowMilestoneHistoryModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Milestone History: {selectedMilestone.name === 'PM Procurement Released' ? 'PO Released' : selectedMilestone.name}</h2>
            {milestoneHistory.length === 0 ? (
              <p>No history available for this milestone.</p>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '5px', padding: '10px' }}>
                {milestoneHistory.map((entry: IMilestoneHistoryEntry) => (
                  <div key={entry.id} style={{ marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px dotted #ccc' }}>
                    <p style={{ margin: 0, fontWeight: 'bold', color: '#1e293b' }}>
                      🕒 {new Date(entry.changed_at).toLocaleString()} — 👤 {entry.changed_by_user?.name || entry.changed_by?.name || 'Unknown User'} {entry.changed_by_user?.department ? `(${entry.changed_by_user.department})` : ''}
                    </p>
                    <p style={{ margin: '5px 0 0 0', fontSize: '0.9em' }}>
                      <strong>Change Type:</strong> {entry.change_type === 'TARGET_DATE_UPDATE' ? 'Target Date Update' : entry.change_type === 'STATUS_UPDATE' ? 'Status Update' : entry.change_type}
                    </p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.9em' }}>
                      <strong>Old Value:</strong> {entry.old_value || 'Not Set'}
                    </p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.9em' }}>
                      <strong>New Value:</strong> {entry.new_value || 'Not Set'}
                    </p>
                    <p style={{ margin: '5px 0 0 0', fontSize: '0.9em', color: '#334155' }}>
                      <strong>Remarks:</strong> {entry.remarks || 'No remarks provided'}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button type="button" className="nav-button" onClick={() => setShowMilestoneHistoryModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Target Dates Modal for Regulatory Department */}
      {bulkTargetModal && (
        <div className="modal-overlay" onClick={() => { if (!isSubmittingBulk) setBulkTargetModal(false); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Set Target Dates</h2>
            <p style={{ fontSize: '0.9em', color: '#666' }}>
              Enter the planned target dates for the SCM execution milestones.
              Milestones not yet in the system will be created automatically on save.
            </p>
            <form onSubmit={handleBulkTargetSubmit}>
              {REQUIRED_TARGET_MILESTONES.map(name => {
                const key = normalizeMilestoneName(name);
                const existsInDb = typeof bulkMilestoneIds[key] === 'number';
                return (
                  <div className="form-group" key={key}>
                    <label>
                      {name}
                      {!existsInDb && (
                        <span style={{ fontSize: '0.75em', color: '#ff6f00', marginLeft: '6px' }}>
                          (new — will be created)
                        </span>
                      )}
                    </label>
                    <input
                      type="date"
                      required
                      value={bulkTargetDates[key] || ''}
                      onChange={(e) => {
                        const next = { ...currentBulkTargetDatesRef.current, [key]: e.target.value };
                        currentBulkTargetDatesRef.current = next;
                        setBulkTargetDates(next);
                      }}
                    />
                  </div>
                );
              })}
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button type="submit" className="nav-button" disabled={isSubmittingBulk}>
                  {isSubmittingBulk ? 'Saving…' : 'Save Target Dates'}
                </button>
                <button type="button" className="nav-button" disabled={isSubmittingBulk}
                        onClick={() => setBulkTargetModal(false)}>
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
