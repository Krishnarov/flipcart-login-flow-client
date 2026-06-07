import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Moon, Sun } from 'lucide-react';

function Settings() {
  const [currentTheme, setCurrentTheme] = useState('default');
  const [currentMode, setCurrentMode] = useState('dark');
  const [currentFont, setCurrentFont] = useState('plusjakarta');
  const [bgImage, setBgImage] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const fileInputRef = useRef(null);

  const themes = [
    { id: 'default', name: 'Default Slate', bg: '#090b11', accent: '#8b5cf6' },
    { id: 'ocean', name: 'Ocean Blue', bg: '#0f172a', accent: '#0ea5e9' },
    { id: 'hacker', name: 'Hacker Green', bg: '#000000', accent: '#22c55e' },
    { id: 'crimson', name: 'Crimson Red', bg: '#1a0505', accent: '#ef4444' },
    { id: 'sunset', name: 'Sunset Orange', bg: '#1a0a00', accent: '#f97316' },
    { id: 'cyberpunk', name: 'Cyberpunk Yellow', bg: '#141400', accent: '#eab308' },
    { id: 'amethyst', name: 'Amethyst Purple', bg: '#10051a', accent: '#a855f7' },
    { id: 'midnight', name: 'Midnight Blue', bg: '#000514', accent: '#3b82f6' },
    { id: 'cherry', name: 'Cherry Blossom', bg: '#1a0510', accent: '#ec4899' },
    { id: 'graphite', name: 'Graphite', bg: '#050505', accent: '#737373' },
    { id: 'neon', name: 'Neon Pink', bg: '#140014', accent: '#db2777' },
    { id: 'forest', name: 'Forest Green', bg: '#001405', accent: '#10b981' },
    { id: 'royal', name: 'Royal Gold', bg: '#141000', accent: '#d97706' }
  ];

  const fonts = [
    { id: 'plusjakarta', name: 'Plus Jakarta Sans (Default)' },
    { id: 'inter', name: 'Inter' },
    { id: 'poppins', name: 'Poppins' },
    { id: 'firacode', name: 'Fira Code' },
    { id: 'outfit', name: 'Outfit' }
  ];

  useEffect(() => {
    const savedTheme = localStorage.getItem('appTheme') || 'default';
    const savedMode = localStorage.getItem('appMode') || 'dark';
    const savedFont = localStorage.getItem('appFont') || 'plusjakarta';
    const savedBg = localStorage.getItem('appBgImage') || '';
    setCurrentTheme(savedTheme);
    setCurrentMode(savedMode);
    setCurrentFont(savedFont);
    setBgImage(savedBg);
  }, []);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const applyTheme = (theme) => {
    setCurrentTheme(theme);
    localStorage.setItem('appTheme', theme);
    if (theme && theme !== 'default') {
      document.body.dataset.theme = theme;
    } else {
      delete document.body.dataset.theme;
    }
    showToast(`Theme changed to ${theme}`);
  };

  const applyMode = (mode) => {
    setCurrentMode(mode);
    localStorage.setItem('appMode', mode);
    if (mode === 'light') {
      document.body.dataset.mode = 'light';
    } else {
      delete document.body.dataset.mode;
    }
    showToast(`Mode changed to ${mode}`);
  };

  const applyFont = (font) => {
    setCurrentFont(font);
    localStorage.setItem('appFont', font);
    document.body.dataset.font = font;
    showToast(`Font changed to ${font}`);
  };

  const applyBgImage = (url) => {
    setBgImage(url);
    if (url) {
      localStorage.setItem('appBgImage', url);
      document.body.style.backgroundImage = `url(${url})`;
    } else {
      localStorage.removeItem('appBgImage');
      document.body.style.backgroundImage = '';
    }
    showToast(url ? 'Background image updated' : 'Background image removed');
  };

  const handleUrlSave = (e) => {
    e.preventDefault();
    applyBgImage(bgImage);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('File too large. Please select an image under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Str = event.target.result;
      applyBgImage(base64Str);
    };
    reader.readAsDataURL(file);
  };

  const clearBgImage = () => {
    applyBgImage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="purchase-container" style={{ padding: '0 24px 24px', width: '100%' }}>
      {toastMessage && (
        <div className="toast-container">
          <div className="toast toast-success" style={{ borderRadius: '0' }}>
            <span className="toast-icon"><CheckCircle2 size={18} /></span>
            <span className="toast-msg">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Appearance Mode */}
      <div className="card preview-card" style={{ marginBottom: '24px', borderRadius: '0' }}>
        <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>Appearance Mode</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
          Choose between Dark and Light mode for the global interface.
        </p>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            onClick={() => applyMode('dark')}
            style={{
              flex: 1,
              padding: '16px',
              background: 'var(--bg-surface-elevated)',
              border: `2px solid ${currentMode === 'dark' ? 'var(--accent-primary)' : 'var(--border-light)'}`,
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              backdropFilter: 'blur(16px)'
            }}
          >
            <Moon size={24} />
            <strong>Dark Mode</strong>
          </button>
          <button
            onClick={() => applyMode('light')}
            style={{
              flex: 1,
              padding: '16px',
              background: 'var(--bg-surface-elevated)',
              border: `2px solid ${currentMode === 'light' ? 'var(--accent-primary)' : 'var(--border-light)'}`,
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              backdropFilter: 'blur(16px)'
            }}
          >
            <Sun size={24} />
            <strong>Light Mode</strong>
          </button>
        </div>
      </div>

      {/* Theme Selection */}
      <div className="card preview-card" style={{ marginBottom: '24px', borderRadius: '0' }}>
        <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>Theme Selection</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
          Choose a color palette for your dashboard. Changes apply instantly and are saved to your browser.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {themes.map(t => (
            <button
              key={t.id}
              onClick={() => applyTheme(t.id)}
              style={{
                padding: '16px',
                background: 'var(--bg-surface-elevated)',
                border: `2px solid ${currentTheme === t.id ? t.accent : 'var(--border-light)'}`,
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.2s',
                backdropFilter: 'blur(16px)'
              }}
            >
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ width: '20px', height: '20px', background: t.bg }}></div>
                <div style={{ width: '20px', height: '20px', background: t.accent }}></div>
              </div>
              <strong>{t.name}</strong>
            </button>
          ))}
        </div>
      </div>

      {/* Font Selection */}
      <div className="card preview-card" style={{ marginBottom: '24px', borderRadius: '0' }}>
        <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>Typography</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
          Select the base font family for the application.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
          {fonts.map(f => (
            <button
              key={f.id}
              onClick={() => applyFont(f.id)}
              style={{
                padding: '16px',
                background: 'var(--bg-surface-elevated)',
                border: `2px solid ${currentFont === f.id ? 'var(--accent-primary)' : 'var(--border-light)'}`,
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                backdropFilter: 'blur(16px)'
              }}
            >
              <span style={{ fontSize: '20px', fontWeight: 600, fontFamily: f.id === 'plusjakarta' ? '"Plus Jakarta Sans", sans-serif' : f.id === 'inter' ? '"Inter", sans-serif' : f.id === 'poppins' ? '"Poppins", sans-serif' : f.id === 'firacode' ? '"Fira Code", monospace' : '"Outfit", sans-serif' }}>Aa</span>
              <strong>{f.name}</strong>
            </button>
          ))}
        </div>
      </div>

      {/* Background Image Selection */}
      <div className="card preview-card" style={{ borderRadius: '0' }}>
        <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>Background Image</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
          Set a custom background image for the entire application. The image will be centered and cover the whole screen.
        </p>

        <form onSubmit={handleUrlSave} style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Image URL</label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              value={bgImage}
              onChange={(e) => setBgImage(e.target.value)}
              placeholder="https://example.com/image.jpg"
              style={{
                flex: 1,
                padding: '10px 14px',
                background: 'var(--bg-base)',
                border: '1px solid var(--border-light)',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              className="ctrl-btn-start"
              style={{ padding: '0 20px' }}
            >
              Save URL
            </button>
          </div>
        </form>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Or Upload Local Image (Max 5MB)</label>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileUpload}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px',
              background: 'var(--bg-base)',
              border: '1px dashed var(--border-light)',
              color: 'var(--text-muted)',
              cursor: 'pointer'
            }}
          />
        </div>

        {bgImage && (
          <div>
            <button
              type="button"
              className="ctrl-btn-stop"
              onClick={clearBgImage}
              style={{ padding: '8px 16px' }}
            >
              Remove Background Image
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Settings;
