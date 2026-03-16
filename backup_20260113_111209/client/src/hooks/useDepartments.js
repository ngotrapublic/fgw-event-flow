import { useState, useEffect } from 'react';
import { departmentsApi } from '../api/departments';
import { useToast } from '../components/Toast';

export const useDepartments = () => {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { showToast } = useToast();

    const fetchDepartments = async () => {
        try {
            setLoading(true);
            const data = await departmentsApi.getAll();
            setDepartments(data);
            setError(null);
        } catch (err) {
            setError(err.message);
            showToast('Failed to load departments', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDepartments();
    }, []);

    const createDepartment = async (deptData) => {
        try {
            const newDept = await departmentsApi.create(deptData);
            setDepartments([...departments, newDept]);
            showToast('Department created successfully', 'success');
            return newDept;
        } catch (err) {
            showToast('Failed to create department', 'error');
            throw err;
        }
    };

    const addEmail = async (name, email) => {
        try {
            const updated = await departmentsApi.addEmail(name, email);
            setDepartments(departments.map(d => d.name === name ? updated : d));
            showToast('Email added successfully', 'success');
            return updated;
        } catch (err) {
            showToast('Failed to add email', 'error');
            throw err;
        }
    };

    const updateDepartment = async (name, deptData) => {
        try {
            const updated = await departmentsApi.update(name, deptData);
            setDepartments(departments.map(d => d.name === name ? updated : d));
            showToast('Department updated successfully', 'success');
            return updated;
        } catch (err) {
            showToast('Failed to update department', 'error');
            throw err;
        }
    };

    const renameDepartment = async (name, newName) => {
        try {
            const updated = await departmentsApi.rename(name, newName);
            setDepartments(departments.map(d => d.name === name ? updated : d));
            showToast('Department renamed successfully', 'success');
            return updated;
        } catch (err) {
            showToast('Failed to rename department', 'error');
            throw err;
        }
    };

    const deleteDepartment = async (name) => {
        try {
            await departmentsApi.delete(name);
            setDepartments(departments.filter(d => d.name !== name));
            showToast('Department deleted successfully', 'success');
        } catch (err) {
            showToast('Failed to delete department', 'error');
            throw err;
        }
    };

    return {
        departments,
        loading,
        error,
        createDepartment,
        addEmail,
        updateDepartment,
        renameDepartment,
        deleteDepartment,
        refreshDepartments: fetchDepartments
    };
};
