import api from './client';

export const getTodayBreaks = () => api.get('/breaks/today');
export const getMyBreaks = () => api.get('/breaks/my');
export const getPendingBreaks = () => api.get('/breaks/pending');
export const requestBreak = (breakNumber, requestedDuration) => api.post('/breaks/request', { breakNumber, requestedDuration });
export const approveBreak = (id, approvedDuration) => api.post(`/breaks/approve/${id}`, { approvedDuration });
export const rejectBreak = (id) => api.post(`/breaks/reject/${id}`);
export const endBreak = (id) => api.post(`/breaks/end/${id}`);
export const getReports = () => api.get('/breaks/reports');
