import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Box, Plus, Search, MoreVertical,
    Speaker, Mic, Monitor, Layout, Zap, Coffee, Edit, Trash2, Save, X, Loader2, Package, ChevronLeft, ChevronRight
} from 'lucide-react';
import api from '../../services/api';
import { Input } from '../ui/Input';
import { cn } from '../../lib/utils';
import { useToast } from '../Toast';

const ICON_MAP = {
    Speaker, Mic, Monitor, Layout, Zap, Coffee, Box, Package
};

// Color palette for resource categories
const CATEGORY_COLORS = {
    'Audio': { bg: 'bg-violet-500', light: 'bg-violet-100', text: 'text-violet-600' },
    'Visual': { bg: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-600' },
    'Furniture': { bg: 'bg-orange-500', light: 'bg-orange-100', text: 'text-orange-600' },
    'Lighting': { bg: 'bg-amber-500', light: 'bg-amber-100', text: 'text-amber-600' },
    'Branding': { bg: 'bg-fuchsia-500', light: 'bg-fuchsia-100', text: 'text-fuchsia-600' },
    'Catering': { bg: 'bg-emerald-500', light: 'bg-emerald-100', text: 'text-emerald-600' },
    'default': { bg: 'bg-slate-500', light: 'bg-slate-100', text: 'text-slate-600' },
};

const ResourceManager = () => {
    const navigate = useNavigate();
    const { showSuccess, showError } = useToast();

    const [resources, setResources] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [newItem, setNewItem] = useState({ label: '', category: '', quantity: 0, icon: 'Box' });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(9);

    // Pagination logic
    const totalPages = Math.ceil(resources.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedResources = resources.slice(startIndex, endIndex);

    // Fetch resources from API
    const fetchResources = async () => {
        try {
            setIsLoading(true);
            const res = await api.get('/resources');
            setResources(res.data);
        } catch (error) {
            console.error("Failed to load resources", error);
            showError('Failed to load resources');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchResources();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this resource?')) {
            try {
                await api.delete(`/resources/${id}`);
                setResources(prev => prev.filter(item => item.id !== id));
                showSuccess('Resource deleted');
            } catch (error) {
                console.error("Delete failed", error);
                showError('Failed to delete resource');
            }
        }
    };

    const handleSave = async () => {
        if (!newItem.label) return;

        try {
            if (isAdding) {
                const res = await api.post('/resources', newItem);
                setResources(prev => [...prev, res.data]);
                setIsAdding(false);
                showSuccess('New resource added');
            } else if (editingId) {
                const res = await api.put(`/resources/${editingId}`, newItem);
                setResources(prev => prev.map(item => item.id === editingId ? res.data : item));
                setEditingId(null);
                showSuccess('Resource updated');
            }
            setNewItem({ label: '', category: '', quantity: 0, icon: 'Box' });
        } catch (error) {
            console.error("Save failed", error);
            showError('Failed to save resource');
        }
    };

    const startEdit = (item) => {
        setEditingId(item.id);
        setNewItem(item);
        setIsAdding(false);
    };

    const cancelEdit = () => {
        setIsAdding(false);
        setEditingId(null);
        setNewItem({ label: '', category: '', quantity: 0, icon: 'Box' });
    };

    return (
        <div className="max-w-6xl mx-auto pb-20 animate-in fade-in duration-500">
            {/* Header - Neubrutalism */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 p-6 bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/settings')}
                        className="h-10 w-10 flex items-center justify-center bg-slate-100 text-slate-600 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                        <ArrowLeft size={20} strokeWidth={2.5} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <Package className="text-white" size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-black">Resource Manager</h1>
                            <p className="text-slate-500 font-bold text-sm">Manage equipment inventory and facility assets.</p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    disabled={isAdding || editingId}
                    className={cn(
                        "flex items-center gap-2 px-5 py-2.5 font-bold border-2 border-black rounded-lg transition-colors cursor-pointer",
                        isAdding || editingId
                            ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                            : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:opacity-90"
                    )}
                >
                    <Plus size={18} strokeWidth={2.5} /> Add New Resource
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="animate-spin text-emerald-500" size={40} />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Editing/Adding Card - Neubrutalism */}
                    {(isAdding || editingId) && (
                        <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-gradient-to-br from-violet-100 to-fuchsia-100 rounded-xl p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-200">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                    {isAdding ? <Plus size={18} strokeWidth={2.5} className="text-white" /> : <Edit size={18} strokeWidth={2.5} className="text-white" />}
                                </div>
                                <h3 className="text-lg font-black text-black">{isAdding ? 'Add New Resource' : 'Edit Resource'}</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-black text-black mb-1.5">Resource Name</label>
                                    <Input
                                        autoFocus
                                        value={newItem.label}
                                        onChange={e => setNewItem({ ...newItem, label: e.target.value })}
                                        placeholder="e.g. Projector 4K"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-black mb-1.5">Category</label>
                                    <Input
                                        value={newItem.category}
                                        onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                                        placeholder="e.g. Visual"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-black mb-1.5">Total Quantity</label>
                                    <Input
                                        type="number"
                                        value={newItem.quantity}
                                        onChange={e => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={cancelEdit}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-600 font-bold border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-50 transition-colors cursor-pointer"
                                >
                                    <X size={16} strokeWidth={2.5} /> Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold border-2 border-black rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:opacity-90 transition-opacity cursor-pointer"
                                >
                                    <Save size={16} strokeWidth={2.5} /> Save Item
                                </button>
                            </div>
                        </div>
                    )}

                    {paginatedResources.map((item, idx) => {
                        const IconComponent = ICON_MAP[item.icon] || Box;
                        const theme = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.default;

                        // Skip rendering if currently editing this item
                        if (editingId === item.id) return null;

                        return (
                            <div
                                key={item.id}
                                className="group relative bg-white rounded-xl p-4 border-2 border-slate-200 hover:border-black hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 cursor-pointer"
                            >
                                {/* Action Buttons */}
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <button
                                        onClick={() => startEdit(item)}
                                        className="p-2 bg-blue-100 text-blue-600 border-2 border-black rounded-lg shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-200 transition-colors"
                                    >
                                        <Edit size={12} strokeWidth={2.5} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="p-2 bg-rose-100 text-rose-600 border-2 border-black rounded-lg shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-rose-200 transition-colors"
                                    >
                                        <Trash2 size={12} strokeWidth={2.5} />
                                    </button>
                                </div>

                                <div className="flex items-center gap-3 mb-4 relative">
                                    <div className={cn(
                                        "w-12 h-12 rounded-lg flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                                        theme.bg
                                    )}>
                                        <IconComponent size={22} strokeWidth={2.5} className="text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-black text-lg leading-tight truncate">{item.label}</h3>
                                        <span className={cn(
                                            "text-[10px] font-black uppercase px-2 py-0.5 rounded border-2 border-black inline-block mt-1",
                                            theme.light, theme.text
                                        )}>
                                            {item.category}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t-2 border-dashed border-slate-200">
                                    <div className="text-sm font-bold text-slate-500">
                                        In Stock: <span className="text-black font-black text-xl">{item.quantity}</span>
                                    </div>
                                    <div className="text-xs font-black px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                                        Available
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Add Placeholder Card - Neubrutalism */}
                    {!isAdding && (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="rounded-xl border-2 border-dashed border-slate-300 p-5 flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-black hover:bg-emerald-50 hover:text-emerald-600 transition-all duration-150 h-full min-h-[180px] cursor-pointer"
                        >
                            <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-300">
                                <Plus size={28} strokeWidth={2.5} />
                            </div>
                            <span className="font-black text-sm">Add New Item</span>
                        </button>
                    )}
                </div>
            )}

            {/* Pagination - Neubrutalism */}
            {!isLoading && resources.length > itemsPerPage && (
                <div className="mt-6 p-4 bg-white rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col sm:flex-row items-center justify-between gap-4">
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
                            <span className="font-black text-black">{startIndex + 1}-{Math.min(endIndex, resources.length)}</span> of <span className="font-black text-black">{resources.length}</span>
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
                                            ? "bg-emerald-500 border-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
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
        </div>
    );
};

export default ResourceManager;
