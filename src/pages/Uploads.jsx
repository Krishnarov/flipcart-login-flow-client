import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, Play, Square, Trash2, Folder, Mail, Zap, XCircle, Download, FileText, UploadCloud, Inbox } from 'lucide-react';
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

function Uploads({ onUploadSuccess }) {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  const [filesList, setFilesList] = useState([]);
  const [filesLoading, setFilesLoading] = useState(true);
  
  const [tableParams, setTableParams] = useState({ page: 1, limit: 10, search: '', sortField: 'createdAt', sortOrder: 'desc', startDate: '', endDate: '' });
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [globalStats, setGlobalStats] = useState({ jobs: 0, total: 0, success: 0, failed: 0, runningJobs: 0 });

  const [automationLoading, setAutomationLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);

  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = 'success') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', message: '', action: null });

  const fetchData = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) return;

      const statsRes = await fetch(`${import.meta.env.VITE_API_URL}/api/emails/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      if (statsData.success) {
        setGlobalStats(statsData.stats);
      }

      const params = new URLSearchParams({
        page: tableParams.page,
        limit: tableParams.limit,
        search: tableParams.search,
        sortField: tableParams.sortField,
        sortOrder: tableParams.sortOrder,
        startDate: tableParams.startDate,
        endDate: tableParams.endDate
      });

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/emails/files?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFilesList(data.data);
        setTotalRecords(data.totalRecords);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setFilesLoading(false);
    }
  }, [tableParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handleJobUpdate = () => {
      fetchData();
    };
    socket.on('job-update', handleJobUpdate);
    return () => {
      socket.off('job-update', handleJobUpdate);
    };
  }, [fetchData]);

  const handleTableChange = (params) => {
    setTableParams(params);
  };

  const handleExport = async () => {
    const token = sessionStorage.getItem('token');
    if (!token) return;
    const params = new URLSearchParams({
      type: 'files',
      search: tableParams.search,
      startDate: tableParams.startDate,
      endDate: tableParams.endDate
    });
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/emails/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Export failed');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Automation_Jobs_${new Date().getTime()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      addToast('Failed to export Excel', 'error');
    }
  };

  const handleStartAutomation = async (jobId) => {
    setAutomationLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/emails/start-automation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ jobId, headless: true })
      });
      const data = await res.json();
      addToast(data.message, data.success ? 'success' : 'error');
    } catch (_) {
      addToast('Failed to start automation', 'error');
    } finally {
      setAutomationLoading(false);
    }
  };

  const handleStopAutomation = (jobId) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Stop Automation',
      message: 'Are you sure you want to stop this job? In-progress emails may fail.',
      action: async () => {
        setAutomationLoading(true);
        try {
          const token = sessionStorage.getItem('token');
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/emails/stop-automation`, {
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

  const handleSoftDelete = (jobId) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Move to Trash',
      message: 'Are you sure you want to move this job to the trash?',
      action: async () => {
        setDeleteLoading(jobId);
        try {
          const token = sessionStorage.getItem('token');
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/emails/soft-delete/${jobId}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          addToast(data.message, data.success ? 'success' : 'error');
        } catch (_) {
          addToast('Failed to move job to trash', 'error');
        } finally {
          setDeleteLoading(null);
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const validateAndSetFile = (f) => {
    const validExts = ['.xlsx', '.xls'];
    const isValid = validExts.some(ext => f.name.toLowerCase().endsWith(ext));
    if (!isValid) {
      addToast('Please select a valid Excel file (.xlsx or .xls)', 'error');
      setFile(null);
      return;
    }
    setFile(f);
  };

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) validateAndSetFile(e.dataTransfer.files[0]);
  };
  const handleFileChange = (e) => {
    if (e.target.files?.[0]) validateAndSetFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploadLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/emails/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      addToast(data.message, 'success');
      setFile(null);
      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDownloadSample = () => {
    const csv = '"Email","Slot"\n"admin@gmail.com","Slot A"\n"user1@example.com","Slot B"\n"user2@example.com","Slot C"';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'sample_emails_template.csv';
    a.style.visibility = 'hidden';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const columns = [
    {
      label: 'Job Details',
      key: 'uploadedFile',
      render: (job) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {job.uploadedFile}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {job.totalEmails} emails • {new Date(job.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      )
    },
    {
      label: 'Status',
      key: 'status',
      render: (job) => <span className={`status-badge status-${job.status}`}>{job.status}</span>
    },
    {
      label: 'Progress',
      key: 'progress',
      sortable: false,
      render: (job) => {
        const pctSuccess = job.successPercentage || 0;
        const pctFailed = job.failedPercentage || 0;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '150px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
              <span style={{ color: '#34d399' }}>{job.successCount} Success</span>
              <span style={{ color: '#f87171' }}>{job.failedCount} Failed</span>
            </div>
            <div style={{ display: 'flex', height: '6px', borderRadius: '9999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ width: `${pctSuccess}%`, background: 'linear-gradient(90deg, #10b981, #34d399)' }} />
              <div style={{ width: `${pctFailed}%`, background: '#f87171' }} />
            </div>
          </div>
        );
      }
    },
    {
      label: 'Actions',
      key: 'actions',
      sortable: false,
      align: 'right',
      render: (job) => {
        const isActive = job.status === 'running';
        return (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
            {isActive ? (
              <button
                type="button"
                className="job-action-stop"
                onClick={() => handleStopAutomation(job._id)}
                disabled={automationLoading}
                style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Square size={14} fill="currentColor" /> Stop
              </button>
            ) : (
              <button
                type="button"
                className="job-action-start"
                onClick={() => handleStartAutomation(job._id)}
                disabled={automationLoading}
                style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Play size={14} fill="currentColor" /> Start
              </button>
            )}
            <button
              type="button"
              title="Move to trash"
              onClick={() => handleSoftDelete(job._id)}
              disabled={isActive || deleteLoading === job._id || automationLoading}
              style={{
                padding: '6px 10px',
                fontSize: '14px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'var(--transition)',
                opacity: isActive ? 0.3 : 1
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
            >
              {deleteLoading === job._id ? <span className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px' }} /> : <Trash2 size={16} />}
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <>
      <ToastContainer toasts={toasts} />

      <div className="purchase-container">
        <div className="live-stats-row">
          <div className="live-stat-card" style={{ '--stat-gradient': 'linear-gradient(135deg, #6d28d9, #8b5cf6)', '--stat-glow': 'rgba(139,92,246,0.4)' }}>
            <span className="live-stat-icon"><Folder size={24} /></span>
            <div className="live-stat-info">
              <span className="live-stat-value">{globalStats.jobs}</span>
              <span className="live-stat-label">Total Jobs</span>
            </div>
          </div>
          <div className="live-stat-card" style={{ '--stat-gradient': 'linear-gradient(135deg, #1d4ed8, #3b82f6)', '--stat-glow': 'rgba(59,130,246,0.4)' }}>
            <span className="live-stat-icon"><Mail size={24} /></span>
            <div className="live-stat-info">
              <span className="live-stat-value">{globalStats.total.toLocaleString()}</span>
              <span className="live-stat-label">Total Emails</span>
            </div>
          </div>
          <div className="live-stat-card" style={{ '--stat-gradient': 'linear-gradient(135deg, #065f46, #10b981)', '--stat-glow': 'rgba(16,185,129,0.4)' }}>
            <span className="live-stat-icon"><CheckCircle2 size={24} /></span>
            <div className="live-stat-info">
              <span className="live-stat-value" style={{ color: '#34d399' }}>{globalStats.success.toLocaleString()}</span>
              <span className="live-stat-label">Successful</span>
            </div>
          </div>
          <div className="live-stat-card" style={{ '--stat-gradient': 'linear-gradient(135deg, #7f1d1d, #ef4444)', '--stat-glow': 'rgba(239,68,68,0.4)' }}>
            <span className="live-stat-icon">{globalStats.runningJobs > 0 ? <Zap size={24} /> : <XCircle size={24} />}</span>
            <div className="live-stat-info">
              <span className="live-stat-value" style={{ color: globalStats.runningJobs > 0 ? '#60a5fa' : '#f87171' }}>
                {globalStats.runningJobs > 0 ? globalStats.runningJobs : globalStats.failed.toLocaleString()}
              </span>
              <span className="live-stat-label">{globalStats.runningJobs > 0 ? 'Running Now' : 'Failed'}</span>
            </div>
          </div>
        </div>

        <div className="card upload-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '8px' }}>
            <div style={{ flex: '1 1 280px' }}>
              <h3>Upload Emails Excel Sheet</h3>
              <p className="card-subtitle" style={{ marginBottom: 0 }}>
                Upload a spreadsheet with <strong>Email</strong> and <strong>Slot</strong> columns. Duplicates are removed automatically and sorted A→Z.
              </p>
            </div>
            <button type="button" className="browse-btn" onClick={handleDownloadSample} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Download size={16} /> Sample CSV
            </button>
          </div>

          <form onDragEnter={handleDrag} onSubmit={handleUpload} className="upload-form">
            <input type="file" id="excel-file-input" className="file-input-hidden" accept=".xlsx,.xls" onChange={handleFileChange} />
            <label htmlFor="excel-file-input" className={`dropzone ${dragActive ? 'drag-active' : ''} ${file ? 'file-selected' : ''}`} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}>
              <div className="dropzone-content">
                <span className="upload-icon" style={{ color: 'var(--text-muted)' }}>{file ? <FileText size={36} /> : <UploadCloud size={40} />}</span>
                {file ? (
                  <>
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">{(file.size / 1024).toFixed(2)} KB</span>
                    <span className="change-file-text">Click to choose a different file</span>
                  </>
                ) : (
                  <>
                    <span className="drop-text">Drag and drop your Excel file here</span>
                    <span className="or-text">or</span>
                    <span className="browse-btn">Browse Files</span>
                  </>
                )}
              </div>
            </label>
            <button type="submit" className="upload-submit-btn" disabled={!file || uploadLoading}>
              {uploadLoading ? <><span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} /> Processing...</> : 'Import Emails →'}
            </button>
          </form>
        </div>

        <div className="card preview-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3>Automation Jobs</h3>
              <p className="card-subtitle" style={{ marginBottom: 0 }}>
                Click on any row to view email details and control automation.
              </p>
            </div>
            {globalStats.runningJobs > 0 && (
              <span className="status-badge status-running" style={{ fontSize: '12px', padding: '6px 14px' }}>
                {globalStats.runningJobs} Running
              </span>
            )}
          </div>

          {filesLoading ? (
            <div className="loading-state">
              <span className="spinner" style={{ width: '28px', height: '28px', borderWidth: '3px' }} />
              <p>Loading jobs...</p>
            </div>
          ) : (
            <DataTable 
              data={filesList}
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
              onRowClick={(job) => navigate(`/job/${job._id}`)}
            />
          )}
        </div>
      </div>
      
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.action}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        loading={automationLoading || deleteLoading !== null}
        type={confirmConfig.title.includes('Trash') ? 'danger' : 'danger'}
        confirmText={confirmConfig.title.includes('Trash') ? 'Move to Trash' : 'Stop Automation'}
      />
    </>
  );
}

export default Uploads;
