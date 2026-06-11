import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, RotateCcw, XCircle, Play, Square, Monitor, Terminal, Image as ImageIcon, X } from 'lucide-react';
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

const LOG_ICONS = { step: '▶', success: '✅', error: '❌', warn: '⚠️', info: '•' };
const MAX_LOGS = 100;

function ScreenshotModal({ src, onClose }) {
  if (!src) return null;
  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 99999 }}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '-14px', right: '-14px', background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.15)', color: 'white', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
          <X size={16} />
        </button>
        <img src={src} alt="screenshot" style={{ maxWidth: '85vw', maxHeight: '85vh', width: 'auto', height: 'auto', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', display: 'block' }} />
      </div>
    </div>
  );
}

function JobDetails() {
  const { id: jobId } = useParams();
  const navigate = useNavigate();
  const logBoxRef = useRef(null);

  const [selectedFileDetails, setSelectedFileDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [automationLoading, setAutomationLoading] = useState(false);
  const [reasonFilter, setReasonFilter] = useState('all');
  const [showBrowser, setShowBrowser] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [liveLogs, setLiveLogs] = useState([]);

  const [tableParams, setTableParams] = useState({ page: 1, limit: 50, search: '', sortField: 'email', sortOrder: 'asc', startDate: '', endDate: '' });
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [screenshotModal, setScreenshotModal] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', message: '', action: null });

  const addToast = useCallback((message, type = 'success') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);

  const fetchDetails = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('token');
      const params = new URLSearchParams({
        jobId, page: tableParams.page, limit: tableParams.limit,
        search: tableParams.search, sortField: tableParams.sortField,
        sortOrder: tableParams.sortOrder, startDate: tableParams.startDate, endDate: tableParams.endDate
      });
      const res = await fetch(`http://localhost:5000/api/emails/file-details?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSelectedFileDetails({
          jobId, fileName: data.fileName, emails: data.data,
          successPercentage: data.successPercentage, failedPercentage: data.failedPercentage,
          successCount: data.successCount, failedCount: data.failedCount,
          pendingCount: data.pendingCount, inprogressCount: data.inprogressCount || 0,
          totalEmails: data.totalEmails, jobStatus: data.jobStatus, jobReason: data.jobReason
        });
        setTotalRecords(data.totalRecords);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      addToast('Error fetching job details', 'error');
    } finally {
      setDetailsLoading(false);
    }
  }, [jobId, tableParams, addToast]);

  useEffect(() => { fetchDetails(); }, [fetchDetails]);

  // Live log listener
  useEffect(() => {
    const handleLog = (data) => {
      if (data.jobId !== jobId) return;
      setLiveLogs(prev => {
        const entry = { ...data, id: Date.now() + Math.random() };
        const next = [...prev, entry];
        return next.length > MAX_LOGS ? next.slice(next.length - MAX_LOGS) : next;
      });
    };
    socket.on('automation-log', handleLog);
    return () => socket.off('automation-log', handleLog);
  }, [jobId]);

  // Job update listener
  useEffect(() => {
    const handleJobUpdate = (data) => {
      if (data.jobId === jobId) fetchDetails();
    };
    socket.on('job-update', handleJobUpdate);
    return () => socket.off('job-update', handleJobUpdate);
  }, [jobId, fetchDetails]);

  // Auto-scroll log box
  useEffect(() => {
    if (logBoxRef.current) logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
  }, [liveLogs]);

  const handleTableChange = (params) => setTableParams(params);

  const handleExport = async () => {
    const token = sessionStorage.getItem('token');
    const params = new URLSearchParams({ type: 'details', jobId, search: tableParams.search, startDate: tableParams.startDate, endDate: tableParams.endDate });
    try {
      const res = await fetch(`http://localhost:5000/api/emails/export?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `JobDetails_${jobId}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
    } catch { addToast('Failed to export Excel', 'error'); }
  };

  const handleStartAutomation = async () => {
    setAutomationLoading(true);
    setLiveLogs([]);
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/emails/start-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ jobId, headless: !showBrowser })
      });
      const data = await res.json();
      addToast(data.message, data.success ? 'success' : 'error');
    } catch { addToast('Failed to start automation', 'error'); }
    finally { setAutomationLoading(false); }
  };

  const handleStopAutomation = async () => {
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
    } catch { addToast('Failed to stop automation', 'error'); }
    finally { setAutomationLoading(false); }
  };

  const handleRetryAutomation = async () => {
    setAutomationLoading(true);
    setLiveLogs([]);
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/emails/retry-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ jobId, reasonFilter, headless: !showBrowser })
      });
      const data = await res.json();
      addToast(data.message, data.success ? 'success' : 'error');
    } catch { addToast('Failed to retry automation', 'error'); }
    finally { setAutomationLoading(false); }
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
    } catch { addToast('Failed to retry email', 'error'); }
    finally { setAutomationLoading(false); }
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
          <div className="empty-state-icon"><AlertTriangle size={56} /></div>
          <div className="empty-state-title">Job Not Found</div>
          <button type="button" className="detail-back-btn" onClick={() => navigate('/uploads')} style={{ marginTop: '16px' }}>
            ← Back to Automation
          </button>
        </div>
      </div>
    );
  }

  const isFileActive = selectedFileDetails.jobStatus === 'running';
  const hasFailed = selectedFileDetails.emails.some(r => r.status === 'failed');
  const uniqueReasons = [...new Set(selectedFileDetails.emails.filter(r => r.status === 'failed').map(r => r.reason).filter(Boolean))];

  const columns = [
    {
      label: '#', key: 'index', width: '52px', sortable: false,
      render: (row, key, idx) => <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{(tableParams.page - 1) * tableParams.limit + idx + 1}</span>
    },
    {
      label: 'Email Address', key: 'email',
      render: (row) => <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '12px' }}>{row.email}</span>
    },
    {
      label: 'Slot', key: 'slot',
      render: (row) => <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{row.slot || '—'}</span>
    },
    {
      label: 'Status', key: 'status',
      render: (row) => <span className={`status-badge status-${row.status || 'pending'}`}>{row.status || 'pending'}</span>
    },
    {
      label: 'Log / Reason', key: 'reason',
      render: (row) => (
        <span style={{ display: 'inline-block', fontSize: '12px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: row.status === 'failed' ? '#fca5a5' : 'var(--text-muted)' }} title={row.reason}>
          {row.reason || '—'}
        </span>
      )
    },
    {
      label: 'Actions', key: 'actions', sortable: false,
      render: (row) => (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {row.screenshot ? (
            <div style={{ position: 'relative', display: 'inline-block' }}
              onMouseEnter={e => { const p = e.currentTarget.querySelector('.ss-preview'); if (p) p.style.display = 'block'; }}
              onMouseLeave={e => { const p = e.currentTarget.querySelector('.ss-preview'); if (p) p.style.display = 'none'; }}
            >
              <button type="button" className="ss-icon-btn"
                onClick={(e) => { e.stopPropagation(); setScreenshotModal(`http://localhost:5000/${row.screenshot}`); }}
                title="View screenshot">
                <ImageIcon size={14} />
              </button>
              <div className="ss-preview" style={{ display: 'none', position: 'absolute', bottom: '130%', right: 0, zIndex: 9999, pointerEvents: 'none' }}>
                <img src={`http://localhost:5000/${row.screenshot}`} alt="preview"
                  style={{ width: '150px', height: '200px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', display: 'block', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }} />
              </div>
            </div>
          ) : null}
          {row.status === 'failed' ? (
            <button type="button" className="ss-icon-btn retry-icon-btn"
              onClick={(e) => { e.stopPropagation(); handleRetrySingle(row._id); }}
              disabled={isFileActive || automationLoading}
              title="Retry this email">
              <RotateCcw size={14} />
            </button>
          ) : null}
          {!row.screenshot && row.status !== 'failed' && <span style={{ color: 'var(--text-muted)' }}>—</span>}
        </div>
      )
    }
  ];

  const processedData = selectedFileDetails.emails.map(row => ({
    ...row, rowClass: row.status === 'inprogress' ? 'row-running' : ''
  }));

  return (
    <>
      <ToastContainer toasts={toasts} />
      <ScreenshotModal src={screenshotModal} onClose={() => setScreenshotModal(null)} />
      <div className="purchase-container">
        <div className="card preview-card">
          <button type="button" className="detail-back-btn" onClick={() => navigate('/uploads')}>
            ← Back to Automation
          </button>

          {/* Job Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', wordBreak: 'break-all' }}>{selectedFileDetails.fileName}</h2>
                <span className={`status-badge status-${selectedFileDetails.jobStatus}`}>{selectedFileDetails.jobStatus}</span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                {selectedFileDetails.totalEmails} total
                &nbsp;<span style={{ color: '#34d399' }}>• {selectedFileDetails.successCount} success</span>
                &nbsp;<span style={{ color: '#f87171' }}>• {selectedFileDetails.failedCount} failed</span>
                &nbsp;<span style={{ color: '#fbbf24' }}>• {selectedFileDetails.pendingCount} pending</span>
                {selectedFileDetails.inprogressCount > 0 && <span style={{ color: '#a78bfa' }}>&nbsp;• {selectedFileDetails.inprogressCount} inprogress</span>}
              </div>
              {selectedFileDetails.jobReason && (
                <div className="detail-log">
                  <span className="detail-log-dot" />
                  {selectedFileDetails.jobReason}
                </div>
              )}
            </div>

            {/* Compact Stats Box */}
            <div style={{ display: 'flex', gap: '12px', flexShrink: 0, flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', padding: '10px 16px', textAlign: 'center', minWidth: '80px' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#34d399' }}>{selectedFileDetails.successPercentage}%</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Success ({selectedFileDetails.successCount})</div>
              </div>
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px 16px', textAlign: 'center', minWidth: '80px' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#f87171' }}>{selectedFileDetails.failedPercentage}%</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Failed ({selectedFileDetails.failedCount})</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px 16px', textAlign: 'center', minWidth: '80px' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{selectedFileDetails.totalEmails}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Total</div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden', display: 'flex', marginBottom: '20px' }}>
            <div style={{ width: `${selectedFileDetails.successPercentage}%`, background: 'linear-gradient(90deg,#10b981,#34d399)', transition: 'width 0.5s' }} />
            <div style={{ width: `${selectedFileDetails.failedPercentage}%`, background: '#ef4444' }} />
          </div>

          {/* Live Log Panel */}
          {(isFileActive || liveLogs.length > 0) && (
            <div className="live-log-panel">
              <div className="live-log-header">
                <span className="live-log-title">
                  <Terminal size={13} />
                  Live Automation Log
                  {isFileActive && <span className="live-log-pulse" />}
                </span>
                <button type="button" className="live-log-clear-btn" onClick={() => setLiveLogs([])}>Clear</button>
              </div>
              <div className="live-log-box" ref={logBoxRef}>
                {liveLogs.length === 0 ? (
                  <span className="live-log-empty">Waiting for logs...</span>
                ) : (
                  liveLogs.map(log => (
                    <div key={log.id} className={`live-log-line log-type-${log.type}`}>
                      <span className="live-log-time">{new Date(log.time).toLocaleTimeString('en-IN', { hour12: false })}</span>
                      <span className="live-log-icon">{LOG_ICONS[log.type] || '•'}</span>
                      {log.email && <span className="live-log-email">{log.email}</span>}
                      <span className="live-log-msg">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Control Bar */}
          <div className="details-control-bar">
            <div className="action-buttons-group">
              <button type="button" className="ctrl-btn-start" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={handleStartAutomation} disabled={isFileActive || automationLoading}>
                {automationLoading ? <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} /> : <Play size={14} fill="currentColor" />}
                Start
              </button>
              <button type="button" className="ctrl-btn-stop" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={handleStopAutomation} disabled={!isFileActive || automationLoading}>
                <Square size={14} fill="currentColor" /> Stop
              </button>
            </div>

            <div className="retry-group">
              <label htmlFor="reason-filter">Retry Filter:</label>
              <select id="reason-filter" className="filter-select" value={reasonFilter}
                onChange={e => setReasonFilter(e.target.value)}
                disabled={!hasFailed || isFileActive || automationLoading}>
                <option value="all">All Failed ({selectedFileDetails.failedCount})</option>
                {uniqueReasons.map((reason, idx) => {
                  const cnt = selectedFileDetails.emails.filter(e => e.reason === reason).length;
                  return <option key={idx} value={reason}>{reason.length > 32 ? `${reason.substring(0, 32)}…` : reason} ({cnt})</option>;
                })}
              </select>
              <button type="button" className="ctrl-btn-retry" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={handleRetryAutomation} disabled={!hasFailed || isFileActive || automationLoading}>
                <RotateCcw size={14} /> Retry Failed
              </button>
              <label className="toggle-wrap" title="Show browser window during automation">
                <span className="toggle-switch">
                  <input type="checkbox" checked={showBrowser} onChange={e => setShowBrowser(e.target.checked)} disabled={isFileActive || automationLoading} />
                  <span className="toggle-slider" />
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Monitor size={14} /> Show Browser</span>
              </label>
            </div>
          </div>

          <DataTable
            data={processedData} columns={columns} keyField="_id"
            serverSide={true} showFilters={true}
            currentPage={tableParams.page} limit={tableParams.limit}
            totalRecords={totalRecords} totalPages={totalPages}
            onTableChange={handleTableChange} onExport={handleExport}
          />
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmConfig.isOpen} title={confirmConfig.title}
        message={confirmConfig.message} onConfirm={confirmConfig.action}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        loading={automationLoading} type="danger" confirmText="Stop Job"
      />
    </>
  );
}

export default JobDetails;
