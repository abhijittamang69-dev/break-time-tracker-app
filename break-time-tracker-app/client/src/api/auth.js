import api from './client';

export const login = (username, password, deviceToken, deviceName, userAgent) =>
  api.post('/auth/login', { username, password, deviceToken, deviceName, userAgent });

export const changePassword = (currentPassword, newPassword) =>
  api.post('/auth/change-password', { currentPassword, newPassword });

export const getMe = () =>
  api.get('/auth/me');
