import api from '../services/api';

const BASE = '/borrow/admin';

export const borrowAdminApi = {
    list: (params) => api.get(`${BASE}/requests`, { params }), // status, overdue, limit, cursor
    get: (id) => api.get(`${BASE}/requests/${id}`),
    counts: () => api.get(`${BASE}/counts`),
    approve: (id) => api.post(`${BASE}/requests/${id}/approve`),
    reject: (id, reason) => api.post(`${BASE}/requests/${id}/reject`, { reason }),
    handover: (id) => api.post(`${BASE}/requests/${id}/handover`),
    cancel: (id, reason) => api.post(`${BASE}/requests/${id}/cancel`, { reason }),
    confirmReturn: (id, items, returnNote) =>
        api.post(`${BASE}/requests/${id}/confirm-return`, { items, returnNote }),
    qrStation: () => api.get(`${BASE}/qr-station`)
};

export default borrowAdminApi;
