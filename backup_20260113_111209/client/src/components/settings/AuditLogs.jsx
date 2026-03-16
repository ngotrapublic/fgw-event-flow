import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Shield, Search, Filter, Download,
    User, Trash2, Edit, Plus, AlertTriangle, Eye, RefreshCw, Loader2, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Input } from '../ui/Input';
import { cn } from '../../lib/utils';
import api from '../../services/api';

// Action colors for Neubrutalism
const ACTION_STYLES = {
    CREATE: { bg: 'bg-emerald-500', light: 'bg-emerald-100', text: 'text-emerald-600' },
    DELETE: { bg: 'bg-rose-500', light: 'bg-rose-100', text: 'text-rose-600' },
    UPDATE: { bg: 'bg-amber-500', light: 'bg-amber-100', text: 'text-amber-600' },
    LOGIN: { bg: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-600' },
    LOGOUT: { bg: 'bg-slate-500', light: 'bg-slate-100', text: 'text-slate-600' },
    BACKUP: { bg: 'bg-violet-500', light: 'bg-violet-100', text: 'text-violet-600' },
    AUTO_CLEAN: { bg: 'bg-cyan-500', light: 'bg-cyan-100', text: 'text-cyan-600' },
    default: { bg: 'bg-slate-500', light: 'bg-slate-100', text: 'text-slate-600' }
};

const ActionBadge = ({ action }) => {
    const style = ACTION_STYLES[action] || ACTION_STYLES.default;
    return (
        <span className={cn(
            "text-[10px] font-black px-2.5 py-1 rounded-lg border-2 border-black uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]",
            style.bg, "text-white"
        )}>
            {action}
        </span>
    );
};

const AuditLogs = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            setIsLoading(true);
            const res = await api.get('/audit-logs');
            setLogs(res.data);
        } catch (error) {
            console.error("Failed to fetch logs", error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredLogs = logs.filter(log =>
        log.actor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.target?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatDate = (isoString) => {
        if (!isoString) return 'N/A';
        return new Date(isoString).toLocaleString('vi-VN');
    };

    // Pagination logic
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    return (
        <div className="max-w-6xl mx-auto pb-20 animate-in fade-in duration-500">
            {/* Header - Neubrutalism */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 p-6 bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/settings')}
                        className="h-10 w-10 flex items-center justify-center bg-slate-100 text-slate-600 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                        <ArrowLeft size={20} strokeWidth={2.5} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <Shield className="text-white" size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-black">Audit Logs</h1>
                            <p className="text-slate-500 font-bold text-sm">Detailed tracking of all system activities.</p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={fetchLogs}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 font-bold border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-50 transition-colors cursor-pointer"
                >
                    <RefreshCw size={16} strokeWidth={2.5} /> Refresh
                </button>
            </div>

            {/* Search Bar - Neubrutalism */}
            <div className="bg-white p-4 rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} strokeWidth={2.5} />
                    <input
                        type="text"
                        placeholder="Search logs by actor, action, or target..."
                        className="w-full h-11 pl-10 pr-4 border-2 border-slate-200 rounded-lg font-medium text-slate-700 placeholder:text-slate-400 hover:border-black focus:border-black focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none transition-colors"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="text-sm font-bold text-slate-500">
                    <span className="text-black font-black">{filteredLogs.length}</span> logs found
                </div>
            </div>

            {/* Logs Table - Neubrutalism */}
            <div className="bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                {isLoading ? (
                    <div className="p-20 flex flex-col items-center justify-center text-slate-400">
                        <Loader2 className="animate-spin text-indigo-500 mb-3" size={40} />
                        <p className="font-bold">Loading logs...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-100 border-b-2 border-black">
                                    <th className="p-4 text-xs font-black text-black uppercase pl-6">Actor</th>
                                    <th className="p-4 text-xs font-black text-black uppercase">Action</th>
                                    <th className="p-4 text-xs font-black text-black uppercase">Target Resource</th>
                                    <th className="p-4 text-xs font-black text-black uppercase">Timestamp</th>
                                    <th className="p-4 text-xs font-black text-black uppercase text-right pr-6">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y-2 divide-dashed divide-slate-200">
                                {paginatedLogs.map((log, idx) => {
                                    const actionStyle = ACTION_STYLES[log.action] || ACTION_STYLES.default;
                                    return (
                                        <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="p-4 pl-6">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                                                        actionStyle.bg
                                                    )}>
                                                        {log.actor ? log.actor.charAt(0).toUpperCase() : '?'}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-black text-sm">{log.actor}</div>
                                                        <div className="text-[10px] text-slate-500 font-black uppercase">{log.role || 'User'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <ActionBadge action={log.action} />
                                            </td>
                                            <td className="p-4">
                                                <span className="text-sm font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border-2 border-slate-200">
                                                    {log.target}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-xs font-bold text-slate-500">{formatDate(log.timestamp)}</span>
                                            </td>
                                            <td className="p-4 text-right pr-6">
                                                <button className="h-8 w-8 flex items-center justify-center bg-slate-100 text-slate-400 border-2 border-slate-200 rounded-lg opacity-0 group-hover:opacity-100 group-hover:border-black group-hover:text-black group-hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer">
                                                    <Eye size={14} strokeWidth={2.5} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                {!isLoading && filteredLogs.length === 0 && (
                    <div className="p-20 flex flex-col items-center justify-center">
                        <div className="w-20 h-20 bg-slate-100 rounded-xl border-2 border-slate-200 flex items-center justify-center mb-4">
                            <Search size={40} strokeWidth={2} className="text-slate-300" />
                        </div>
                        <p className="font-bold text-slate-500">No audit logs found matching your search.</p>
                    </div>
                )}

                {/* Pagination - Neubrutalism */}
                {!isLoading && filteredLogs.length > 0 && (
                    <div className="p-4 border-t-2 border-black bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
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
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                            <span className="text-sm text-slate-500 font-medium">
                                <span className="font-black text-black">{startIndex + 1}-{Math.min(endIndex, filteredLogs.length)}</span> of <span className="font-black text-black">{filteredLogs.length}</span>
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
                                                ? "bg-indigo-500 border-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
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
        </div>
    );
};

export default AuditLogs;
