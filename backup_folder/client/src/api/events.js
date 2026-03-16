import api from '../services/api';

export const eventsApi = {
    getAll: async () => {
        const response = await api.get('/events');
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/events/${id}`);
        return response.data;
    },

    create: async (eventData) => {
        const response = await api.post('/events', eventData);
        return response.data;
    },

    update: async (id, eventData) => {
        const response = await api.put(`/events/${id}`, eventData);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`/events/${id}`);
        return response.data;
    },

    checkConflict: async (eventData) => {
        const response = await api.post('/events/check-conflict', eventData);
        return response.data;
    }
};
