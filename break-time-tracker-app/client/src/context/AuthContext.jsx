import { createContext, useState, useContext, useEffect, useRef } from 'react';
import { getMe } from '../api/auth';
import storage from '../utils/storage';

const AuthContext = createContext(null);

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  const logout = () => {
    storage.remove('token');
    storage.remove('user');
    setUser(null);
    window.location.reload();
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = storage.get('token');
      const savedUser = storage.get('user');

      if (token && savedUser) {
        // Show saved user immediately — don't wait for API
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          setUser(null);
        }
        setLoading(false);

        // Verify token quietly in background
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
          logout();
        }
      }
    };

    const interval = setInterval(heartbeat, 30000); // every 30 seconds
    return () => clearInterval(interval);
  }, [user]);
  useEffect(() => {
    if (!user) return;

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        logout();
      }, INACTIVITY_TIMEOUT);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(e => document.addEventListener(e, resetTimer, true));
    resetTimer(); // start initial timer

    return () => {
      events.forEach(e => document.removeEventListener(e, resetTimer, true));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user]);

  const login = (token, userData) => {
    storage.set('token', token);
    storage.set('user', JSON.stringify(userData));
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
