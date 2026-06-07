import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import JobDetails from './pages/JobDetails';
import './App.css';

// Protected Route Guard: Redirects to /auth if no session token
function ProtectedRoute({ children }) {
  const token = sessionStorage.getItem('token');
  if (!token) {
    return <Navigate to="/auth" replace />;
  }
  return children;
}

// Public Route Guard: Redirects to /dashboard if session token already exists
function PublicRoute({ children }) {
  const token = sessionStorage.getItem('token');
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function MainApp() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Apply theme and background image globally
    const savedTheme = localStorage.getItem('appTheme') || 'default';
    const savedBg = localStorage.getItem('appBgImage');
    const savedMode = localStorage.getItem('appMode') || 'dark';
    const savedFont = localStorage.getItem('appFont') || 'plusjakarta';
    
    if (savedTheme && savedTheme !== 'default') {
      document.body.dataset.theme = savedTheme;
    } else {
      delete document.body.dataset.theme;
    }
    
    if (savedMode === 'light') {
      document.body.dataset.mode = 'light';
    } else {
      delete document.body.dataset.mode;
    }

    if (savedFont) {
      document.body.dataset.font = savedFont;
    }
    
    if (savedBg) {
      document.body.style.backgroundImage = `url(${savedBg})`;
    } else {
      document.body.style.backgroundImage = '';
    }

    // Check if token exists in sessionStorage to preserve user session
    const token = sessionStorage.getItem('token');
    const storedUser = sessionStorage.getItem('user');
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    navigate('/dashboard');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="app-loader">
        <span className="spinner"></span>
        <p>Loading application...</p>
      </div>
    );
  }

  return (
    <Routes>
      {/* Root route redirects based on authentication */}
      <Route 
        path="/" 
        element={
          sessionStorage.getItem('token') ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/auth" replace />
          )
        } 
      />

      {/* Public Auth Route */}
      <Route 
        path="/auth" 
        element={
          <PublicRoute>
            <Login onLoginSuccess={handleLoginSuccess} />
          </PublicRoute>
        } 
      />

      {/* Protected Dashboard Route */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard 
              user={user || JSON.parse(sessionStorage.getItem('user') || '{}')} 
              onLogout={handleLogout} 
              activeTab="overview" 
            />
          </ProtectedRoute>
        } 
      />

      {/* Protected Uploads Route */}
      <Route 
        path="/uploads" 
        element={
          <ProtectedRoute>
            <Dashboard 
              user={user || JSON.parse(sessionStorage.getItem('user') || '{}')} 
              onLogout={handleLogout} 
              activeTab="uploads" 
            />
          </ProtectedRoute>
        } 
      />

      {/* Protected Trash Route */}
      <Route
        path="/trash"
        element={
          <ProtectedRoute>
            <Dashboard
              user={user || JSON.parse(sessionStorage.getItem('user') || '{}')}
              onLogout={handleLogout}
              activeTab="trash"
            />
          </ProtectedRoute>
        }
      />

      {/* Protected Job Details Route */}
      <Route
        path="/job/:id"
        element={
          <ProtectedRoute>
            <Dashboard
              user={user || JSON.parse(sessionStorage.getItem('user') || '{}')}
              onLogout={handleLogout}
              activeTab="job"
            />
          </ProtectedRoute>
        }
      />

      {/* Protected Settings Route */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Dashboard
              user={user || JSON.parse(sessionStorage.getItem('user') || '{}')}
              onLogout={handleLogout}
              activeTab="settings"
            />
          </ProtectedRoute>
        }
      />

      {/* Catch-all redirects back to root */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <MainApp />
    </Router>
  );
}

export default App;
