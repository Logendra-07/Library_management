import { useState } from 'react';
import { login, register } from '../../api';
import './Login.css';

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [role, setRole] = useState('student'); // 'student' | 'admin'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminPasskey, setAdminPasskey] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function resetForm() {
    setError('');
    setSuccess('');
    setPassword('');
    setConfirmPassword('');
    setAdminPasskey('');
  }

  function handleRoleChange(newRole) {
    setRole(newRole);
    resetForm();
  }

  function handleModeChange(newMode) {
    setMode(newMode);
    resetForm();
  }

  // Pre-fill demo accounts for easy testing
  function fillDemo(demoUsername, demoRole) {
    setUsername(demoUsername);
    setRole(demoRole);
    setPassword('123456');
    setError('');
    setSuccess(`Filled credentials for ${demoUsername} (${demoRole}). Enter password or click Sign In.`);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username.trim() || !password) {
      setError('Please provide both username and password.');
      return;
    }

    if (mode === 'register') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (role === 'admin' && !adminPasskey.trim()) {
        setError('Admin Authorization Passkey is required to create an admin account.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        const res = await register(username.trim(), password, role, adminPasskey.trim());
        setSuccess(res.message || 'Account created successfully! Please sign in.');
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        setAdminPasskey('');
      } else {
        const res = await login(username.trim(), password, role);
        if (res.user) {
          // Persist user in localStorage
          localStorage.setItem('library_user', JSON.stringify(res.user));
          onLogin(res.user);
        } else {
          throw new Error('Invalid user payload received from server');
        }
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo-badge">📚</div>
            <h1 className="auth-title">Smart Library System</h1>
            <p className="auth-subtitle">
              {role === 'student' ? 'Student Learning & Catalog Portal' : 'Librarian & Administrative Console'}
            </p>
          </div>

          {/* Role Switcher */}
          <div className="role-toggle-group">
            <button
              type="button"
              className={`role-toggle-btn ${role === 'student' ? 'active' : ''}`}
              onClick={() => handleRoleChange('student')}
            >
              <span>👨‍🎓</span>
              <span>Student Portal</span>
            </button>
            <button
              type="button"
              className={`role-toggle-btn ${role === 'admin' ? 'active admin-role' : ''}`}
              onClick={() => handleRoleChange('admin')}
            >
              <span>🛡️</span>
              <span>Librarian / Admin</span>
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="auth-mode-tabs">
            <button
              type="button"
              className={`auth-mode-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => handleModeChange('login')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-mode-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => handleModeChange('register')}
            >
              Create Account
            </button>
          </div>

          {/* Alert Banners */}
          {error && <div className="banner banner-error">❌ {error}</div>}
          {success && <div className="banner banner-success">✅ {success}</div>}

          {/* Auth Form */}
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label>Username</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">👤</span>
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <label>Password</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">🔒</span>
                <input
                  type="password"
                  placeholder={mode === 'register' ? 'Choose a strong password (min 6 chars)' : 'Enter your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  required
                />
              </div>
            </div>

            {/* Confirm Password (Register mode only) */}
            {mode === 'register' && (
              <div className="auth-field">
                <label>Confirm Password</label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">🔐</span>
                  <input
                    type="password"
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
            )}

            {/* Special Admin Passkey field (Register as Admin only) */}
            {mode === 'register' && role === 'admin' && (
              <div className="admin-passkey-box">
                <div className="admin-passkey-header">
                  <span>🛡️</span>
                  <span>Restricted Access: Admin Authorization Passkey</span>
                </div>
                <p className="admin-passkey-hint">
                  To prevent unauthorized elevated privileges, librarian/admin registration requires a secret passkey.
                  Default authorization key: <span className="passkey-code-tag">ADMIN2026</span>
                </p>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">🔑</span>
                  <input
                    type="password"
                    placeholder="Enter Admin Passkey (e.g. ADMIN2026)"
                    value={adminPasskey}
                    onChange={(e) => setAdminPasskey(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className={`btn-auth-submit ${role === 'admin' ? 'admin-btn' : ''}`}
              disabled={loading}
            >
              {loading
                ? 'Processing...'
                : mode === 'register'
                ? `Register as ${role === 'admin' ? 'Administrator' : 'Student'}`
                : `Sign In to ${role === 'admin' ? 'Admin Portal' : 'Student Portal'}`}
            </button>
          </form>

          {/* Quick Demo Access Bar */}
          <div className="demo-accounts-card">
            <span>💡 Quick Test Demo Accounts:</span>
            <div className="demo-chips">
              <button
                type="button"
                className="demo-chip"
                onClick={() => fillDemo('logu', 'student')}
              >
                Student (logu)
              </button>
              <button
                type="button"
                className="demo-chip"
                onClick={() => fillDemo('khaith', 'admin')}
              >
                Admin (khaith)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}