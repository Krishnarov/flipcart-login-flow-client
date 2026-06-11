import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, LayoutDashboard, Bot, Trash2, Settings as SettingsIcon, LogOut, Folder, Mail, CheckCircle2, XCircle, Zap, ArrowRight, Activity, Terminal, BarChart2 } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line, Area, AreaChart } from 'recharts';
import Uploads from './Uploads';
import Trash from './Trash';
import JobDetails from './JobDetails';
import Settings from './Settings';
import Reports from './Reports';
import { socket } from '../socket';

const LOG_ICONS = { step: '▶', success: '✅', error: '❌', warn: '⚠️', info: '•' };
const MAX_LOGS = 60;

function Dashboard({ user, onLogout, activeTab }) {
  const [globalStats, setGlobalStats] = useState({ jobs: 0, total: 0, success: 0, failed: 0 });
  const [recentJobs, setRecentJobs] = useState([]);
  const [runningJobs, setRunningJobs] = useState(0);
  const [globalLogs, setGlobalLogs] = useState([]);
  const [dailyStats, setDailyStats] = useState([]);
  const dashLogRef = useRef(null);
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

      // Fetch Daily Stats
      const dailyRes = await fetch('http://localhost:5000/api/emails/daily-stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dailyData = await dailyRes.json();
      if (dailyData.success) setDailyStats(dailyData.data);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  };

  useEffect(() => {
    if (dashLogRef.current) dashLogRef.current.scrollTop = dashLogRef.current.scrollHeight;
  }, [globalLogs]);

  useEffect(() => {
    fetchStats();
    const handleJobUpdate = () => { fetchStats(); };
    const handleLog = (data) => {
      setGlobalLogs(prev => {
        const entry = { ...data, id: Date.now() + Math.random() };
        const next = [...prev, entry];
        return next.length > MAX_LOGS ? next.slice(next.length - MAX_LOGS) : next;
      });
    };
    socket.on('job-update', handleJobUpdate);
    socket.on('automation-log', handleLog);
    return () => {
      socket.off('job-update', handleJobUpdate);
      socket.off('automation-log', handleLog);
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
            className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => navigate('/reports')}
          >
            <span className="nav-icon"><BarChart2 size={18} /></span>
            <span className="nav-label">Reports</span>
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
               : activeTab === 'reports' ? 'Reports'
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

              {/* Live Log Panel on Dashboard */}
              {globalLogs.length > 0 && (
                <div className="live-log-panel" style={{ marginBottom: '24px' }}>
                  <div className="live-log-header">
                    <span className="live-log-title">
                      <Terminal size={13} />
                      Live Automation Log
                      {runningJobs > 0 && <span className="live-log-pulse" />}
                    </span>
                    <button type="button" className="live-log-clear-btn" onClick={() => setGlobalLogs([])}>Clear</button>
                  </div>
                  <div className="live-log-box" ref={dashLogRef}>
                    {globalLogs.map(log => (
                      <div key={log.id} className={`live-log-line log-type-${log.type}`}>
                        <span className="live-log-time">{new Date(log.time).toLocaleTimeString('en-IN', { hour12: false })}</span>
                        <span className="live-log-icon">{LOG_ICONS[log.type] || '•'}</span>
                        {log.email && <span className="live-log-email">{log.email}</span>}
                        <span className="live-log-msg">{log.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Row 1: Donut + Daily Area Chart */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '20px' }}>

                {/* Donut Chart */}
                <div className="card" style={{ margin: 0, padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <BarChart2 size={16} color="var(--accent-primary)" />
                    <h3 style={{ margin: 0, fontSize: '14px' }}>Email Status</h3>
                  </div>
                  {globalStats.total === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '40px 0' }}>No data yet</div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie data={[
                            { name: 'Success', value: globalStats.success },
                            { name: 'Failed', value: globalStats.failed },
                            { name: 'Pending', value: Math.max(0, globalStats.total - globalStats.success - globalStats.failed) }
                          ]} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                            <Cell fill="#10b981" /><Cell fill="#ef4444" /><Cell fill="#f59e0b" />
                          </Pie>
                          <Tooltip contentStyle={{ background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px' }}>
                        {[{ label: 'Success', val: globalStats.success, color: '#10b981' }, { label: 'Failed', val: globalStats.failed, color: '#ef4444' }, { label: 'Pending', val: Math.max(0, globalStats.total - globalStats.success - globalStats.failed), color: '#f59e0b' }].map(item => (
                          <div key={item.label} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '15px', fontWeight: 800, color: item.color }}>{item.val.toLocaleString()}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>{item.label}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Daily Area Chart */}
                <div className="card" style={{ margin: 0, padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <Activity size={16} color="#60a5fa" />
                    <h3 style={{ margin: 0, fontSize: '14px' }}>Daily Activity (Last 14 Days)</h3>
                  </div>
                  {dailyStats.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '40px 0' }}>No activity yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={dailyStats} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gSuccess" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="gFailed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', fontSize: '12px' }}
                          labelStyle={{ color: '#fff', fontWeight: 700, marginBottom: '4px' }}
                          itemStyle={{ color: '#ccc' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
                        <Area type="monotone" dataKey="total" stroke="#60a5fa" fill="url(#gTotal)" strokeWidth={2} name="Total" dot={false} />
                        <Area type="monotone" dataKey="success" stroke="#10b981" fill="url(#gSuccess)" strokeWidth={2} name="Success" dot={false} />
                        <Area type="monotone" dataKey="failed" stroke="#ef4444" fill="url(#gFailed)" strokeWidth={2} name="Failed" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Row 2: Jobs Bar + Recent Activity + Quick Actions */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>

                {/* Jobs Bar Chart */}
                <div className="card" style={{ margin: 0, padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <Zap size={16} color="#f59e0b" />
                    <h3 style={{ margin: 0, fontSize: '14px' }}>Jobs Performance</h3>
                  </div>
                  {recentJobs.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '32px 0' }}>No jobs yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={recentJobs.map(j => ({ name: j.uploadedFile.replace(/\.xlsx?$/i, '').slice(0, 10), success: j.successCount, failed: j.failedCount, pending: j.pendingCount }))} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
                        <Legend wrapperStyle={{ fontSize: '10px', color: '#9ca3af' }} />
                        <Bar dataKey="success" fill="#10b981" radius={[3,3,0,0]} name="Success" />
                        <Bar dataKey="failed" fill="#ef4444" radius={[3,3,0,0]} name="Failed" />
                        <Bar dataKey="pending" fill="#f59e0b" radius={[3,3,0,0]} name="Pending" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Recent Activity */}
                <div className="card" style={{ margin: 0, padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Activity size={16} color="var(--accent-primary)" />
                      <h3 style={{ margin: 0, fontSize: '14px' }}>Recent Activity</h3>
                    </div>
                    <button type="button" className="text-btn" onClick={() => navigate('/uploads')} style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      View All <ArrowRight size={12} />
                    </button>
                  </div>
                  {recentJobs.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '24px 0' }}>No jobs found.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      {recentJobs.map(job => (
                        <div key={job._id} onClick={() => navigate(`/job/${job._id}`)}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '7px', cursor: 'pointer', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.uploadedFile}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>
                              {new Date(job.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} • {job.totalEmails} emails
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                            <span style={{ color: '#34d399' }}>✓{job.successCount}</span>
                            <span style={{ color: '#f87171' }}>✗{job.failedCount}</span>
                          </div>
                          <span className={`status-badge status-${job.status}`} style={{ flexShrink: 0, fontSize: '10px', padding: '2px 7px' }}>{job.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="card" style={{ margin: 0, padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <Zap size={16} color="#f59e0b" />
                    <h3 style={{ margin: 0, fontSize: '14px' }}>Quick Actions</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[{ label: 'New Automation', desc: 'Upload Excel to start', icon: <Bot size={18} />, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', path: '/uploads' },
                      { label: 'View Trash', desc: 'Restore or delete jobs', icon: <Trash2 size={18} />, color: '#ef4444', bg: 'rgba(239,68,68,0.1)', path: '/trash' },
                      { label: 'Reports', desc: 'Export job reports', icon: <BarChart2 size={18} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', path: '/reports' },
                      { label: 'Settings', desc: 'Change UI themes', icon: <SettingsIcon size={18} />, color: '#6b7280', bg: 'rgba(255,255,255,0.05)', path: '/settings' }
                    ].map(item => (
                      <button key={item.label} type="button"
                        onClick={() => navigate(item.path)}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', transition: 'var(--transition)', width: '100%' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = item.color; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                      >
                        <div style={{ padding: '7px', background: item.bg, borderRadius: '7px', color: item.color, flexShrink: 0 }}>{item.icon}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{item.label}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'reports' ? (
            <Reports />
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
