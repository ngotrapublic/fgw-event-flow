import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Shield, Mail, Trash2, Edit2, Check, X, Search, MoreHorizontal, Key, User, Loader2, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../Toast';
import { Input } from '../ui/Input';
import { cn } from '../../lib/utils';

// Role colors for Neubrutalism
const ROLE_COLORS = {
    admin: { bg: 'bg-violet-500', light: 'bg-violet-100', text: 'text-violet-600', border: 'border-violet-300' },
    manager: { bg: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-300' },
    user: { bg: 'bg-slate-500', light: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300' },
};

const UserManagement = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'user', department: '' });
    const [editingRole, setEditingRole] = useState(null);
    const [editingDepartment, setEditingDepartment] = useState(null);

    // Reset Password State
    const [resetModal, setResetModal] = useState({ show: false, userId: null, userName: '', newPassword: '' });

    const { showSuccess, showError } = useToast();

    useEffect(() => {
        fetchUsers();
        fetchDepartments();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await api.get('/users');
            setUsers(res.data);
        } catch (error) {
            console.error(error);
            showError('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/departments');
            setDepartments(res.data);
        } catch (error) {
            console.error("Error fetching departments", error);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            await api.post('/users', formData);
            showSuccess('User created successfully');
            setShowAddModal(false);
            setFormData({ name: '', email: '', password: '', role: 'user', department: '' });
            fetchUsers();
        } catch (error) {
            showError(error.response?.data?.error || 'Failed to create user');
        }
    };

    const handleUpdateRole = async (userId, newRole) => {
        try {
            await api.put(`/users/${userId}/role`, { role: newRole });
            showSuccess('Role updated successfully');
            setEditingRole(null);
            fetchUsers();
        } catch (error) {
            showError('Failed to update role');
        }
    };

    const handleUpdateDepartment = async (userId, newDept) => {
        try {
            await api.put(`/users/${userId}/department`, { department: newDept });
            showSuccess('Department updated successfully');
            setEditingDepartment(null);
            fetchUsers();
        } catch (error) {
            showError('Failed to update department');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
        try {
            await api.delete(`/users/${userId}`);
            showSuccess('User deleted successfully');
            fetchUsers();
        } catch (error) {
            showError('Failed to delete user');
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/users/${resetModal.userId}/reset-password`, { password: resetModal.newPassword });
            showSuccess(`Password for ${resetModal.userName} reset successfully`);
            setResetModal({ show: false, userId: null, userName: '', newPassword: '' });
        } catch (error) {
            showError(error.response?.data?.error || 'Failed to reset password');
        }
    };

    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(9);

    // Pagination logic
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Header - Neubrutalism */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/settings')}
                        className="h-10 w-10 flex items-center justify-center bg-slate-100 text-slate-600 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                        <ArrowLeft size={20} strokeWidth={2.5} />
                    </button>
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                        <Users className="text-white" size={28} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-black">User Management</h1>
                        <p className="text-slate-500 font-bold text-sm">Manage access, roles, and system users.</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold border-2 border-black rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:opacity-90 transition-opacity cursor-pointer"
                >
                    <Plus size={18} strokeWidth={2.5} /> Add New User
                </button>
            </div>

            {/* Search - Neubrutalism */}
            <div className="flex items-center gap-3 bg-white p-3 rounded-xl border-2 border-slate-200 hover:border-black transition-colors max-w-md">
                <Search size={20} strokeWidth={2.5} className="text-slate-400" />
                <input
                    type="text"
                    placeholder="Search users..."
                    className="flex-1 outline-none text-slate-700 font-medium placeholder:text-slate-400"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Loading State */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="animate-spin text-rose-500" size={40} />
                </div>
            ) : (
                /* Users Grid - Neubrutalism */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedUsers.map(user => {
                        const roleTheme = ROLE_COLORS[user.role] || ROLE_COLORS.user;

                        return (
                            <div
                                key={user.id}
                                className="group bg-white rounded-xl p-5 border-2 border-slate-200 hover:border-black hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all duration-150"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        {/* Avatar */}
                                        <div className={cn(
                                            "h-12 w-12 rounded-lg flex items-center justify-center text-lg font-black text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                                            roleTheme.bg
                                        )}>
                                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-black leading-tight">{user.name}</h3>
                                            <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                                <Mail size={10} strokeWidth={2.5} /> {user.email}
                                            </p>
                                            {/* Department Badge */}
                                            <div className="mt-1.5">
                                                {editingDepartment === user.id ? (
                                                    <select
                                                        className="text-[10px] p-1 rounded-lg border-2 border-black outline-none font-bold"
                                                        value={user.department || ''}
                                                        onChange={(e) => handleUpdateDepartment(user.id, e.target.value)}
                                                        onBlur={() => setEditingDepartment(null)}
                                                        autoFocus
                                                    >
                                                        <option value="">No Department</option>
                                                        {departments.map(dept => (
                                                            <option key={dept.id} value={dept.name}>{dept.name}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <div
                                                        onClick={() => setEditingDepartment(user.id)}
                                                        className="inline-block cursor-pointer"
                                                        title="Click to change department"
                                                    >
                                                        {user.department ? (
                                                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600 border-2 border-slate-200 hover:border-black transition-colors">
                                                                {user.department}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400 font-bold border-2 border-dashed border-slate-300 px-2 py-0.5 rounded hover:border-black hover:text-black transition-colors">
                                                                + Assign Dept
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => setResetModal({ show: true, userId: user.id, userName: user.name, newPassword: '' })}
                                            className="p-2 bg-amber-100 text-amber-600 border-2 border-black rounded-lg shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-amber-200 transition-colors cursor-pointer"
                                            title="Reset Password"
                                        >
                                            <Key size={12} strokeWidth={2.5} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(user.id)}
                                            className="p-2 bg-rose-100 text-rose-600 border-2 border-black rounded-lg shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-rose-200 transition-colors cursor-pointer"
                                            title="Delete User"
                                        >
                                            <Trash2 size={12} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </div>

                                {/* Role Section */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                                        <span className="text-xs font-black text-slate-500 uppercase">Role</span>

                                        {editingRole === user.id ? (
                                            <select
                                                className="text-xs p-1.5 rounded-lg border-2 border-black outline-none font-bold"
                                                value={user.role}
                                                onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                                                onBlur={() => setEditingRole(null)}
                                                autoFocus
                                            >
                                                <option value="user">User</option>
                                                <option value="manager">Manager</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        ) : (
                                            <button
                                                onClick={() => setEditingRole(user.id)}
                                                className={cn(
                                                    "text-xs px-3 py-1.5 rounded-lg border-2 border-black font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:opacity-80 transition-opacity cursor-pointer",
                                                    roleTheme.bg, "text-white"
                                                )}
                                            >
                                                {user.role}
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between text-xs px-1">
                                        <span className="text-slate-400 font-medium">Created: {new Date(user.createdAt).toLocaleDateString()}</span>
                                        <span className={cn(
                                            "font-black px-2 py-0.5 rounded border-2",
                                            user.status === 'active' || !user.status
                                                ? 'bg-emerald-100 text-emerald-600 border-emerald-300'
                                                : 'bg-slate-100 text-slate-500 border-slate-200'
                                        )}>
                                            {user.status || 'Active'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {filteredUsers.length === 0 && (
                        <div className="col-span-full py-20 text-center">
                            <div className="w-20 h-20 mx-auto bg-slate-100 rounded-xl border-2 border-slate-200 flex items-center justify-center mb-4">
                                <Users size={40} strokeWidth={2} className="text-slate-300" />
                            </div>
                            <p className="text-slate-500 font-bold">No users found matching "{searchTerm}"</p>
                        </div>
                    )}
                </div>
            )}

            {/* Pagination - Neubrutalism */}
            {!loading && filteredUsers.length > itemsPerPage && (
                <div className="p-4 bg-white rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Items per page */}
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-600">Show:</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => {
                                setItemsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="h-9 px-3 bg-white border-2 border-black rounded-lg font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                        >
                            <option value={6}>6</option>
                            <option value={9}>9</option>
                            <option value={12}>12</option>
                            <option value={18}>18</option>
                        </select>
                        <span className="text-sm text-slate-500 font-medium">
                            <span className="font-black text-black">{startIndex + 1}-{Math.min(endIndex, filteredUsers.length)}</span> of <span className="font-black text-black">{filteredUsers.length}</span>
                        </span>
                    </div>

                    {/* Page Navigation */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className={cn(
                                "h-9 w-9 flex items-center justify-center border-2 rounded-lg font-bold transition-colors cursor-pointer",
                                currentPage === 1
                                    ? "bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed"
                                    : "bg-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-50"
                            )}
                        >
                            <ChevronLeft size={16} strokeWidth={2.5} />
                        </button>

                        {/* Page Numbers */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                                pageNum = i + 1;
                            } else if (currentPage <= 3) {
                                pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                            } else {
                                pageNum = currentPage - 2 + i;
                            }
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={cn(
                                        "h-9 w-9 flex items-center justify-center border-2 rounded-lg font-black text-sm transition-colors cursor-pointer",
                                        currentPage === pageNum
                                            ? "bg-rose-500 border-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                            : "bg-white border-slate-200 text-slate-600 hover:border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                    )}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className={cn(
                                "h-9 w-9 flex items-center justify-center border-2 rounded-lg font-bold transition-colors cursor-pointer",
                                currentPage === totalPages
                                    ? "bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed"
                                    : "bg-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-50"
                            )}
                        >
                            <ChevronRight size={16} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            )}

            {/* Add User Modal - Neubrutalism */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b-2 border-black flex justify-between items-center bg-gradient-to-r from-rose-100 to-pink-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                    <Plus size={18} strokeWidth={2.5} className="text-white" />
                                </div>
                                <h2 className="text-lg font-black text-black">Add New User</h2>
                            </div>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="h-8 w-8 flex items-center justify-center bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-black text-black mb-1.5">Display Name</label>
                                <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="John Doe" />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-black mb-1.5">Email Address</label>
                                <Input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="john@example.com" />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-black mb-1.5">Password</label>
                                <Input required type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="Minimum 6 characters" />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-black mb-1.5">Department</label>
                                <select
                                    className="w-full h-11 px-3 bg-white border-2 border-slate-200 rounded-lg font-bold text-slate-700 hover:border-black focus:border-black focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none transition-colors cursor-pointer"
                                    value={formData.department}
                                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                                    required
                                >
                                    <option value="">Select Department...</option>
                                    {departments.map(dept => (
                                        <option key={dept.id} value={dept.name}>{dept.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-black mb-1.5">Role</label>
                                <select
                                    className="w-full h-11 px-3 bg-white border-2 border-slate-200 rounded-lg font-bold text-slate-700 hover:border-black focus:border-black focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none transition-colors cursor-pointer"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="user">User (Viewer)</option>
                                    <option value="manager">Manager (Editor)</option>
                                    <option value="admin">Admin (Full Access)</option>
                                </select>
                            </div>

                            <div className="pt-4 flex gap-3 border-t-2 border-dashed border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-2.5 bg-white text-slate-600 font-bold border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-50 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold border-2 border-black rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:opacity-90 transition-opacity cursor-pointer"
                                >
                                    Create User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reset Password Modal - Neubrutalism */}
            {resetModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b-2 border-black flex justify-between items-center bg-gradient-to-r from-amber-100 to-orange-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                    <Key size={18} strokeWidth={2.5} className="text-white" />
                                </div>
                                <h2 className="text-lg font-black text-black">Reset Password</h2>
                            </div>
                            <button
                                onClick={() => setResetModal({ show: false, userId: null, userName: '', newPassword: '' })}
                                className="h-8 w-8 flex items-center justify-center bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="mb-6 p-4 bg-amber-100 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                <p className="text-sm text-amber-800 font-bold">
                                    Resetting password for <span className="font-black">{resetModal.userName}</span>.
                                </p>
                            </div>

                            <form onSubmit={handleResetPassword} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black text-black mb-1.5">New Password</label>
                                    <Input
                                        required
                                        type="password"
                                        value={resetModal.newPassword}
                                        onChange={e => setResetModal({ ...resetModal, newPassword: e.target.value })}
                                        placeholder="Enter new password"
                                        minLength={6}
                                    />
                                </div>

                                <div className="pt-4 flex gap-3 border-t-2 border-dashed border-slate-200">
                                    <button
                                        type="button"
                                        onClick={() => setResetModal({ show: false, userId: null, userName: '', newPassword: '' })}
                                        className="flex-1 px-4 py-2.5 bg-white text-slate-600 font-bold border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-50 transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold border-2 border-black rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:opacity-90 transition-opacity cursor-pointer"
                                    >
                                        Reset Password
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
