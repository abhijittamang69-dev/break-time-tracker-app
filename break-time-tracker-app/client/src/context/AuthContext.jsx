import { createContext, useState, useContext, useEffect } from 'react';
import { getMe } from '../api/auth';
import storage from '../utils/storage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = storage.get('token');
      const savedUser = storage.get('user');

      if (token && savedUser) {
        try {
          // Verify token is still valid
          const res = await getMe();
          setUser(res.data);
        } catch {
          storage.remove('token');
          storage.remove('user');
          setUser(null);
        }
      } else {
        storage.remove('token');
        storage.remove('user');
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = (token, userData) => {
    storage.set('token', token);
    storage.set('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    storage.remove('token');
    storage.remove('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
