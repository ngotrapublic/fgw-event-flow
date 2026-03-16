import axios from 'axios';
import { getAuth } from 'firebase/auth';

// Phase 4: Environment-aware API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor: Attach auth token
api.interceptors.request.use(async (config) => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
}, (error) => {
    return Promise.reject(error);
});

// Response interceptor: Centralized error logging (Phase 4)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Structured log for API failures (no sensitive data)
        console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'API_FAILURE',
            method: error.config?.method?.toUpperCase(),
            url: error.config?.url,
            status: error.response?.status,
            statusText: error.response?.statusText,
            serverError: error.response?.data?.error
        }));

        return Promise.reject(error);
    }
);

// Toggle contractor sign status
export const toggleContractorSign = (eventId, contractorIndex) =>
    api.patch(`/events/${eventId}/contractor/${contractorIndex}/sign`);

export default api;
