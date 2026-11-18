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
    lookupOtp: (phone, email) => api.post(`${BASE}/lookup/otp`, { phone, email }),
    lookupVerify: (phone, email, code) => api.post(`${BASE}/lookup/verify`, { phone, email, code }),
    returnRequest: (id) => api.post(`${BASE}/requests/${id}/return`, {})
};
