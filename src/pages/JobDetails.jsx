import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, Image as ImageIcon, RotateCcw, XCircle, Play, Square, Monitor } from 'lucide-react';
import DataTable from '../components/DataTable';
import ConfirmModal from '../components/ConfirmModal';
import { socket } from '../socket';

let toastId = 0;
function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">{t.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}</span>
          <span className="toast-msg">{t.message}</span>
        </div>
      ))}
    </div>
  );
}

function JobDetails() {
  const { id: jobId } = useParams();
  const navigate = useNavigate();

  const [selectedFileDetails, setSelectedFileDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [automationLoading, setAutomationLoading] = useState(false);
  const [reasonFilter, setReasonFilter] = useState('all');
  const [showBrowser, setShowBrowser] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Server-side state
  const [tableParams, setTableParams] = useState({ page: 1, limit: 50, search: '', sortField: 'createdAt', sortOrder: 'asc', startDate: '', endDate: '' });
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    action: null
  });

  const addToast = useCallback((message, type = 'success') => {
    const toastIdNum = ++toastId;
    setToasts(prev => [...prev, { id: toastIdNum, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toastIdNum));
    }, 4500);
  }, []);

  const fetchDetails = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('token');
      const params = new URLSearchParams({
        jobId,
        page: tableParams.page,
        limit: tableParams.limit,
        search: tableParams.search,
        sortField: tableParams.sortField,
        sortOrder: tableParams.sortOrder,
        startDate: tableParams.startDate,
        endDate: tableParams.endDate
      });

      const res = await fetch(`http://localhost:5000/api/emails/file-details?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSelectedFileDetails({
          jobId,
          fileName: data.fileName,
          emails: data.data,
          successPercentage: data.successPercentage,
          failedPercentage: data.failedPercentage,
          successCount: data.successCount,
          failedCount: data.failedCount,
          pendingCount: data.pendingCount,
          totalEmails: data.totalEmails,
          jobStatus: data.jobStatus,
          jobReason: data.jobReason
        });
        setTotalRecords(data.totalRecords);
        setTotalPages(data.totalPages);
      }
    } catch (fetchErr) {
      console.error('Error fetching details:', fetchErr);
      addToast('Error fetching job details', 'error');
    } finally {
      setDetailsLoading(false);
    }
  }, [jobId, tableParams, addToast]);

  useEffect(() => { fetchDetails(); }, [fetchDetails]);

  useEffect(() => {
    const handleJobUpdate = (data) => {
      if (data.jobId === jobId) {
        fetchDetails();
      }
    };
    socket.on('job-update', handleJobUpdate);
    return () => {
      socket.off('job-update', handleJobUpdate);
    };
  }, [jobId, fetchDetails]);

  const handleTableChange = (params) => {
    setTableParams(params);
  };

  const handleExport = async () => {
    const token = sessionStorage.getItem('token');
    if (!token) return;
    const params = new URLSearchParams({
      type: 'details',
      jobId,
      search: tableParams.search,
      startDate: tableParams.startDate,
      endDate: tableParams.endDate
    });
    
    try {
      const res = await fetch(`http://localhost:5000/api/emails/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Export failed');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `JobDetails_${jobId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      addToast('Failed to export Excel', 'error');
    }
  };

  const handleStartAutomation = async () => {
    setAutomationLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/emails/start-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ jobId, headless: !showBrowser })
      });
      const data = await res.json();
      addToast(data.message, data.success ? 'success' : 'error');
    } catch (_) {
      addToast('Failed to start automation', 'error');
    } finally {
      setAutomationLoading(false);
    }
  };

  const handleStopAutomation = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Stop Automation',
      message: 'Are you sure you want to stop this running job? Any currently processing email might fail or remain pending.',
      action: async () => {
        setAutomationLoading(true);
        try {
          const token = sessionStorage.getItem('token');
          const res = await fetch('http://localhost:5000/api/emails/stop-automation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ jobId })
          });
          const data = await res.json();
          addToast(data.message, data.success ? 'success' : 'error');
        } catch (_) {
          addToast('Failed to stop automation', 'error');
        } finally {
          setAutomationLoading(false);
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleRetryAutomation = async () => {
    setAutomationLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/emails/retry-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ jobId, reasonFilter, headless: !showBrowser })
      });
      const data = await res.json();
      addToast(data.message, data.success ? 'success' : 'error');
    } catch (_) {
      addToast('Failed to retry automation', 'error');
    } finally {
      setAutomationLoading(false);
    }
  };

  const handleRetrySingle = async (emailId) => {
    setAutomationLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/emails/retry-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ emailId, headless: !showBrowser })
      });
      const data = await res.json();
      addToast(data.message, data.success ? 'success' : 'error');
    } catch (_) {
      addToast('Failed to retry email', 'error');
    } finally {
      setAutomationLoading(false);
    }
  };

  if (detailsLoading) {
    return (
      <div className="purchase-container">
        <div className="loading-state" style={{ padding: '64px 0' }}>
          <span className="spinner" style={{ width: '28px', height: '28px', borderWidth: '3px' }} />
          <p>Loading details...</p>
        </div>
      </div>
    );
  }

  if (!selectedFileDetails) {
    return (
      <div className="purchase-container">
        <div className="empty-state" style={{ padding: '64px 0' }}>
          <div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><AlertTriangle size={56} /></div>
          <div className="empty-state-title">Job Not Found</div>
          <div className="empty-state-desc">The requested job details could not be found or were deleted.</div>
          <button type="button" className="detail-back-btn" onClick={() => navigate('/uploads')} style={{ marginTop: '16px' }}>
            ← Back to Automation
          </button>
        </div>
      </div>
    );
  }

  const isFileActive = ['pending', 'running'].includes(selectedFileDetails.jobStatus);
  const hasFailed = selectedFileDetails.emails.some(r => r.status === 'failed');
  const uniqueReasons = [...new Set(selectedFileDetails.emails.filter(r => r.status === 'failed').map(r => r.reason).filter(Boolean))];

  const columns = [
    {
      label: '#',
      key: 'index',
      width: '52px',
      sortable: false,
      render: (row, key, idx) => <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{(tableParams.page - 1) * tableParams.limit + idx + 1}</span>
    },
    {
      label: 'Email Address',
      key: 'email',
      render: (row) => <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '12px' }}>{row.email}</span>
    },
    {
      label: 'Status',
      key: 'status',
      render: (row) => (
        <span className={`status-badge status-${row.status === 'success' ? 'success' : (row.status || 'pending')}`}>
          {row.status || 'pending'}
        </span>
      )
    },
    {
      label: 'Log / Reason',
      key: 'reason',
      render: (row) => (
        <span
          style={{
            display: 'inline-block',
            fontSize: '12px',
            maxWidth: '220px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: row.status === 'failed' ? '#fca5a5' : 'var(--text-muted)'
          }}
          title={row.reason}
        >
          {row.reason || '—'}
        </span>
      )
    },
    {
      label: 'Screenshot',
      key: 'screenshot',
      sortable: false,
      render: (row) => (
        row.screenshot ? (
          <a
            href={`http://localhost:5000/${row.screenshot}`}
            target="_blank"
            rel="noreferrer"
            className="screenshot-link"
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            onClick={e => e.stopPropagation()}
          >
            <ImageIcon size={14} /> View
          </a>
        ) : '—'
      )
    },
    {
      label: 'Actions',
      key: 'actions',
      sortable: false,
      render: (row) => (
        row.status === 'failed' ? (
          <button
            type="button"
            className="inline-retry-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            onClick={(e) => { e.stopPropagation(); handleRetrySingle(row._id); }}
            disabled={isFileActive || automationLoading}
            title="Retry this email"
          >
            <RotateCcw size={14} /> Retry
          </button>
        ) : '—'
      )
    }
  ];

  const processedData = selectedFileDetails.emails.map(row => ({
    ...row,
    rowClass: row.status === 'running' ? 'row-running' : ''
  }));

  return (
    <>
      <ToastContainer toasts={toasts} />
      <div className="purchase-container">
        <div className="card preview-card">
          <button type="button" className="detail-back-btn" onClick={() => navigate('/uploads')}>
            ← Back to Automation
          </button>

          <div className="detail-header-row">
            <div>
              <div className="detail-title">
                <span style={{ wordBreak: 'break-all' }}>{selectedFileDetails.fileName}</span>
                <span className={`status-badge status-${selectedFileDetails.jobStatus}`}>
                  {selectedFileDetails.jobStatus}
                </span>
              </div>
              <p className="detail-subtitle">
                {selectedFileDetails.totalEmails} email addresses • {selectedFileDetails.successCount} succeeded • {selectedFileDetails.failedCount} failed • {selectedFileDetails.pendingCount} pending
              </p>
              {selectedFileDetails.jobReason && (
                <div className="detail-log">
                  <span className="detail-log-dot" />
                  {selectedFileDetails.jobReason}
                </div>
              )}
            </div>

            <div className="detail-stats-box">
              <div className="detail-stat-row">
                <span className="detail-stat-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={14} /> Success</span>
                <span className="detail-stat-value" style={{ color: '#34d399' }}>{selectedFileDetails.successPercentage}% ({selectedFileDetails.successCount})</span>
              </div>
              <div className="detail-progress-bar-wrap">
                <div className="detail-prog-success" style={{ width: `${selectedFileDetails.successPercentage}%` }} />
                <div className="detail-prog-failed" style={{ width: `${selectedFileDetails.failedPercentage}%` }} />
              </div>
              <div className="detail-stat-row">
                <span className="detail-stat-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><XCircle size={14} /> Failed</span>
                <span className="detail-stat-value" style={{ color: '#f87171' }}>{selectedFileDetails.failedPercentage}% ({selectedFileDetails.failedCount})</span>
              </div>
              <div className="detail-stat-row" style={{ marginTop: '4px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="detail-stat-label">Total</span>
                <span className="detail-stat-value">{selectedFileDetails.totalEmails}</span>
              </div>
            </div>
          </div>

          <div className="details-control-bar">
            <div className="action-buttons-group">
              <button
                type="button"
                className="ctrl-btn-start"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={handleStartAutomation}
                disabled={isFileActive || automationLoading}
              >
                {automationLoading ? <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} /> : <Play size={14} fill="currentColor" />}
                Start
              </button>
              <button
                type="button"
                className="ctrl-btn-stop"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={handleStopAutomation}
                disabled={!isFileActive || automationLoading}
              >
                <Square size={14} fill="currentColor" /> Stop
              </button>
            </div>

            <div className="retry-group">
              <label htmlFor="reason-filter">Retry Filter:</label>
              <select
                id="reason-filter"
                className="filter-select"
                value={reasonFilter}
                onChange={e => setReasonFilter(e.target.value)}
                disabled={!hasFailed || isFileActive || automationLoading}
              >
                <option value="all">All Failed ({selectedFileDetails.failedCount})</option>
                {uniqueReasons.map((reason, idx) => {
                  const cnt = selectedFileDetails.emails.filter(e => e.reason === reason).length;
                  return (
                    <option key={idx} value={reason}>
                      {reason.length > 32 ? `${reason.substring(0, 32)}…` : reason} ({cnt})
                    </option>
                  );
                })}
              </select>
              <button
                type="button"
                className="ctrl-btn-retry"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={handleRetryAutomation}
                disabled={!hasFailed || isFileActive || automationLoading}
              >
                <RotateCcw size={14} /> Retry Failed
              </button>

              <label className="toggle-wrap" title="Show browser window during automation">
                <span className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={showBrowser}
                    onChange={e => setShowBrowser(e.target.checked)}
                    disabled={isFileActive || automationLoading}
                  />
                  <span className="toggle-slider" />
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Monitor size={14} /> Show Browser</span>
              </label>
            </div>
          </div>

          <DataTable 
            data={processedData}
            columns={columns}
            keyField="_id"
            serverSide={true}
            showFilters={true}
            currentPage={tableParams.page}
            limit={tableParams.limit}
            totalRecords={totalRecords}
            totalPages={totalPages}
            onTableChange={handleTableChange}
            onExport={handleExport}
          />
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.action}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        loading={automationLoading}
        type="danger"
        confirmText="Stop Job"
      />
    </>
  );
}

export default JobDetails;
