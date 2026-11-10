import api from '../services/api';

const BASE = '/borrow';

export const borrowApi = {
    getResources: () => api.get(`${BASE}/resources`),
    create: (data) => api.post(`${BASE}/requests`, data),
    verify: (token) => api.post(`${BASE}/verify`, { token }),
    resendVerification: (id, tokens) => {
        const list = Array.isArray(tokens) ? tokens : (tokens ? [tokens] : []);
        return api.post(`${BASE}/requests/${id}/resend-verification`, {}, {
            headers: list.length ? {
                'X-Borrow-Token': list[0],
                'X-Borrow-Tokens': list.join(',')
            } : {}
        });
    },
    getMy: (tokens) =>
        api.get(`${BASE}/my`, {
            headers: tokens?.length ? { 'X-Borrow-Tokens': tokens.join(',') } : {}
        }),
    lookupOtp: (phone) => api.post(`${BASE}/lookup/otp`, { phone }),
    lookupVerify: (phone, code) => api.post(`${BASE}/lookup/verify`, { phone, code }),
    returnRequest: (id, tokens) => {
        const list = Array.isArray(tokens) ? tokens : (tokens ? [tokens] : []);
        return api.post(`${BASE}/requests/${id}/return`, {}, {
            headers: list.length ? {
                'X-Borrow-Token': list[0],
                'X-Borrow-Tokens': list.join(',')
            } : {}
        });
    }
};

