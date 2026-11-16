import api from '../services/api';

const BASE = '/borrow';

export const borrowApi = {
    getResources: () => api.get(`${BASE}/resources`),
    create: (data, { idempotencyKey } = {}) =>
        api.post(
            `${BASE}/requests`,
            data,
            idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined
        ),
    verify: (token) => api.post(`${BASE}/verify`, { token }),
    exchangeLink: (code) => api.post(`${BASE}/link/exchange`, { code }),
    logoutSession: () => api.post(`${BASE}/session/logout`),
    resendVerification: (id) => api.post(`${BASE}/requests/${id}/resend-verification`, {}),
    getMy: () => api.get(`${BASE}/my`),
    lookupOtp: (phone) => api.post(`${BASE}/lookup/otp`, { phone }),
    lookupVerify: (phone, code) => api.post(`${BASE}/lookup/verify`, { phone, code }),
    returnRequest: (id) => api.post(`${BASE}/requests/${id}/return`, {})
};
