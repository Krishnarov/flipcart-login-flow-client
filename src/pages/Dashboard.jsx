import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, LayoutDashboard, Bot, Trash2, Settings as SettingsIcon, LogOut, Folder, Mail, CheckCircle2, XCircle, Zap, ArrowRight, Activity, Clock } from 'lucide-react';
import Uploads from './Uploads';
import Trash from './Trash';
import JobDetails from './JobDetails';
import Settings from './Settings';
import { socket } from '../socket';

function Dashboard({ user, onLogout, activeTab }) {
  const [globalStats, setGlobalStats] = useState({ jobs: 0, total: 0, success: 0, failed: 0 });
  const [recentJobs, setRecentJobs] = useState([]);
  const [runningJobs, setRunningJobs] = useState(0);
  const navigate = useNavigate();

  const fetchStats = async () => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) return;
      
      // Fetch Global Stats
      const statsRes = await fetch('http://localhost:5000/api/emails/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      if (statsData.success) {
        setGlobalStats({
          jobs: statsData.stats.jobs,
          total: statsData.stats.total,
          success: statsData.stats.success,
          failed: statsData.stats.failed
        });
        setRunningJobs(statsData.stats.runningJobs || 0);
      }

      // Fetch Recent Jobs
      const filesRes = await fetch('http://localhost:5000/api/emails/files?page=1&limit=5', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const filesData = await filesRes.json();
      if (filesData.success) {
        setRecentJobs(filesData.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  };

  useEffect(() => {
    fetchStats();
    
    const handleJobUpdate = () => {
      fetchStats();
    };

    socket.on('job-update', handleJobUpdate);
    return () => {
      socket.off('job-update', handleJobUpdate);
    };
  }, [activeTab]);

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="logo-icon"><Key size={24} color="var(--accent-primary)" /></span>
          <h2>Login Flow</h2>
        </div>
        <nav className="sidebar-nav">
          <button 
            type="button" 
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => navigate('/dashboard')}
          >
            <span className="nav-icon"><LayoutDashboard size={18} /></span>
            <span className="nav-label">Dashboard</span>
          </button>
          <button 
            type="button" 
            className={`nav-item ${activeTab === 'uploads' ? 'active' : ''}`}
            onClick={() => navigate('/uploads')}
          >
            <span className="nav-icon"><Bot size={18} /></span>
            <span className="nav-label">Automation</span>
          </button>
          <button 
            type="button" 
            className={`nav-item ${activeTab === 'trash' ? 'active' : ''}`}
            onClick={() => navigate('/trash')}
          >
            <span className="nav-icon"><Trash2 size={18} /></span>
            <span className="nav-label">Trash</span>
          </button>
          <button 
            type="button" 
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => navigate('/settings')}
          >
            <span className="nav-icon"><SettingsIcon size={18} /></span>
            <span className="nav-label">Settings</span>
          </button>
        </nav>
        <div className="sidebar-footer">
          <button type="button" className="logout-btn" onClick={onLogout}>
            <span className="nav-icon"><LogOut size={18} /></span>
            <span className="nav-label">Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Header */}
        <header className="content-header">
          <div className="header-title">
            <h1>
              {activeTab === 'overview' ? 'Dashboard' 
               : activeTab === 'trash' ? 'Trash' 
               : activeTab === 'job' ? 'Job Details'
               : activeTab === 'settings' ? 'Settings'
               : 'Login Automation'}
            </h1>
            <p>Welcome back, {user.email}</p>
          </div>
          <div className="user-profile">
            <div className="avatar">{user.email[0].toUpperCase()}</div>
            <span className="user-email">{user.email}</span>
          </div>
        </header>

        {/* Content Body */}
        <div className="content-body">
          {activeTab === 'overview' ? (
            <div className="overview-container">
              {/* ── Live Stats Row ── */}
              <div className="live-stats-row" style={{ marginBottom: '24px' }}>
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
                  <span className="live-stat-icon">{runningJobs > 0 ? <Zap size={24} /> : <XCircle size={24} />}</span>
                  <div className="live-stat-info">
                    <span className="live-stat-value" style={{ color: runningJobs > 0 ? '#60a5fa' : '#f87171' }}>
                      {runningJobs > 0 ? runningJobs : globalStats.failed.toLocaleString()}
                    </span>
                    <span className="live-stat-label">{runningJobs > 0 ? 'Running Now' : 'Failed'}</span>
                  </div>
                </div>
              </div>

              <div className="dashboard-content-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'flex-start' }}>
                {/* ── Recent Activity Table ── */}
                <div className="card" style={{ margin: 0, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Activity size={20} color="var(--accent-primary)" />
                      <h3 style={{ margin: 0 }}>Recent Activity</h3>
                    </div>
                    <button type="button" className="text-btn" onClick={() => navigate('/uploads')} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      View All <ArrowRight size={14} />
                    </button>
                  </div>
                  
                  {recentJobs.length === 0 ? (
                    <div className="empty-state" style={{ padding: '32px 0' }}>
                      <p style={{ color: 'var(--text-muted)' }}>No recent jobs found.</p>
                    </div>
                  ) : (
                    <div className="table-responsive" style={{ margin: '0 -24px -24px -24px', borderRadius: '0 0 12px 12px', overflowX: 'auto' }}>
                      <table className="data-table" style={{ borderBottom: 'none', width: '100%', minWidth: '400px' }}>
                        <thead>
                          <tr>
                            <th>Job Name</th>
                            <th>Status</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentJobs.map(job => (
                            <tr key={job._id} onClick={() => navigate(`/job/${job._id}`)} style={{ cursor: 'pointer' }}>
                              <td>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)', maxWidth: '200px', display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {job.uploadedFile}
                                </span>
                              </td>
                              <td><span className={`status-badge status-${job.status}`}>{job.status}</span></td>
                              <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                                {new Date(job.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* ── Quick Actions ── */}
                <div className="card" style={{ margin: 0, padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                    <Zap size={20} color="#f59e0b" />
                    <h3 style={{ margin: 0 }}>Quick Actions</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button 
                      className="quick-action-btn"
                      onClick={() => navigate('/uploads')}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', transition: 'var(--transition)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                    >
                      <div style={{ padding: '10px', background: 'rgba(139,92,246,0.1)', borderRadius: '10px', color: '#8b5cf6' }}>
                        <Bot size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px', color: 'var(--text-primary)' }}>New Automation</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Upload Excel to start</div>
                      </div>
                    </button>
                    
                    <button 
                      className="quick-action-btn"
                      onClick={() => navigate('/trash')}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', transition: 'var(--transition)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = '#ef4444'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                    >
                      <div style={{ padding: '10px', background: 'rgba(239,68,68,0.1)', borderRadius: '10px', color: '#ef4444' }}>
                        <Trash2 size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px', color: 'var(--text-primary)' }}>View Trash</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Restore or delete jobs</div>
                      </div>
                    </button>

                    <button 
                      className="quick-action-btn"
                      onClick={() => navigate('/settings')}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', transition: 'var(--transition)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'var(--text-muted)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                    >
                      <div style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', color: 'var(--text-muted)' }}>
                        <SettingsIcon size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px', color: 'var(--text-primary)' }}>Settings</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Change UI themes</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'trash' ? (
            <Trash />
          ) : activeTab === 'job' ? (
            <JobDetails />
          ) : activeTab === 'settings' ? (
            <Settings />
          ) : (
            <Uploads onUploadSuccess={fetchStats} />
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
