import api from './client';

export const getMyDevices = () => api.get('/devices');
export const getAllDevices = () => api.get('/devices/all');
export const registerDevice = (data) => api.post('/devices/register', data);
export const approveDevice = (id) => api.post(`/devices/approve/${id}`);
export const rejectDevice = (id) => api.post(`/devices/reject/${id}`);
export const deactivateDevice = (id) => api.post(`/devices/deactivate/${id}`);
export const activateDevice = (id) => api.post(`/devices/activate/${id}`);
export const cleanupDevices = () => api.post('/devices/cleanup');
export const deleteDevice = (id) => api.delete(`/devices/${id}`);
