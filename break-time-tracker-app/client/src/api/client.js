import axios from 'axios';
import storage from '../utils/storage';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token and device token to requests
api.interceptors.request.use((config) => {
  const token = storage.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const deviceToken = storage.get('deviceToken');
  if (deviceToken) {
    config.headers['X-Device-Token'] = deviceToken;
  }
  return config;
});

// Handle 401 responses - clear auth and reload to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      storage.remove('token');
      storage.remove('user');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export default api;
