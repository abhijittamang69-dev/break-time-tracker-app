import { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { getMe } from '../api/auth';
import storage from '../utils/storage';

const AuthContext = createContext(null);

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const WARNING_TIMEOUT = 4 * 60 * 1000;    // 4 minutes (warn at 1 min left)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [idleWarning, setIdleWarning] = useState(false);
  const logoutTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const countdownRef = useRef(null);
  const [secondsLeft, setSecondsLeft] = useState(60);

  const clearTimers = useCallback(() => {
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const performLogout = useCallback(() => {
    clearTimers();
    storage.remove('token');
    storage.remove('user');
    storage.remove('deviceToken');
    setUser(null);
    setIdleWarning(false);
    window.location.reload();
  }, [clearTimers]);

  const startWarningCountdown = useCallback(() => {
    setSecondsLeft(60);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const resetIdleTimers = useCallback(() => {
    clearTimers();
    setIdleWarning(false);

    // Warning at 4 min
    warningTimerRef.current = setTimeout(() => {
      setIdleWarning(true);
      startWarningCountdown();
    }, WARNING_TIMEOUT);

    // Logout at 5 min
    logoutTimerRef.current = setTimeout(() => {
      performLogout();
    }, INACTIVITY_TIMEOUT);
  }, [clearTimers, performLogout, startWarningCountdown]);

  // Init auth on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = storage.get('token');
      const savedUser = storage.get('user');

      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          setUser(null);
        }
        setLoading(false);

        try {
          const res = await getMe();
          setUser(res.data);
          storage.set('user', JSON.stringify(res.data));
        } catch {
          storage.remove('token');
          storage.remove('user');
          setUser(null);
        }
      } else {
        storage.remove('token');
        storage.remove('user');
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  // Heartbeat: check if device is still approved/active every 30 seconds
  useEffect(() => {
    if (!user || user.role === 'Admin') return;

    const heartbeat = async () => {
      try {
        await getMe();
      } catch (err) {
        const msg = err.response?.data?.message;
        if (msg === 'DEVICE_NOT_REGISTERED') {
          performLogout();
        }
      }
    };

    const interval = setInterval(heartbeat, 30000);
    return () => clearInterval(interval);
  }, [user, performLogout]);

  // Inactivity auto-logout
  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'keydown', 'touchstart', 'click'];
    const onActivity = () => resetIdleTimers();

    events.forEach(e => document.addEventListener(e, onActivity, true));
    resetIdleTimers();

    // Pause timers when tab is hidden
    const onVisibility = () => {
      if (document.hidden) {
        clearTimers();
        setIdleWarning(false);
      } else {
        // User came back — start fresh
        resetIdleTimers();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      events.forEach(e => document.removeEventListener(e, onActivity, true));
      document.removeEventListener('visibilitychange', onVisibility);
      clearTimers();
    };
  }, [user, resetIdleTimers, clearTimers]);

  const login = (token, userData) => {
    storage.set('token', token);
    storage.set('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    clearTimers();
    storage.remove('token');
    storage.remove('user');
    storage.remove('deviceToken');
    setUser(null);
    setIdleWarning(false);
    window.location.reload();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
      {idleWarning && user && (
        <div style={{
          position: 'fixed',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#fef3c7',
          border: '2px solid #f59e0b',
          borderRadius: 12,
          padding: '16px 24px',
          zIndex: 9999,
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 14,
          color: '#92400e',
          fontWeight: 600,
          animation: 'slideUp 0.3s ease'
        }}>
          <i className="fas fa-exclamation-triangle" style={{ fontSize: 20, color: '#f59e0b' }}></i>
          <div>
            <div>You've been idle. Logging out in <span style={{ fontSize: 18, fontWeight: 800 }}>{secondsLeft}</span> seconds.</div>
            <div style={{ fontSize: 12, fontWeight: 400, marginTop: 2 }}>Click or press any key to stay logged in.</div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes slideUp {
          from { transform: translateX(-50%) translateY(20px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
      `}</style>
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
