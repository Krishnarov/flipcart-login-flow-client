import { useState, useEffect, useCallback } from 'react';
import { FileText, Download, CheckCircle2, XCircle, Cookie, FileSpreadsheet, ChevronDown, ChevronUp, AlertTriangle, Trash2, Filter, Globe } from 'lucide-react';
import JSZip from 'jszip';
import ConfirmModal from '../components/ConfirmModal';

let toastId = 0;
function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-msg">{t.message}</span>
        </div>
      ))}
    </div>
  );
}

function Reports() {
  const [jobs, setJobs] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedJob, setExpandedJob] = useState(null);
  const [exportingMap, setExportingMap] = useState({});
  const [toasts, setToasts] = useState([]);

  // Global filter state
  const [globalSlot, setGlobalSlot] = useState('all');
  const [globalStatus, setGlobalStatus] = useState('all');
  const [globalExporting, setGlobalExporting] = useState('');
  const [globalStats, setGlobalStats] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const addToast = useCallback((message, type = 'success') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const token = () => sessionStorage.getItem('token');

  const fetchAll = useCallback(async () => {
    try {
      const [jobsRes, slotsRes] = await Promise.all([
        fetch('http://localhost:5000/api/emails/files?page=1&limit=100&sortField=createdAt&sortOrder=desc', { headers: { Authorization: `Bearer ${token()}` } }),
        fetch('http://localhost:5000/api/emails/slots', { headers: { Authorization: `Bearer ${token()}` } })
      ]);
      const jobsData = await jobsRes.json();
      const slotsData = await slotsRes.json();
      if (jobsData.success) setJobs(jobsData.data);
      if (slotsData.success) setSlots(slotsData.slots);
    } catch { addToast('Failed to load data', 'error'); }
    finally { setLoading(false); }
  }, [addToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Fetch global stats when slot/status changes
  useEffect(() => {
    const fetchGlobalStats = async () => {
      const params = new URLSearchParams({ slot: globalSlot, status: globalStatus });
      const res = await fetch(`http://localhost:5000/api/emails/global-report?${params}`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (data.success) setGlobalStats({ total: data.total, data: data.data });
    };
    fetchGlobalStats();
  }, [globalSlot, globalStatus]);

  const setExp = (key, val) => setExportingMap(prev => ({ ...prev, [key]: val }));
  const isExp = (key) => exportingMap[key];

  // ── Global Exports ──────────────────────────────────────────────────────────
  const globalExportCSV = async (statusFilter) => {
    const key = `global_${statusFilter}`;
    setGlobalExporting(key);
    try {
      const params = new URLSearchParams({ slot: globalSlot, status: statusFilter });
      const res = await fetch(`http://localhost:5000/api/emails/global-report?${params}`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (!data.success || data.data.length === 0) { addToast('No data found', 'error'); return; }

      const header = ['Email', 'Slot', 'Job', 'Status', 'Reason', 'Completed At', 'Created At'];
      const rows = data.data.map(e => [
        e.email, e.slot || '', e.jobName || '', e.status,
        (e.reason || '').replace(/,/g, ';'),
        e.completedAt ? new Date(e.completedAt).toLocaleString() : '',
        new Date(e.createdAt).toLocaleString()
      ]);
      const csv = [header, ...rows].map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `global_${statusFilter}_slot-${globalSlot}.csv`;
      a.click();
      addToast(`${data.data.length} records exported!`, 'success');
    } catch { addToast('Export failed', 'error'); }
    finally { setGlobalExporting(''); }
  };

  const globalExportCookiesZip = async () => {
    setGlobalExporting('global_cookies');
    try {
      const params = new URLSearchParams({ slot: globalSlot, status: 'success' });
      const res = await fetch(`http://localhost:5000/api/emails/global-report?${params}`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (!data.success) throw new Error('Failed');

      const successEmails = data.data.filter(e => e.cookies?.length > 0);
      if (successEmails.length === 0) { addToast('No cookies found', 'error'); return; }

      const zip = new JSZip();
      const folderName = `global_slot-${globalSlot}_cookies`;
      const folder = zip.folder(folderName);

      for (const e of successEmails) {
        folder.file(`${e.email}.json`, JSON.stringify({
          email: e.email,
          cookies: e.cookies
        }, null, 2));
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${folderName}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      addToast(`${successEmails.length} JSON files exported!`, 'success');
    } catch { addToast('Cookies export failed', 'error'); }
    finally { setGlobalExporting(''); }
  };

  const handleDeleteAll = async () => {
    setDeleting(true);
    try {
      const params = new URLSearchParams();
      if (globalSlot && globalSlot !== 'all') params.set('slot', globalSlot);
      if (globalStatus && globalStatus !== 'all') params.set('status', globalStatus);
      const res = await fetch(`http://localhost:5000/api/emails/delete-all-data?${params}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      addToast(data.message, data.success ? 'success' : 'error');
      if (data.success) { setShowDeleteConfirm(false); fetchAll(); }
    } catch { addToast('Delete failed', 'error'); }
    finally { setDeleting(false); }
  };

  const deleteLabel = globalSlot !== 'all' && globalStatus !== 'all'
    ? `slot "${globalSlot}" + status "${globalStatus}"`
    : globalSlot !== 'all'
    ? `all emails in slot "${globalSlot}"`
    : globalStatus !== 'all'
    ? `all "${globalStatus}" emails`
    : 'ALL emails (no filter active)';

  // ── Per-Job Exports ─────────────────────────────────────────────────────────
  const exportJobCSV = async (job, statusFilter) => {
    const key = `${job._id}_${statusFilter}`;
    setExp(key, true);
    try {
      const res = await fetch(`http://localhost:5000/api/emails/file-details?jobId=${job._id}&page=1&limit=10000`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (!data.success) throw new Error('Failed');

      const filtered = statusFilter === 'all' ? data.data : data.data.filter(e => e.status === statusFilter);
      if (filtered.length === 0) { addToast(`No ${statusFilter} emails`, 'error'); return; }

      const header = ['Email', 'Slot', 'Status', 'Reason', 'Completed At', 'Created At'];
      const rows = filtered.map(e => [e.email, e.slot || '', e.status, (e.reason || '').replace(/,/g, ';'), e.completedAt ? new Date(e.completedAt).toLocaleString() : '', new Date(e.createdAt).toLocaleString()]);
      const csv = [header, ...rows].map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${job.uploadedFile.replace(/\.[^.]+$/, '')}_${statusFilter}.csv`;
      a.click();
      addToast(`Exported ${filtered.length} records!`, 'success');
    } catch { addToast('Export failed', 'error'); }
    finally { setExp(key, false); }
  };

  const exportJobCookiesZip = async (job) => {
    const key = `${job._id}_cookies`;
    setExp(key, true);
    try {
      const res = await fetch(`http://localhost:5000/api/emails/file-details?jobId=${job._id}&page=1&limit=10000`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (!data.success) throw new Error('Failed');

      const successEmails = data.data.filter(e => e.status === 'success' && e.cookies?.length > 0);
      if (successEmails.length === 0) { addToast('No cookies found', 'error'); return; }

      const zip = new JSZip();
      const folderName = job.uploadedFile.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_\-]/g, '_');
      const folder = zip.folder(folderName);

      for (const e of successEmails) {
        folder.file(`${e.email}.json`, JSON.stringify({
          email: e.email,
          cookies: e.cookies
        }, null, 2));
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${folderName}_cookies.zip`;
      a.click(); URL.revokeObjectURL(url);
      addToast(`${successEmails.length} JSON files exported!`, 'success');
    } catch { addToast('Cookies export failed', 'error'); }
    finally { setExp(key, false); }
  };

  const Spinner = () => <span className="spinner" style={{ width: '13px', height: '13px', borderWidth: '2px' }} />;

  return (
    <>
      <ToastContainer toasts={toasts} />
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Filtered Data"
        message={`Are you sure you want to permanently delete ${deleteLabel}? This action cannot be undone.`}
        onConfirm={handleDeleteAll}
        onCancel={() => setShowDeleteConfirm(false)}
        loading={deleting}
        type="danger"
        confirmText="Delete"
      />
      <div className="purchase-container">

        {/* ── Global Filter & Export Section ── */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <Globe size={18} color="var(--accent-primary)" />
            <h3 style={{ margin: 0 }}>Global Report — Filter by Slot</h3>
          </div>
          <p className="card-subtitle" style={{ marginBottom: '20px' }}>
            Filter across all jobs by slot name and export combined reports.
          </p>

          {/* Filter Row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={14} color="var(--text-muted)" />
              <select className="filter-select" value={globalSlot} onChange={e => setGlobalSlot(e.target.value)} style={{ minWidth: '160px' }}>
                <option value="all">All Slots</option>
                {slots.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <select className="filter-select" value={globalStatus} onChange={e => setGlobalStatus(e.target.value)} style={{ minWidth: '140px' }}>
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
            {globalStats && (
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                <b style={{ color: 'var(--text-primary)' }}>{globalStats.total}</b> records found
              </span>
            )}
          </div>

          {/* Global Export Buttons */}
          <div className="report-export-grid">
            <div className="report-export-card">
              <div className="report-export-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399' }}><CheckCircle2 size={20} /></div>
              <div className="report-export-info">
                <div className="report-export-title">Success Export</div>
                <div className="report-export-desc">All success by slot filter</div>
              </div>
              <button className="report-export-btn success-export-btn" onClick={() => globalExportCSV('success')} disabled={!!globalExporting}>
                {globalExporting === 'global_success' ? <Spinner /> : <Download size={14} />} Export CSV
              </button>
            </div>

            <div className="report-export-card">
              <div className="report-export-icon" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}><XCircle size={20} /></div>
              <div className="report-export-info">
                <div className="report-export-title">Failed Export</div>
                <div className="report-export-desc">All failed by slot filter</div>
              </div>
              <button className="report-export-btn failed-export-btn" onClick={() => globalExportCSV('failed')} disabled={!!globalExporting}>
                {globalExporting === 'global_failed' ? <Spinner /> : <Download size={14} />} Export CSV
              </button>
            </div>

            <div className="report-export-card">
              <div className="report-export-icon" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}><Cookie size={20} /></div>
              <div className="report-export-info">
                <div className="report-export-title">Cookies ZIP</div>
                <div className="report-export-desc">Per-email JSON in zip</div>
              </div>
              <button className="report-export-btn cookies-export-btn" onClick={globalExportCookiesZip} disabled={!!globalExporting}>
                {globalExporting === 'global_cookies' ? <Spinner /> : <Download size={14} />} Export ZIP
              </button>
            </div>

            <div className="report-export-card">
              <div className="report-export-icon" style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171' }}><Trash2 size={20} /></div>
              <div className="report-export-info">
                <div className="report-export-title">Delete Filtered Data</div>
                  <div className="report-export-desc">
                    {globalSlot !== 'all' && globalStatus !== 'all'
                      ? `Slot "${globalSlot}" + ${globalStatus}`
                      : globalSlot !== 'all'
                      ? `Slot "${globalSlot}" — all status`
                      : globalStatus !== 'all'
                      ? `All "${globalStatus}" emails`
                      : 'All emails (no filter active)'}
                  </div>
              </div>
              {!showDeleteConfirm ? (
                <button className="report-export-btn failed-export-btn" onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 size={14} /> Delete
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* ── Per-Job Reports ── */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <FileText size={18} color="var(--accent-primary)" />
            <h3 style={{ margin: 0 }}>Job-wise Reports</h3>
          </div>
          <p className="card-subtitle" style={{ marginBottom: '20px' }}>Export reports per individual job.</p>

          {loading ? (
            <div className="loading-state"><span className="spinner" style={{ width: '24px', height: '24px', borderWidth: '3px' }} /><p>Loading...</p></div>
          ) : jobs.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon"><AlertTriangle size={40} /></div><div className="empty-state-title">No jobs found</div></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {jobs.map(job => (
                <div key={job._id} className="report-job-card">
                  <div className="report-job-header" onClick={() => setExpandedJob(expandedJob === job._id ? null : job._id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                      <FileSpreadsheet size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.uploadedFile}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {new Date(job.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • {job.totalEmails} emails
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
                      <div style={{ display: 'flex', gap: '10px', fontSize: '12px', fontWeight: 700 }}>
                        <span style={{ color: '#34d399' }}>✓ {job.successCount}</span>
                        <span style={{ color: '#f87171' }}>✗ {job.failedCount}</span>
                        <span style={{ color: '#fbbf24' }}>⏳ {job.pendingCount}</span>
                      </div>
                      <span className={`status-badge status-${job.status}`}>{job.status}</span>
                      {expandedJob === job._id ? <ChevronUp size={15} color="var(--text-muted)" /> : <ChevronDown size={15} color="var(--text-muted)" />}
                    </div>
                  </div>

                  {expandedJob === job._id && (
                    <div className="report-export-grid">
                      <div className="report-export-card">
                        <div className="report-export-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399' }}><CheckCircle2 size={18} /></div>
                        <div className="report-export-info"><div className="report-export-title">Success</div><div className="report-export-desc">{job.successCount} emails</div></div>
                        <button className="report-export-btn success-export-btn" onClick={() => exportJobCSV(job, 'success')} disabled={job.successCount === 0 || isExp(`${job._id}_success`)}>
                          {isExp(`${job._id}_success`) ? <Spinner /> : <Download size={13} />} CSV
                        </button>
                      </div>
                      <div className="report-export-card">
                        <div className="report-export-icon" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}><XCircle size={18} /></div>
                        <div className="report-export-info"><div className="report-export-title">Failed</div><div className="report-export-desc">{job.failedCount} emails</div></div>
                        <button className="report-export-btn failed-export-btn" onClick={() => exportJobCSV(job, 'failed')} disabled={job.failedCount === 0 || isExp(`${job._id}_failed`)}>
                          {isExp(`${job._id}_failed`) ? <Spinner /> : <Download size={13} />} CSV
                        </button>
                      </div>
                      <div className="report-export-card">
                        <div className="report-export-icon" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}><Cookie size={18} /></div>
                        <div className="report-export-info"><div className="report-export-title">Cookies ZIP</div><div className="report-export-desc">{job.successCount} JSON files</div></div>
                        <button className="report-export-btn cookies-export-btn" onClick={() => exportJobCookiesZip(job)} disabled={job.successCount === 0 || isExp(`${job._id}_cookies`)}>
                          {isExp(`${job._id}_cookies`) ? <Spinner /> : <Download size={13} />} ZIP
                        </button>
                      </div>
                      <div className="report-export-card">
                        <div className="report-export-icon" style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa' }}><FileSpreadsheet size={18} /></div>
                        <div className="report-export-info"><div className="report-export-title">Full Report</div><div className="report-export-desc">{job.totalEmails} emails</div></div>
                        <button className="report-export-btn full-export-btn" onClick={() => exportJobCSV(job, 'all')} disabled={job.totalEmails === 0 || isExp(`${job._id}_all`)}>
                          {isExp(`${job._id}_all`) ? <Spinner /> : <Download size={13} />} CSV
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Reports;
