import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useCallback, useRef } from 'react';
import SettingsModal from './SettingsModal';
import { getPendingBreaks } from '../api/breaks';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const isApprover = ['Supervisor', 'Team Leader', 'Coordinator', 'Admin'].includes(user?.role);
  const isAdmin = user?.role === 'Admin';
  const [prevPendingCount, setPrevPendingCount] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState('');
  const audioContextRef = useRef(null);

  const currentPage = location.pathname === '/' ? 'dashboard' : location.pathname.slice(1);

  // Play notification sound using Web Audio API (no external files needed)
  const playAlertSound = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);

      // Second beep
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.5);
      osc2.frequency.setValueAtTime(1100, ctx.currentTime + 0.6);
      gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.5);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.9);
      osc2.start(ctx.currentTime + 0.5);
      osc2.stop(ctx.currentTime + 0.9);
    } catch (e) { console.log('Audio not available'); }
  }, []);

  // Request browser notification permission
  useEffect(() => {
    if (isApprover && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [isApprover]);

  // Poll for pending breaks every 5 seconds
  const checkPending = useCallback(async () => {
    if (!isApprover) return;
    try {
      const res = await getPendingBreaks();
      const count = res.data.length;
      setPendingCount(count);

      // If new pending requests arrived, show alert
      if (count > prevPendingCount && prevPendingCount > 0) {
        playAlertSound();
        const newRequests = count - prevPendingCount;
        const msg = newRequests === 1
          ? 'New break request from operator!'
          : `${newRequests} new break requests!`;
        setNotificationMsg(msg);
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 5000);

        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Break Time Tracker', {
            body: msg,
            icon: 'https://cdn-icons-png.flaticon.com/512/2922/2922506.png',
            tag: 'break-request'
          });
        }
      }
      setPrevPendingCount(count);
    } catch (err) { /* silent fail */ }
  }, [isApprover, prevPendingCount, playAlertSound]);

  useEffect(() => {
    if (!isApprover) return;
    checkPending();
    const interval = setInterval(checkPending, 5000);
    return () => clearInterval(interval);
  }, [isApprover, checkPending]);

  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie', path: '/' },
    { id: 'scan', label: 'Scan QR', icon: 'fa-qrcode', path: '/scan' },
    { id: 'history', label: 'History', icon: 'fa-history', path: '/history' },
    { id: 'reports', label: 'Reports', icon: 'fa-file-alt', path: '/reports' },
    { id: 'users', label: 'Users', icon: 'fa-users', path: '/users', approverOnly: true },
    { id: 'devices', label: 'Devices', icon: 'fa-mobile-alt', path: '/devices', adminOnly: true },
  ];

  const navItems = allNavItems.filter(item => {
    if (item.approverOnly && !isApprover) return false;
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  return (
    <div className="app-container">
      {/* Floating notification toast */}
      {showNotification && (
        <div className="notification-toast" onClick={() => { setShowNotification(false); navigate('/'); }}>
          <i className="fas fa-bell" style={{ fontSize: 18 }}></i>
          <span>{notificationMsg}</span>
          <i className="fas fa-times" style={{ marginLeft: 8, opacity: 0.7 }}></i>
        </div>
      )}

      <header className="app-header">
        <div className="header-left">
          <div className="header-logo">
            <i className="fas fa-clock"></i>
            <span>Break Time Tracker</span>
          </div>
        </div>
        <div className="header-right">
          {/* Notification bell for approvers */}
          {isApprover && (
            <button
              className="header-btn"
              onClick={() => navigate('/')}
              title="Pending break requests"
              style={{ position: 'relative' }}
            >
              <i className="fas fa-bell" style={{ color: pendingCount > 0 ? 'var(--warning)' : 'var(--gray-500)' }}></i>
              {pendingCount > 0 && (
                <span className="pending-badge">{pendingCount > 9 ? '9+' : pendingCount}</span>
              )}
            </button>
          )}
          <div className="user-badge">
            <i className="fas fa-user-circle"></i>
            <span className="hide-mobile">{user?.name || user?.username}</span>
          </div>
          <button className="header-btn" onClick={() => setShowSettings(true)} title="Settings">
            <i className="fas fa-cog"></i>
          </button>
          <button className="header-btn" onClick={logout} title="Logout">
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      <nav className="bottom-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
            style={{ position: 'relative' }}
          >
            <i className={`fas ${item.icon}`}></i>
            <span>{item.label}</span>
            {item.id === 'dashboard' && isApprover && pendingCount > 0 && (
              <span className="nav-badge">{pendingCount > 9 ? '9+' : pendingCount}</span>
            )}
          </button>
        ))}
      </nav>

      {showSettings && <SettingsModal isAdmin={isAdmin} onClose={() => setShowSettings(false)} />}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .app-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .notification-toast {
          position: fixed;
          top: 70px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 2000;
          background: linear-gradient(135deg, #f05252 0%, #e02424 100%);
          color: white;
          padding: 14px 24px;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(240, 82, 82, 0.4);
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 600;
          font-size: 14px;
          animation: slideDown 0.4s ease-out;
          max-width: 90vw;
          cursor: pointer;
        }
        .app-header {
          background: white;
          border-bottom: 1px solid var(--gray-200);
          padding: 12px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: var(--shadow-sm);
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .header-logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .header-logo i {
          font-size: 24px;
          color: var(--primary);
        }
        .header-logo span {
          font-weight: 700;
          font-size: 16px;
          color: var(--gray-900);
        }
        .header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .user-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: var(--primary-light);
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          color: var(--primary);
        }
        .user-badge i {
          font-size: 14px;
        }
        .header-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid var(--gray-200);
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--gray-500);
          transition: all 0.2s;
          position: relative;
        }
        .header-btn:hover {
          background: var(--gray-100);
          color: var(--gray-700);
        }
        .pending-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          background: var(--warning);
          color: white;
          font-size: 10px;
          font-weight: 700;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          animation: pulse 2s infinite;
        }
        .main-content {
          padding: 20px;
          padding-bottom: 90px;
          max-width: 800px;
          margin: 0 auto;
          width: 100%;
          flex: 1;
        }
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          border-top: 1px solid var(--gray-200);
          display: flex;
          justify-content: space-around;
          padding: 8px 0;
          z-index: 100;
          box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
        }
        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          border: none;
          background: none;
          cursor: pointer;
          color: var(--gray-400);
          font-size: 11px;
          font-weight: 500;
          transition: all 0.2s;
          font-family: inherit;
          position: relative;
        }
        .nav-item i {
          font-size: 20px;
        }
        .nav-item.active {
          color: var(--primary);
        }
        .nav-item:hover {
          color: var(--gray-600);
        }
        .nav-badge {
          position: absolute;
          top: 2px;
          right: 20%;
          background: var(--warning);
          color: white;
          font-size: 9px;
          font-weight: 700;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
        }

        @media (prefers-color-scheme: dark) {
          .app-header { background: var(--gray-100); border-bottom-color: var(--gray-700); }
          .header-logo span { color: var(--gray-800); }
          .header-btn { background: var(--gray-100); border-color: var(--gray-600); color: var(--gray-500); }
          .header-btn:hover { background: var(--gray-200); color: var(--gray-800); }
          .bottom-nav { background: var(--gray-100); border-top-color: var(--gray-700); box-shadow: 0 -2px 10px rgba(0,0,0,0.3); }
          .nav-item { color: var(--gray-500); }
          .nav-item:hover { color: var(--gray-700); }
          .pending-badge { border-color: var(--gray-800); }
          .nav-badge { border-color: var(--gray-800); }
        }
          .app-header { background: var(--gray-100); border-bottom-color: var(--gray-700); }
          .header-logo span { color: var(--gray-800); }
          .header-btn { background: var(--gray-100); border-color: var(--gray-600); color: var(--gray-300); }
          .header-btn:hover { background: var(--gray-200); color: var(--gray-800); }
          .bottom-nav { background: var(--gray-100); border-top-color: var(--gray-700); box-shadow: 0 -2px 10px rgba(0,0,0,0.3); }
          .nav-item { color: var(--gray-400); }
          .nav-item:hover { color: var(--gray-700); }
          .pending-badge { border-color: var(--gray-800); }
          .nav-badge { border-color: var(--gray-800); }
        }
        @media (max-width: 480px) {
          .main-content {
            padding: 12px;
            padding-bottom: 90px;
          }
          .app-header {
            padding: 10px 12px;
          }
          .header-logo span {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
};

export default Layout;
