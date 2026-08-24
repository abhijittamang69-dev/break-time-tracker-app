import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login } from '../api/auth';
import storage from '../utils/storage';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Generate or retrieve device token
      let deviceToken = storage.get('deviceToken');
      if (!deviceToken) {
        deviceToken = 'dev_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        storage.set('deviceToken', deviceToken);
      }

      // Get device info
      const deviceName = navigator.userAgent.split(')')[0] + ')' || 'Unknown Device';
      const userAgent = navigator.userAgent;

      const res = await login(username, password, deviceToken, deviceName, userAgent);
      authLogin(res.data.token, res.data.user);
      // Clear any previous device errors
      storage.remove('deviceError');
      storage.remove('deviceErrorDesc');
      navigate('/');
    } catch (err) {
      const errMsg = err.response?.data?.message;
      const errDesc = err.response?.data?.description;
      if (errMsg === 'DEVICE_UNAUTHORIZED') {
        setError(errDesc || 'Unauthorized device. Please contact your administrator.');
      } else if (errMsg === 'DEVICE_REQUIRED') {
        setError(errDesc || 'Device token is required.');
      } else {
        setError(errMsg || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card animate-slide-up">
        <div className="login-logo">
          <i className="fas fa-clock"></i>
          <h1>Break Time Tracker App</h1>
          <p>QR Code Break Time Management</p>
        </div>
        {error && (
          <div className="alert alert-warning" style={{ marginBottom: 20 }}>
            <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <div className="input-wrapper">
              <i className="fas fa-user"></i>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" required autoComplete="username" />
            </div>
          </div>
          <div className="form-group">
            <label>Password</label>
            <div className="input-wrapper">
              <i className="fas fa-lock"></i>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" required autoComplete="current-password" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-sign-in-alt"></i>}
            {loading ? ' Signing In...' : ' Sign In'}
          </button>
        </form>
      </div>
      <style>{`
        .login-page { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: linear-gradient(135deg, #1a56db 0%, #1e429f 50%, #0f2c6d 100%); padding: 20px; }
        .login-card { background: white; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); width: 100%; max-width: 420px; padding: 40px; }
        .login-logo { text-align: center; margin-bottom: 32px; }
        .login-logo i { font-size: 48px; color: var(--primary); margin-bottom: 16px; }
        .login-logo h1 { font-size: 24px; font-weight: 800; color: var(--gray-900); letter-spacing: -0.5px; }
        .login-logo p { color: var(--gray-500); font-size: 14px; margin-top: 4px; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; font-size: 13px; font-weight: 600; color: var(--gray-700); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.3px; }
        .input-wrapper { position: relative; }
        .input-wrapper i { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--gray-400); font-size: 16px; }
        .input-wrapper input { width: 100%; padding: 12px 16px 12px 44px; border: 2px solid var(--gray-200); border-radius: var(--radius-sm); font-size: 15px; font-family: inherit; transition: all 0.2s; background: var(--gray-50); }
        .input-wrapper input:focus { outline: none; border-color: var(--primary); background: white; box-shadow: 0 0 0 3px rgba(26, 86, 219, 0.1); }
        .btn { width: 100%; padding: 14px; border: none; border-radius: var(--radius-sm); font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-primary { background: var(--primary); color: white; }
        .btn-primary:hover:not(:disabled) { background: var(--primary-dark); transform: translateY(-1px); box-shadow: var(--shadow-md); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .alert { padding: 14px 16px; border-radius: var(--radius-sm); display: flex; align-items: center; gap: 10px; font-size: 14px; }
        .alert-warning { background: var(--warning-light); color: var(--warning); border: 1px solid #fbd5d5; }

        @media (prefers-color-scheme: dark) {
          .login-card { background: var(--gray-100); }
          .login-logo h1 { color: var(--gray-800); }
          .login-logo p { color: var(--gray-400); }
          .form-group label { color: var(--gray-500); }
          .input-wrapper input { background: var(--gray-200); border-color: var(--gray-600); color: var(--gray-800); }
          .input-wrapper input:focus { background: var(--gray-100); }
          .input-wrapper i { color: var(--gray-500); }
        }
        }
        @media (max-width: 480px) { .login-card { padding: 28px 20px; } }
      `}</style>
    </div>
  );
};

export default Login;
