import api from './client';

export const getMyDevices = () => api.get('/devices');
export const getAllDevices = () => api.get('/devices/all');
export const registerDevice = (data) => api.post('/devices/register', data);
export const deactivateDevice = (id) => api.post(`/devices/deactivate/${id}`);
export const activateDevice = (id) => api.post(`/devices/activate/${id}`);
