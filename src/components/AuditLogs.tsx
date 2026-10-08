import React, { useState, useEffect, useMemo } from 'react';
import { auditAPI } from '../services/api';
import Header from './Header';
import { formatDateTime } from '../utils/dateUtils';
import { useExcelTableFilter } from './useExcelTableFilter';
import { ExcelHeaderCell, ExcelActiveFiltersBar } from './ExcelHeaderCell';

interface AuditLogsProps {
  user: any;
  onLogout: () => void;
}

const AuditLogs: React.FC<AuditLogsProps> = ({ user, onLogout }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchLogs(1);
  }, []);

  const fetchLogs = async (p: number = page) => {
    try {
      setLoading(true);
      const skip = (p - 1) * pageSize;
      const response = await auditAPI.getAuditLogs(undefined, skip, pageSize);
      setLogs(response.data);
      setHasMore(response.data.length === pageSize);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return '#4caf50';
    if (action.includes('APPROVAL')) return '#2196f3';
    if (action.includes('REJECT')) return '#f44336';
    if (action.includes('UPDATE')) return '#ff9800';
    if (action.includes('DELETE')) return '#9c27b0';
    return '#666';
  };

  const columnAccessors = useMemo(() => ({
    timestamp: (log: any) => formatDateTime(log.timestamp),
    user_info: (log: any) => log.user ? `${log.user.name} (${log.user.employee_id})` : '-',
    action: (log: any) => log.action || '-',
    order_id: (log: any) => log.order?.order_id || log.order_id || '-',
    previous_status: (log: any) => log.previous_status || '-',
    new_status: (log: any) => log.new_status || '-',
    remarks: (log: any) => log.remarks || '-',
    ip_address: (log: any) => log.ip_address || '-',
  }), []);

  const {
    filteredAndSortedData: excelFilteredLogs,
    filterState,
    sortState,
    uniqueValuesMap,
    setColumnFilter,
    handleSort,
    clearColumnFilter,
    clearAllFilters,
    activeFilterCount,
  } = useExcelTableFilter(logs, columnAccessors);

  if (loading) {
    return <div className="loading">Loading audit logs...</div>;
  }

  return (
    <div className="main-container">
      <Header user={user} onLogout={onLogout} />

      <div className="panel">
        <h2>Audit Trail</h2>

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
                    columnKey="timestamp"
                    label="Timestamp"
                    uniqueValues={uniqueValuesMap.timestamp}
                    selectedValues={filterState.timestamp}
                    sortDirection={sortState.columnKey === 'timestamp' ? sortState.direction : null}
                    onFilterChange={(sel) => setColumnFilter('timestamp', sel)}
                    onSortChange={(dir) => handleSort('timestamp', dir)}
                    onClearFilter={() => clearColumnFilter('timestamp')}
                  />
                </th>
                <th>
                  <ExcelHeaderCell
                    columnKey="user_info"
                    label="User"
                    uniqueValues={uniqueValuesMap.user_info}
                    selectedValues={filterState.user_info}
                    sortDirection={sortState.columnKey === 'user_info' ? sortState.direction : null}
                    onFilterChange={(sel) => setColumnFilter('user_info', sel)}
                    onSortChange={(dir) => handleSort('user_info', dir)}
                    onClearFilter={() => clearColumnFilter('user_info')}
                  />
                </th>
                <th>
                  <ExcelHeaderCell
                    columnKey="action"
                    label="Action"
                    uniqueValues={uniqueValuesMap.action}
                    selectedValues={filterState.action}
                    sortDirection={sortState.columnKey === 'action' ? sortState.direction : null}
                    onFilterChange={(sel) => setColumnFilter('action', sel)}
                    onSortChange={(dir) => handleSort('action', dir)}
                    onClearFilter={() => clearColumnFilter('action')}
                  />
                </th>
                <th>
                  <ExcelHeaderCell
                    columnKey="order_id"
                    label="Order ID"
                    uniqueValues={uniqueValuesMap.order_id}
                    selectedValues={filterState.order_id}
                    sortDirection={sortState.columnKey === 'order_id' ? sortState.direction : null}
                    onFilterChange={(sel) => setColumnFilter('order_id', sel)}
                    onSortChange={(dir) => handleSort('order_id', dir)}
                    onClearFilter={() => clearColumnFilter('order_id')}
                  />
                </th>
                <th>
                  <ExcelHeaderCell
                    columnKey="previous_status"
                    label="Previous Status"
                    uniqueValues={uniqueValuesMap.previous_status}
                    selectedValues={filterState.previous_status}
                    sortDirection={sortState.columnKey === 'previous_status' ? sortState.direction : null}
                    onFilterChange={(sel) => setColumnFilter('previous_status', sel)}
                    onSortChange={(dir) => handleSort('previous_status', dir)}
                    onClearFilter={() => clearColumnFilter('previous_status')}
                  />
                </th>
                <th>
                  <ExcelHeaderCell
                    columnKey="new_status"
                    label="New Status"
                    uniqueValues={uniqueValuesMap.new_status}
                    selectedValues={filterState.new_status}
                    sortDirection={sortState.columnKey === 'new_status' ? sortState.direction : null}
                    onFilterChange={(sel) => setColumnFilter('new_status', sel)}
                    onSortChange={(dir) => handleSort('new_status', dir)}
                    onClearFilter={() => clearColumnFilter('new_status')}
                  />
                </th>
                <th>
                  <ExcelHeaderCell
                    columnKey="remarks"
                    label="Remarks"
                    uniqueValues={uniqueValuesMap.remarks}
                    selectedValues={filterState.remarks}
                    sortDirection={sortState.columnKey === 'remarks' ? sortState.direction : null}
                    onFilterChange={(sel) => setColumnFilter('remarks', sel)}
                    onSortChange={(dir) => handleSort('remarks', dir)}
                    onClearFilter={() => clearColumnFilter('remarks')}
                  />
                </th>
                <th>
                  <ExcelHeaderCell
                    columnKey="ip_address"
                    label="IP Address"
                    uniqueValues={uniqueValuesMap.ip_address}
                    selectedValues={filterState.ip_address}
                    sortDirection={sortState.columnKey === 'ip_address' ? sortState.direction : null}
                    onFilterChange={(sel) => setColumnFilter('ip_address', sel)}
                    onSortChange={(dir) => handleSort('ip_address', dir)}
                    onClearFilter={() => clearColumnFilter('ip_address')}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {excelFilteredLogs.map((log) => (
                <tr key={log.id}>
                  <td>{formatDateTime(log.timestamp)}</td>
                  <td>
                    {log.user?.name} ({log.user?.employee_id})
                  </td>
                  <td>
                    <span
                      className="status-badge"
                      style={{
                        backgroundColor: getActionColor(log.action),
                        color: 'white',
                      }}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td>{log.order?.order_id || '-'}</td>
                  <td>{log.previous_status || '-'}</td>
                  <td>{log.new_status || '-'}</td>
                  <td>{log.remarks || '-'}</td>
                  <td>{log.ip_address || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="mobile-table-cards">
          {logs.map((log) => (
            <div key={log.id} className="mobile-card">
              <div className="mobile-card-row">
                <span className="mobile-card-label">Timestamp</span>
                <span className="mobile-card-value">
                  {formatDateTime(log.timestamp)}
                </span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">User</span>
                <span className="mobile-card-value">
                  {log.user?.name} ({log.user?.employee_id})
                </span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Action</span>
                <span className="mobile-card-value">
                  <span
                    className="status-badge"
                    style={{
                      backgroundColor: getActionColor(log.action),
                      color: 'white',
                    }}
                  >
                    {log.action}
                  </span>
                </span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Order ID</span>
                <span className="mobile-card-value">
                  {log.order?.order_id || '-'}
                </span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Previous Status</span>
                <span className="mobile-card-value">
                  {log.previous_status || '-'}
                </span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">New Status</span>
                <span className="mobile-card-value">
                  {log.new_status || '-'}
                </span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">Remarks</span>
                <span className="mobile-card-value">
                  {log.remarks || '-'}
                </span>
              </div>
              <div className="mobile-card-row">
                <span className="mobile-card-label">IP Address</span>
                <span className="mobile-card-value">
                  {log.ip_address || '-'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {logs.length === 0 && (
          <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            No audit logs found
          </p>
        )}

        {/* Pagination Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <button 
            className="nav-button" 
            disabled={page === 1 || loading} 
            onClick={() => { const newPage = page - 1; setPage(newPage); fetchLogs(newPage); }}
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
            onClick={() => { const newPage = page + 1; setPage(newPage); fetchLogs(newPage); }}
            style={{ opacity: (!hasMore || loading) ? 0.5 : 1, cursor: (!hasMore || loading) ? 'not-allowed' : 'pointer' }}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
};


export default AuditLogs;
