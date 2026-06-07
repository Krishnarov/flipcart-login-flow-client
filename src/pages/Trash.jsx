import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, RotateCcw, Trash2, Sparkles, Inbox } from 'lucide-react';
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

function Trash() {
  const [trashList, setTrashList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set()); 
  const [actionLoading, setActionLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  
  const [tableParams, setTableParams] = useState({ page: 1, limit: 10, search: '', sortField: 'deletedAt', sortOrder: 'desc', startDate: '', endDate: '' });
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    action: null
  });

  const addToast = useCallback((message, type = 'success') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);

  const fetchTrash = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) return;

      const params = new URLSearchParams({
        page: tableParams.page,
        limit: tableParams.limit,
        search: tableParams.search,
        sortField: tableParams.sortField,
        sortOrder: tableParams.sortOrder,
        startDate: tableParams.startDate,
        endDate: tableParams.endDate
      });

      const res = await fetch(`http://localhost:5000/api/emails/trash?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTrashList(data.data);
        setTotalRecords(data.totalRecords);
        setTotalPages(data.totalPages);
        setSelected(new Set());
      }
    } catch (err) {
      console.error('Error fetching trash:', err);
      addToast('Failed to load trash', 'error');
    } finally {
      setLoading(false);
    }
  }, [tableParams, addToast]);

  useEffect(() => { 
    fetchTrash(); 
  }, [fetchTrash]);

  useEffect(() => {
    const handleJobUpdate = () => {
      fetchTrash();
    };
    socket.on('job-update', handleJobUpdate);
    return () => {
      socket.off('job-update', handleJobUpdate);
    };
  }, [fetchTrash]);

  const handleTableChange = (params) => {
    setTableParams(params);
  };

  const handleExport = async () => {
    const token = sessionStorage.getItem('token');
    if (!token) return;
    const params = new URLSearchParams({
      type: 'trash',
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
      a.download = `Trash_Jobs_${new Date().getTime()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      addToast('Failed to export Excel', 'error');
    }
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const restoreJobs = async (jobIds) => {
    setActionLoading(true);
    let successCount = 0;
    try {
      const token = sessionStorage.getItem('token');
      await Promise.allSettled(
        jobIds.map(async id => {
          const res = await fetch(`http://localhost:5000/api/emails/restore/${id}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.success) successCount++;
        })
      );
      addToast(`${successCount} job(s) restored successfully.`, 'success');
      fetchTrash();
    } catch (_) {
      addToast('Some jobs could not be restored.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const permanentDeleteJobs = async (jobIds) => {
    const count = jobIds.length;
    setConfirmConfig({
      isOpen: true,
      title: 'Permanent Delete',
      message: `Permanently delete ${count} job(s) and ALL their email records? This cannot be undone.`,
      action: async () => {
        setActionLoading(true);
        let successCount = 0;
        try {
          const token = sessionStorage.getItem('token');
          await Promise.allSettled(
            jobIds.map(async id => {
              const res = await fetch(`http://localhost:5000/api/emails/permanent-delete/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
              });
              const data = await res.json();
              if (data.success) successCount++;
            })
          );
          addToast(`${successCount} job(s) permanently deleted.`, 'success');
          fetchTrash();
        } catch (_) {
          addToast('Some jobs could not be deleted.', 'error');
        } finally {
          setActionLoading(false);
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const someSelected = selected.size > 0;

  const columns = [
    {
      label: 'File Name',
      key: 'uploadedFile',
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--text-primary)', maxWidth: '220px', display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {row.uploadedFile}
        </span>
      )
    },
    {
      label: 'Status',
      key: 'status',
      render: (row) => <span className={`status-badge status-${row.status}`}>{row.status}</span>
    },
    {
      label: 'Emails',
      key: 'totalEmails',
      align: 'center',
      render: (row) => <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{row.totalEmails}</span>
    },
    {
      label: 'Success',
      key: 'successCount',
      align: 'center',
      render: (row) => {
        const pct = row.totalEmails > 0 ? Math.round((row.successCount / row.totalEmails) * 100) : 0;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#34d399', fontWeight: 700, fontSize: '13px' }}>{row.successCount} ({pct}%)</span>
            <div style={{ width: '60px', height: '4px', borderRadius: '9999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #10b981, #34d399)', borderRadius: '9999px' }} />
            </div>
          </div>
        );
      }
    },
    {
      label: 'Deleted On',
      key: 'deletedAt',
      render: (row) => (
        <span style={{ color: '#fca5a5', fontSize: '12px', whiteSpace: 'nowrap' }}>
          {new Date(row.deletedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          <br />
          <span style={{ color: 'var(--text-muted)' }}>
            {new Date(row.deletedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </span>
      )
    },
    {
      label: 'Actions',
      key: 'actions',
      sortable: false,
      align: 'center',
      render: (row) => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'nowrap' }}>
          <button
            type="button"
            className="inline-retry-btn"
            style={{
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
              color: '#34d399', padding: '5px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px'
            }}
            onClick={(e) => { e.stopPropagation(); restoreJobs([row._id]); }}
            disabled={actionLoading}
            title="Restore job"
          >
            <RotateCcw size={14} /> Restore
          </button>
          <button
            type="button"
            className="inline-retry-btn"
            style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171', padding: '5px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px'
            }}
            onClick={(e) => { e.stopPropagation(); permanentDeleteJobs([row._id]); }}
            disabled={actionLoading}
            title="Permanently delete"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )
    }
  ];

  return (
    <>
      <ToastContainer toasts={toasts} />

      <div className="purchase-container">
        <div className="card" style={{ padding: '20px 24px', marginBottom: '0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ display: 'flex' }}><Trash2 size={32} /></span>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>Trash</h3>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                  {totalRecords} deleted job{totalRecords !== 1 ? 's' : ''} •
                  Restore or permanently delete
                </p>
              </div>
            </div>

            {someSelected && (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {selected.size} selected
                </span>
                <button
                  type="button"
                  className="ctrl-btn-start"
                  style={{ padding: '8px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => restoreJobs([...selected])}
                  disabled={actionLoading}
                >
                  {actionLoading ? <span className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px' }} /> : <RotateCcw size={14} />}
                  Restore Selected
                </button>
                <button
                  type="button"
                  className="ctrl-btn-stop"
                  style={{ padding: '8px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => permanentDeleteJobs([...selected])}
                  disabled={actionLoading}
                >
                  <Trash2 size={14} /> Delete Forever
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="card preview-card" style={{ marginTop: '16px' }}>
          {loading ? (
            <div className="loading-state">
              <span className="spinner" style={{ width: '28px', height: '28px', borderWidth: '3px' }} />
              <p>Loading trash...</p>
            </div>
          ) : trashList.length === 0 && tableParams.search === '' && tableParams.startDate === '' ? (
            <div className="empty-state" style={{ padding: '64px 0' }}>
              <div className="empty-state-icon" style={{ color: 'var(--text-muted)', marginBottom: '16px' }}><Sparkles size={56} /></div>
              <div className="empty-state-title">Trash is empty</div>
              <div className="empty-state-desc">
                Deleted automation jobs will appear here.<br />
                Permanently deleted jobs cannot be recovered.
              </div>
            </div>
          ) : (
            <>
              <DataTable 
                data={trashList}
                columns={columns}
                keyField="_id"
                selectable={true}
                selectedRows={selected}
                onSelectionChange={setSelected}
                serverSide={true}
                showFilters={true}
                currentPage={tableParams.page}
                limit={tableParams.limit}
                totalRecords={totalRecords}
                totalPages={totalPages}
                onTableChange={handleTableChange}
                onExport={handleExport}
              />

              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                  Click on a row to select it • Use the checkboxes for bulk actions
                </p>
                {someSelected && (
                  <button
                    type="button"
                    style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={() => setSelected(new Set())}
                  >
                    Clear selection
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.action}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        loading={actionLoading}
        type="danger"
        confirmText="Delete Forever"
      />
    </>
  );
}

export default Trash;
