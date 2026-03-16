import React, { useState, useEffect } from 'react';
import { Plus, Mail, Building, Save, Trash2, Edit2, X, Users, Star, Check, Sparkles } from 'lucide-react';
import api from '../services/api';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { useToast } from './Toast';
import { cn } from '../lib/utils';

const DepartmentManager = () => {
    const [departments, setDepartments] = useState([]);
    const [newDeptName, setNewDeptName] = useState('');
    const [newDeptEmail, setNewDeptEmail] = useState('');
    const [selectedDeptForEmail, setSelectedDeptForEmail] = useState(null);
    const [additionalEmail, setAdditionalEmail] = useState('');
    const [editingEmail, setEditingEmail] = useState({ deptName: '', index: -1, value: '' });
    const [editingDept, setEditingDept] = useState({ originalName: '', newName: '' });
    const { showSuccess, showError } = useToast();

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/departments');
            setDepartments(res.data);
        } catch (error) {
            console.error("Error fetching departments", error);
            showError('Failed to load departments');
        }
    };

    useEffect(() => {
        fetchDepartments();
    }, []);

    const handleAddDepartment = async (e) => {
        e.preventDefault();
        if (!newDeptName) return;
        try {
            await api.post('/departments', { name: newDeptName, email: newDeptEmail });
            setNewDeptName('');
            setNewDeptEmail('');
            fetchDepartments();
            showSuccess('Department added successfully');
        } catch (error) {
            showError('Error adding department');
        }
    };

    const handleAddEmailToDept = async (deptName) => {
        if (!additionalEmail) return;
        try {
            await api.post(`/departments/${deptName}/emails`, { email: additionalEmail });
            setAdditionalEmail('');
            setSelectedDeptForEmail(null);
            fetchDepartments();
            showSuccess('Email added successfully');
        } catch (error) {
            showError('Error adding email');
        }
    };

    const handleUpdateEmail = async (deptName, index, newValue) => {
        const dept = departments.find(d => d.name === deptName);
        if (!dept) return;
        const updatedEmails = [...dept.emails];
        updatedEmails[index] = newValue;
        try {
            await api.put(`/departments/${deptName}`, { emails: updatedEmails });
            setEditingEmail({ deptName: '', index: -1, value: '' });
            fetchDepartments();
            showSuccess('Email updated successfully');
        } catch (error) {
            showError('Error updating email');
        }
    };

    const handleDeleteEmail = async (deptName, index) => {
        if (!window.confirm('Are you sure you want to delete this email?')) return;
        const dept = departments.find(d => d.name === deptName);
        if (!dept) return;
        const updatedEmails = dept.emails.filter((_, i) => i !== index);
        try {
            await api.put(`/departments/${deptName}`, { emails: updatedEmails });
            fetchDepartments();
            showSuccess('Email deleted successfully');
        } catch (error) {
            showError('Error deleting email');
        }
    };

    const handleRenameDepartment = async (originalName) => {
        if (!editingDept.newName || editingDept.newName === originalName) {
            setEditingDept({ originalName: '', newName: '' });
            return;
        }
        try {
            await api.put(`/departments/${originalName}/rename`, { newName: editingDept.newName });
            setEditingDept({ originalName: '', newName: '' });
            fetchDepartments();
            showSuccess('Department renamed successfully');
        } catch (error) {
            showError(error.response?.data?.message || 'Error renaming department');
        }
    };

    const handleSetDefaultEmail = async (deptName, email) => {
        try {
            await api.put(`/departments/${deptName}`, { defaultEmail: email });
            fetchDepartments();
            showSuccess(`Default email set to ${email}`);
        } catch (error) {
            console.error(error);
            showError('Failed to set default email');
        }
    };

    const handleDeleteDepartment = async (deptName) => {
        if (!window.confirm(`Are you sure you want to delete department "${deptName}"? This cannot be undone.`)) return;
        try {
            await api.delete(`/departments/${deptName}`);
            fetchDepartments();
            showSuccess('Department deleted successfully');
        } catch (error) {
            showError('Error deleting department');
        }
    };

    // Color palette for department cards
    const colors = ['violet', 'blue', 'emerald', 'orange', 'fuchsia', 'cyan'];
    const colorMap = {
        violet: { bg: 'bg-violet-100', text: 'text-violet-600', border: 'border-violet-500', iconBg: 'bg-violet-500' },
        blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-500', iconBg: 'bg-blue-500' },
        emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-500', iconBg: 'bg-emerald-500' },
        orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-500', iconBg: 'bg-orange-500' },
        fuchsia: { bg: 'bg-fuchsia-100', text: 'text-fuchsia-600', border: 'border-fuchsia-500', iconBg: 'bg-fuchsia-500' },
        cyan: { bg: 'bg-cyan-100', text: 'text-cyan-600', border: 'border-cyan-500', iconBg: 'bg-cyan-500' },
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Page Header - Neubrutalism Style */}
            <div className="flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="p-3 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <Building size={28} strokeWidth={2.5} className="text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-black tracking-tight flex items-center gap-2">
                        Department Management
                        <Sparkles size={20} className="text-amber-500" />
                    </h1>
                    <p className="text-sm font-bold text-slate-500">Manage organizational departments and their contact points</p>
                </div>
                <div className="ml-auto hidden md:flex items-center gap-2">
                    <div className="px-3 py-1.5 bg-violet-100 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <span className="text-sm font-black text-violet-600">{departments.length}</span>
                        <span className="text-xs font-bold text-slate-500 ml-1">Departments</span>
                    </div>
                </div>
            </div>

            {/* Add New Department Section - Neubrutalism Style */}
            <div className="bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                <div className="px-6 py-4 border-b-2 border-dashed border-slate-200 flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <Plus size={18} strokeWidth={2.5} className="text-emerald-600" />
                    </div>
                    <h2 className="text-lg font-black text-black">Add New Department</h2>
                </div>
                <div className="p-6">
                    <form onSubmit={handleAddDepartment} className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full space-y-2">
                            <label className="text-sm font-bold text-black">Department Name</label>
                            <Input
                                value={newDeptName}
                                onChange={(e) => setNewDeptName(e.target.value)}
                                placeholder="e.g. IT Support"
                                className="border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[-1px] focus:translate-y-[-1px] transition-all font-medium"
                            />
                        </div>
                        <div className="flex-1 w-full space-y-2">
                            <label className="text-sm font-bold text-black">Default Email (Optional)</label>
                            <Input
                                value={newDeptEmail}
                                onChange={(e) => setNewDeptEmail(e.target.value)}
                                placeholder="contact@example.com"
                                className="border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[-1px] focus:translate-y-[-1px] transition-all font-medium"
                            />
                        </div>
                        <Button
                            type="submit"
                            className="gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-2 border-black rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] transition-all font-bold"
                        >
                            <Plus size={18} strokeWidth={2.5} /> Add Department
                        </Button>
                    </form>
                </div>
            </div>

            {/* List Departments - Neubrutalism Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {departments.map((dept, index) => {
                    const colorKey = colors[index % colors.length];
                    const theme = colorMap[colorKey];

                    return (
                        <div
                            key={dept.name}
                            className="bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-150 group cursor-pointer overflow-hidden"
                        >
                            <div className="p-6">
                                {/* Card Header */}
                                <div className="flex justify-between items-start mb-6">
                                    {editingDept.originalName === dept.name ? (
                                        <div className="flex gap-2 items-center w-full">
                                            <Input
                                                value={editingDept.newName}
                                                onChange={(e) => setEditingDept({ ...editingDept, newName: e.target.value })}
                                                className="font-bold text-lg h-10 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                                autoFocus
                                            />
                                            <button
                                                onClick={() => handleRenameDepartment(dept.name)}
                                                className="h-10 w-10 flex items-center justify-center bg-emerald-100 text-emerald-600 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                                            >
                                                <Save size={18} strokeWidth={2.5} />
                                            </button>
                                            <button
                                                onClick={() => setEditingDept({ originalName: '', newName: '' })}
                                                className="h-10 w-10 flex items-center justify-center bg-slate-100 text-slate-600 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                                            >
                                                <X size={18} strokeWidth={2.5} />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-3">
                                                <div className={cn("p-2.5 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]", theme.iconBg)}>
                                                    <Users size={20} strokeWidth={2.5} className="text-white" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-black">{dept.name}</h3>
                                                    <p className="text-xs font-bold text-slate-500">{dept.emails.length} contact email{dept.emails.length !== 1 ? 's' : ''}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => setEditingDept({ originalName: dept.name, newName: dept.name })}
                                                    className="h-8 w-8 flex items-center justify-center bg-blue-100 text-blue-600 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                                                >
                                                    <Edit2 size={14} strokeWidth={2.5} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteDepartment(dept.name)}
                                                    className="h-8 w-8 flex items-center justify-center bg-rose-100 text-rose-600 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                                                >
                                                    <Trash2 size={14} strokeWidth={2.5} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Email List */}
                                <div className="space-y-2 mb-4">
                                    {dept.emails.map((email, idx) => {
                                        const isDefault = dept.defaultEmail === email;
                                        return (
                                            <div
                                                key={idx}
                                                className={cn(
                                                    "flex items-center justify-between gap-2 text-sm p-3 rounded-lg border-2 transition-all group/email",
                                                    isDefault
                                                        ? "bg-amber-50 border-amber-400 shadow-[2px_2px_0px_0px_rgba(251,191,36,1)]"
                                                        : "bg-slate-50 border-slate-200 hover:border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                                )}
                                            >
                                                {editingEmail.deptName === dept.name && editingEmail.index === idx ? (
                                                    <div className="flex gap-2 w-full">
                                                        <Input
                                                            value={editingEmail.value}
                                                            onChange={(e) => setEditingEmail({ ...editingEmail, value: e.target.value })}
                                                            className="h-8 text-xs bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={() => handleUpdateEmail(dept.name, idx, editingEmail.value)}
                                                            className="h-8 w-8 flex items-center justify-center bg-emerald-100 text-emerald-600 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all shrink-0"
                                                        >
                                                            <Check size={14} strokeWidth={2.5} />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingEmail({ deptName: '', index: -1, value: '' })}
                                                            className="h-8 w-8 flex items-center justify-center bg-slate-100 text-slate-600 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all shrink-0"
                                                        >
                                                            <X size={14} strokeWidth={2.5} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <div className={cn("p-1.5 rounded-md border-2 border-black", isDefault ? "bg-amber-400" : "bg-slate-200")}>
                                                                <Mail size={12} strokeWidth={2.5} className={isDefault ? "text-white" : "text-slate-600"} />
                                                            </div>
                                                            <span className={cn("truncate font-bold text-xs", isDefault ? "text-amber-900" : "text-slate-600")}>
                                                                {email}
                                                            </span>
                                                            {isDefault && (
                                                                <span className="px-2 py-0.5 bg-amber-400 text-black text-[10px] font-black rounded-md border border-black uppercase">
                                                                    Default
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover/email:opacity-100 transition-opacity shrink-0">
                                                            {!isDefault && (
                                                                <button
                                                                    title="Set as Default"
                                                                    onClick={() => handleSetDefaultEmail(dept.name, email)}
                                                                    className="h-7 w-7 flex items-center justify-center bg-amber-100 text-amber-600 border border-black rounded-md hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                                                                >
                                                                    <Star size={12} strokeWidth={2.5} />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => setEditingEmail({ deptName: dept.name, index: idx, value: email })}
                                                                className="h-7 w-7 flex items-center justify-center bg-blue-100 text-blue-600 border border-black rounded-md hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                                                            >
                                                                <Edit2 size={12} strokeWidth={2.5} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteEmail(dept.name, idx)}
                                                                className="h-7 w-7 flex items-center justify-center bg-rose-100 text-rose-600 border border-black rounded-md hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                                                            >
                                                                <Trash2 size={12} strokeWidth={2.5} />
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {dept.emails.length === 0 && (
                                        <div className="text-sm text-slate-400 font-bold italic text-center py-4 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                                            No emails added yet
                                        </div>
                                    )}
                                </div>

                                {/* Add Email Form */}
                                {selectedDeptForEmail === dept.name ? (
                                    <div className="flex gap-2 items-center animate-in fade-in slide-in-from-top-2 duration-200">
                                        <Input
                                            value={additionalEmail}
                                            onChange={(e) => setAdditionalEmail(e.target.value)}
                                            placeholder="New email..."
                                            className="h-9 text-sm border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-medium"
                                            autoFocus
                                        />
                                        <button
                                            onClick={() => handleAddEmailToDept(dept.name)}
                                            className="h-9 w-9 flex items-center justify-center bg-emerald-500 text-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all shrink-0"
                                        >
                                            <Save size={16} strokeWidth={2.5} />
                                        </button>
                                        <button
                                            onClick={() => setSelectedDeptForEmail(null)}
                                            className="h-9 w-9 flex items-center justify-center bg-slate-100 text-slate-600 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all shrink-0"
                                        >
                                            <X size={16} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setSelectedDeptForEmail(dept.name)}
                                        className="w-full py-2.5 border-2 border-dashed border-slate-300 rounded-lg text-sm font-bold text-slate-500 hover:text-black hover:border-black hover:bg-slate-50 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:border-solid transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <Plus size={16} strokeWidth={2.5} /> Add Email
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Empty State */}
            {departments.length === 0 && (
                <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-slate-300">
                    <div className="p-4 bg-slate-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                        <Building size={32} strokeWidth={2} className="text-slate-400" />
                    </div>
                    <h3 className="text-lg font-black text-black mb-1">No departments yet</h3>
                    <p className="text-sm font-bold text-slate-500">Create your first department using the form above</p>
                </div>
            )}
        </div>
    );
};

export default DepartmentManager;
