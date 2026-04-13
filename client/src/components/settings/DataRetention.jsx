import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Database, Download, Trash2, AlertTriangle,
    Save, RefreshCcw, HardDrive, CheckCircle, FileText, Upload, Loader2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import api from '../../services/api';
import { useToast } from '../Toast';

const DataRetention = () => {
    const navigate = useNavigate();
    const [retentionPeriod, setRetentionPeriod] = useState(12);
    const [isExporting, setIsExporting] = useState(false);
    const [exportSuccess, setExportSuccess] = useState(false);
    const { showSuccess, showError } = useToast();

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

    const handleExportCsv = () => {
        setIsExporting(true);
        api.get('/events/export-csv?days=30', { responseType: 'blob' })
            .then((response) => {
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `Events_Export_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                showSuccess('Exported successfully!');
            })
            .catch((err) => {
                console.error(err);
                showError('Failed to export CSV');
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

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const jsonContent = JSON.parse(e.target.result);
                const confirmMsg = `Ready to restore data from version ${jsonContent.version || 'Unknown'} (${jsonContent.timestamp || 'No Date'}). This will merge/overwrite existing data. Continue?`;
                if (!window.confirm(confirmMsg)) return;

                await api.post('/backup/restore', { data: jsonContent.data });
                showSuccess('System restored successfully! Please refresh.');
                setTimeout(() => window.location.reload(), 2000);
            } catch (error) {
                console.error("Restore failed", error);
                showError('Failed to restore system: Invalid file or server error.');
            }
        };
        reader.readAsText(file);
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
                        {/* Live Export CSV Card (Hot) */}
                        <div
                            onClick={handleExportCsv}
                            className="p-4 rounded-lg border-2 border-slate-200 hover:border-black hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer group flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center border-2 border-orange-300 group-hover:border-black group-hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all">
                                    <FileText size={18} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <span className="font-black text-black block">Tháng Này (Live Report)</span>
                                    <span className="text-xs text-slate-500 font-medium">Xuất 30 ngày gần đây</span>
                                </div>
                            </div>
                            <div className="w-9 h-9 rounded-lg bg-slate-100 border-2 border-slate-200 flex items-center justify-center group-hover:bg-orange-500 group-hover:border-black group-hover:text-white transition-all">
                                <Download size={16} strokeWidth={2.5} />
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
        </div>
    );
};

export default DataRetention;
