import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Database, Download, Trash2, AlertTriangle,
    Save, RefreshCcw, HardDrive, CheckCircle, FileText, Upload, Loader2,
    ChevronDown, Calendar, X
} from 'lucide-react';
import { cn } from '../../lib/utils';
import api from '../../services/api';
import { useToast } from '../Toast';

const DataRetention = () => {
    const navigate = useNavigate();
    const [retentionPeriod, setRetentionPeriod] = useState(12);
    const [isExporting, setIsExporting] = useState(false);
    const [exportSuccess, setExportSuccess] = useState(false);
    const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
    const [restoreValidationData, setRestoreValidationData] = useState(null);
    const [isRestoring, setIsRestoring] = useState(false);
    const dropdownRef = React.useRef(null);
    const { showSuccess, showError } = useToast();

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsMonthPickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/settings');
                if (res.data.retention && res.data.retention.period) {
                    setRetentionPeriod(res.data.retention.period);
                }
            } catch (error) {
                console.error("Failed to load settings", error);
            }
        };
        fetchSettings();
    }, []);

    const handleSavePolicy = async () => {
        try {
            await api.put('/settings', {
                retention: { period: parseInt(retentionPeriod) }
            });
            showSuccess('Retention policy saved successfully!');
        } catch (error) {
            console.error(error);
            showError('Failed to save policy.');
        }
    };

    const handleExportCalendar = (e, targetMonth = null) => {
        if (e) e.stopPropagation();
        setIsExporting(true);
        setIsMonthPickerOpen(false); // Close dropdown if open
        
        const urlParam = targetMonth ? `?month=${targetMonth}` : '';
        api.get(`/events/export-calendar-excel${urlParam}`, { responseType: 'blob' })
            .then((response) => {
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                const fileNameMonth = targetMonth || new Date().toISOString().split('T')[0].substring(0, 7);
                link.setAttribute('download', `Events_Calendar_${fileNameMonth}.xlsx`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                showSuccess('Exported Calendar successfully!');
            })
            .catch((err) => {
                console.error(err);
                showError('Failed to export Calendar');
            })
            .finally(() => {
                setIsExporting(false);
            });
    };

    const handleFullBackup = () => {
        setIsExporting(true);
        api.get('/backup', { responseType: 'blob' })
            .then((response) => {
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `system_backup_${new Date().toISOString().split('T')[0]}.json`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                showSuccess('System backup downloaded successfully!');
                setExportSuccess(true);
                setTimeout(() => setExportSuccess(false), 3000);
            })
            .catch((err) => {
                console.error(err);
                showError('Failed to download backup.');
            })
            .finally(() => {
                setIsExporting(false);
            });
    };

    const handleRestore = async (file) => {
        if (!file) return;

        // Reset file input so user can select the same file again if needed
        const fileInput = document.getElementById('restore-file');
        if (fileInput) fileInput.value = '';

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const jsonContent = JSON.parse(e.target.result);
                
                // STEP 1: Validate file with backend
                const res = await api.post('/backup/validate', jsonContent);
                setRestoreValidationData(res.data);
            } catch (error) {
                console.error("Restore validation failed", error);
                showError(error.response?.data?.error || 'Failed to validate system backup file.');
            }
        };
        reader.readAsText(file);
    };

    const handleConfirmRestore = async () => {
        if (!restoreValidationData?.confirmationToken) return;
        setIsRestoring(true);
        try {
            await api.post('/backup/restore', { 
                confirmationToken: restoreValidationData.confirmationToken,
                mode: 'merge'
            });
            showSuccess('System restored successfully! Reloading...');
            setTimeout(() => window.location.reload(), 2000);
        } catch (error) {
            console.error("Restore failed", error);
            showError(error.response?.data?.error || 'Failed to restore system: Token expired or server error.');
            setIsRestoring(false);
            setRestoreValidationData(null);
        }
    };

    return (
        <div className="max-w-5xl mx-auto pb-20 animate-in fade-in duration-500">
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
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <Database className="text-white" size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-black">Data Retention & Backup</h1>
                            <p className="text-slate-500 font-bold text-sm">Manage data lifecycle, backups, and system reset.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {/* 1. Retention Policy - Neubrutalism */}
                <div className="bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                    <div className="p-4 border-b-2 border-dashed border-slate-200 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <RefreshCcw size={18} strokeWidth={2.5} className="text-white" />
                        </div>
                        <div>
                            <h2 className="font-black text-black">Retention Policy</h2>
                            <p className="text-xs text-slate-500 font-medium">Automatically delete old event data to save storage.</p>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="bg-amber-50 rounded-lg p-5 border-2 border-amber-200">
                            <label className="flex justify-between font-black text-black mb-4">
                                <span>Auto-delete events older than:</span>
                                <span className="text-amber-600 bg-white px-3 py-1 rounded-lg border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                                    {retentionPeriod} Months
                                </span>
                            </label>

                            <input
                                type="range"
                                min="3"
                                max="12"
                                step="3"
                                value={retentionPeriod}
                                onChange={(e) => setRetentionPeriod(e.target.value)}
                                className="w-full h-3 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                            <div className="flex justify-between text-xs font-black text-slate-500 mt-2 uppercase">
                                <span>3 Months</span>
                                <span>6 Months</span>
                                <span>9 Months</span>
                                <span>12 Months</span>
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={handleSavePolicy}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold border-2 border-black rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:opacity-90 transition-opacity cursor-pointer"
                            >
                                <Save size={16} strokeWidth={2.5} /> Save Policy
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2. Backup & Export - Neubrutalism */}
                <div className="bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                    <div className="p-4 border-b-2 border-dashed border-slate-200 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <HardDrive size={18} strokeWidth={2.5} className="text-white" />
                        </div>
                        <div>
                            <h2 className="font-black text-black">Backup & Export</h2>
                            <p className="text-xs text-slate-500 font-medium">Download system data for offline storage or reporting.</p>
                        </div>
                    </div>

                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Live Export Calendar Card (Hot) - Split Button */}
                        <div className="p-4 rounded-lg border-2 border-slate-200 hover:border-black hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all group flex items-center justify-between bg-white relative">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center border-2 border-orange-300 group-hover:border-black group-hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all">
                                    <FileText size={18} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <span className="font-black text-black block">Báo Cáo Lịch Excel</span>
                                    <span className="text-xs text-slate-500 font-medium">Trích xuất lịch sự kiện theo tháng</span>
                                </div>
                            </div>
                            
                            {/* Split Button Container */}
                            <div className="flex rounded-lg border-2 border-slate-200 group-hover:border-black transition-colors bg-white shadow-sm" ref={dropdownRef}>
                                {/* Main Action */}
                                <button
                                    onClick={(e) => handleExportCalendar(e)}
                                    disabled={isExporting}
                                    className="px-3 py-2 bg-slate-50 hover:bg-orange-500 hover:text-white border-r-2 border-slate-200 group-hover:border-black transition-colors flex items-center justify-center gap-2 rounded-l-md disabled:opacity-50"
                                >
                                    {isExporting ? <Loader2 size={16} strokeWidth={2.5} className="animate-spin" /> : <Download size={16} strokeWidth={2.5} />}
                                    <span className="text-sm font-bold">Tháng này</span>
                                </button>
                                
                                {/* Dropdown Toggle */}
                                <div className="relative">
                                    <button
                                        onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                                        disabled={isExporting}
                                        className="px-2 py-2 bg-slate-50 hover:bg-slate-200 transition-colors flex items-center justify-center h-full rounded-r-md disabled:opacity-50"
                                    >
                                        <ChevronDown size={16} strokeWidth={2.5} />
                                    </button>
                                    
                                    {/* Dropdown Menu */}
                                    {isMonthPickerOpen && (
                                        <div className="absolute right-0 top-full mt-2 w-48 bg-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50 overflow-hidden">
                                            <div className="max-h-64 overflow-y-auto p-1">
                                                {Array.from({ length: 12 }, (_, i) => {
                                                    const month = i + 1;
                                                    const year = new Date().getFullYear();
                                                    const currentMonth = new Date().getMonth() + 1;
                                                    const isCurrent = month === currentMonth;
                                                    const targetMonthStr = `${year}-${month.toString().padStart(2, '0')}`;
                                                    
                                                    return (
                                                        <button
                                                            key={month}
                                                            onClick={(e) => handleExportCalendar(e, targetMonthStr)}
                                                            className={cn(
                                                                "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between",
                                                                isCurrent ? "bg-orange-100 text-orange-700 font-bold" : "hover:bg-slate-100 font-medium text-slate-700"
                                                            )}
                                                        >
                                                            <span>Tháng {month}</span>
                                                            {isCurrent && <span className="text-[10px] uppercase tracking-wider">Hiện tại</span>}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Nightly Archive Export Card (Cold) */}
                        <div
                            onClick={() => window.open('http://localhost:5000/exports/events_archive.csv', '_blank')}
                            className="p-4 rounded-lg bg-slate-50 border-2 border-slate-200 hover:border-black hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer group flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center border-2 border-blue-300 group-hover:border-black group-hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all">
                                    <Database size={18} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <span className="font-black text-black block">Lịch sử (Nightly Backup)</span>
                                    <span className="text-xs text-slate-500 font-medium">0đ Quota - file dump 3:00 Sáng</span>
                                </div>
                            </div>
                            <div className="w-9 h-9 rounded-lg bg-white border-2 border-slate-200 flex items-center justify-center group-hover:bg-blue-500 group-hover:border-black group-hover:text-white transition-all">
                                <Download size={16} strokeWidth={2.5} />
                            </div>
                        </div>

                        {/* Full Backup Card */}
                        <div
                            onClick={handleFullBackup}
                            className="p-4 rounded-lg border-2 border-slate-200 hover:border-black hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer group flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center border-2 border-violet-300 group-hover:border-black group-hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all">
                                    <Database size={18} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <span className="font-black text-black block">Full System Backup</span>
                                    <span className="text-xs text-slate-500 font-medium">Complete JSON backup</span>
                                </div>
                            </div>
                            <button
                                disabled={isExporting}
                                className={cn(
                                    "px-4 py-2 rounded-lg border-2 border-black font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-colors cursor-pointer",
                                    exportSuccess
                                        ? "bg-emerald-500 text-white"
                                        : "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
                                )}
                            >
                                {isExporting ? <Loader2 size={16} className="animate-spin" /> : exportSuccess ? 'Success!' : 'Download'}
                            </button>
                        </div>

                        {/* Restore Section */}
                        <div className="md:col-span-2 mt-2 pt-4 border-t-2 border-dashed border-slate-200">
                            <div className="flex items-center justify-between p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-white text-slate-500 flex items-center justify-center border-2 border-slate-200">
                                        <Upload size={18} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-black">Restore Data</h3>
                                        <p className="text-xs text-slate-500 font-medium">Import a previously backed up JSON file.</p>
                                    </div>
                                </div>
                                <div>
                                    <input
                                        type="file"
                                        id="restore-file"
                                        className="hidden"
                                        accept=".json"
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) {
                                                handleRestore(e.target.files[0]);
                                            }
                                        }}
                                    />
                                    <label htmlFor="restore-file">
                                        <div className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 font-bold border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-50 transition-colors cursor-pointer">
                                            Select File...
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Danger Zone - Neubrutalism */}
                <div className="bg-rose-50 rounded-xl border-2 border-rose-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                    <div className="p-4 border-b-2 border-dashed border-rose-200 flex items-center gap-3 bg-rose-100">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500 to-red-500 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <AlertTriangle size={18} strokeWidth={2.5} className="text-white" />
                        </div>
                        <div>
                            <h2 className="font-black text-rose-800">Danger Zone</h2>
                            <p className="text-xs text-rose-600 font-bold">Irreversible actions. Proceed with caution.</p>
                        </div>
                    </div>

                    <div className="p-4 space-y-3">
                        {/* Clear Logs */}
                        <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-rose-200 hover:border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                            <div>
                                <h3 className="font-black text-black">Clear All Event Logs</h3>
                                <p className="text-xs text-slate-500 font-medium">Remove all historical audit logs. Does not affect event data.</p>
                            </div>
                            <button className="px-4 py-2 bg-rose-100 text-rose-600 font-bold border-2 border-rose-300 rounded-lg hover:bg-rose-200 hover:border-black transition-colors cursor-pointer">
                                Clear Logs
                            </button>
                        </div>

                        {/* Factory Reset */}
                        <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-rose-200 hover:border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                            <div>
                                <h3 className="font-black text-black">Factory Reset</h3>
                                <p className="text-xs text-slate-500 font-medium">Reset system settings to default. Data will be PRESERVED.</p>
                            </div>
                            <button className="px-4 py-2 bg-white text-rose-600 font-bold border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-rose-50 transition-colors cursor-pointer">
                                Reset Settings
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Restore Confirmation Modal - Neubrutalism */}
            {restoreValidationData && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="relative w-full max-w-lg">
                        {/* Multi-layer shadow effect */}
                        <div className="absolute inset-0 bg-rose-500 translate-x-[8px] translate-y-[8px]" />
                        <div className="absolute inset-0 bg-orange-500 translate-x-[4px] translate-y-[4px]" />
                        
                        {/* Main card */}
                        <div className="relative bg-white border-[3px] border-black flex flex-col">
                            {/* Header */}
                            <div className="bg-rose-100 border-b-[3px] border-black px-6 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-rose-500 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                        <AlertTriangle size={20} strokeWidth={2.5} className="text-white" />
                                    </div>
                                    <h3 className="text-xl font-black text-rose-900">Xác nhận Khôi phục</h3>
                                </div>
                                <button
                                    onClick={() => !isRestoring && setRestoreValidationData(null)}
                                    disabled={isRestoring}
                                    className="w-8 h-8 flex items-center justify-center bg-white border-2 border-black rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-100 transition-colors disabled:opacity-50"
                                >
                                    <X size={16} strokeWidth={3} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6 space-y-5 bg-gradient-to-br from-slate-50 to-white">
                                <div className="p-4 bg-amber-50 border-2 border-black rounded-lg shadow-[2px_2px_0_#0f172a]">
                                    <p className="text-sm font-bold text-amber-900 leading-relaxed mb-1">
                                        Bạn đang chuẩn bị khôi phục hệ thống từ một bản sao lưu.
                                    </p>
                                    <p className="text-xs font-semibold text-amber-700">
                                        Chế độ <span className="font-black bg-amber-200 px-1 rounded border border-black">Merge</span>: Dữ liệu cũ sẽ được ghi đè bằng bản backup này. Các sự kiện tạo MỚI hơn (không có trong backup) vẫn được GIỮ NGUYÊN.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center py-2 border-b-2 border-dashed border-slate-200">
                                        <span className="text-sm font-bold text-slate-500">Ngày tạo Backup:</span>
                                        <span className="text-sm font-black text-slate-900">
                                            {new Date(restoreValidationData.backupDate).toLocaleString('vi-VN')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b-2 border-dashed border-slate-200">
                                        <span className="text-sm font-bold text-slate-500">Phiên bản System:</span>
                                        <span className="text-sm font-black text-slate-900">v{restoreValidationData.version}</span>
                                    </div>
                                    
                                    <div className="pt-2">
                                        <span className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 block">Dữ liệu bao gồm ({restoreValidationData.totalDocs} dòng):</span>
                                        <div className="grid grid-cols-2 gap-2">
                                            {Object.entries(restoreValidationData.stats).map(([col, count]) => (
                                                <div key={col} className="flex items-center justify-between p-2 bg-slate-100 border-2 border-black rounded shadow-[2px_2px_0_#0f172a]">
                                                    <span className="text-xs font-bold text-slate-600 capitalize">{col}</span>
                                                    <span className="text-xs font-black text-slate-900 bg-white px-2 py-0.5 border-2 border-black rounded-full">{count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t-[3px] border-black bg-slate-100 flex justify-end gap-3">
                                <button
                                    onClick={() => setRestoreValidationData(null)}
                                    disabled={isRestoring}
                                    className="px-5 py-2.5 bg-white text-slate-700 font-bold border-2 border-black shadow-[3px_3px_0_#0f172a] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#0f172a] transition-all rounded disabled:opacity-50"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    onClick={handleConfirmRestore}
                                    disabled={isRestoring}
                                    className="px-5 py-2.5 flex items-center gap-2 bg-rose-500 text-white font-black border-2 border-black shadow-[3px_3px_0_#0f172a] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#0f172a] hover:bg-rose-600 transition-all rounded disabled:opacity-50"
                                >
                                    {isRestoring ? <Loader2 size={16} strokeWidth={3} className="animate-spin" /> : <RefreshCcw size={16} strokeWidth={3} />}
                                    Tiến hành Khôi phục
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataRetention;
