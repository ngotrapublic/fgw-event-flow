import api from '../services/api';

const BASE = '/borrow';

export const borrowApi = {
    getResources: () => api.get(`${BASE}/resources`),
    create: (data) => api.post(`${BASE}/requests`, data),
    verify: (token) => api.post(`${BASE}/verify`, { token }),
    resendVerification: (id, token) =>
        api.post(`${BASE}/requests/${id}/resend-verification`, {}, {
            headers: token ? { 'X-Borrow-Token': token } : {}
        }),
    getMy: (tokens) =>
        api.get(`${BASE}/my`, {
            headers: tokens?.length ? { 'X-Borrow-Tokens': tokens.join(',') } : {}
        }),
    lookupOtp: (phone) => api.post(`${BASE}/lookup/otp`, { phone }),
    lookupVerify: (phone, code) => api.post(`${BASE}/lookup/verify`, { phone, code }),
    returnRequest: (id, token) =>
        api.post(`${BASE}/requests/${id}/return`, {}, {
            headers: token ? { 'X-Borrow-Token': token } : {}
        })
};

