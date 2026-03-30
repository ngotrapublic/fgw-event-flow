const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const departmentsApi = {
    getAll: async () => {
        const response = await fetch(`${API_URL}/departments`);
        if (!response.ok) throw new Error('Failed to fetch departments');
        return response.json();
    },

    create: async (deptData) => {
        const response = await fetch(`${API_URL}/departments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(deptData)
        });
        if (!response.ok) throw new Error('Failed to create department');
        return response.json();
    },

    addEmail: async (name, email) => {
        const response = await fetch(`${API_URL}/departments/${name}/emails`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        if (!response.ok) throw new Error('Failed to add email');
        return response.json();
    },

    update: async (name, deptData) => {
        const response = await fetch(`${API_URL}/departments/${name}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(deptData)
        });
        if (!response.ok) throw new Error('Failed to update department');
        return response.json();
    },

    rename: async (name, newName) => {
        const response = await fetch(`${API_URL}/departments/${name}/rename`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newName })
        });
        if (!response.ok) throw new Error('Failed to rename department');
        return response.json();
    },

    delete: async (name) => {
        const response = await fetch(`${API_URL}/departments/${name}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete department');
        return response.json();
    }
};
