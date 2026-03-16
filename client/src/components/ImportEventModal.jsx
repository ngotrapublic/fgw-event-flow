import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import api from '../services/api';
import { useToast } from './Toast';

const ImportEventModal = ({ onClose, onSuccess }) => {
    const { showSuccess, showError } = useToast();
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);

    const handleDownloadTemplate = async () => {
        try {
            const response = await api.get('/import/template', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'Event_Import_Template.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
            showSuccess('Downloaded template successfully.');
        } catch (error) {
            console.error('Download error:', error);
            showError('Failed to download template.');
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setUploadResult(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post('/import/events', formData, {
                headers: { 'Content-Type': 'multipart/form-data' } // Browser handles this usually but good to be explicit or let api handle it
            });

            setUploadResult({
                success: true,
                message: response.data.message,
                errors: response.data.errors || []
            });
            showSuccess('Import process completed.');
            if (onSuccess) onSuccess();

        } catch (error) {
            console.error('Upload error:', error);
            const msg = error.response?.data?.message || 'Upload failed.';
            setUploadResult({
                success: false,
                message: msg
            });
            showError(msg);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <Card className="w-full max-w-lg shadow-2xl border-0 bg-white">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                            <FileSpreadsheet size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Import Events</h3>
                            <p className="text-xs text-slate-500">Upload Excel file to create multiple events</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-200">
                        <X size={20} />
                    </Button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Step 1: Download Template */}
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white text-blue-500 rounded-full shadow-sm">
                                <Download size={18} />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm">Step 1: Get Template</h4>
                                <p className="text-xs text-slate-500">Use this standard format</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="bg-white border-blue-200 text-blue-600 hover:bg-blue-50">
                            Download
                        </Button>
                    </div>

                    {/* Step 2: Upload */}
                    <div>
                        <h4 className="font-bold text-slate-800 text-sm mb-3">Step 2: Upload Excel File</h4>
                        <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${file ? 'border-green-300 bg-green-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}>
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                {file ? (
                                    <>
                                        <FileSpreadsheet className="w-8 h-8 text-green-500 mb-2" />
                                        <p className="text-sm text-green-700 font-medium">{file.name}</p>
                                        <p className="text-xs text-green-500">Click to change</p>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-8 h-8 text-slate-400 mb-2" />
                                        <p className="text-sm text-slate-500">
                                            <span className="font-semibold">Click to upload</span> or drag and drop
                                        </p>
                                        <p className="text-xs text-slate-400">XLSX or XLS files</p>
                                    </>
                                )}
                            </div>
                            <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />
                        </label>
                    </div>

                    {/* Results */}
                    {uploadResult && (
                        <div className={`p-4 rounded-xl border ${uploadResult.success ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                            <div className="flex items-start gap-3">
                                {uploadResult.success ? (
                                    <CheckCircle className="text-green-600 shrink-0 mt-0.5" size={18} />
                                ) : (
                                    <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
                                )}
                                <div>
                                    <p className={`text-sm font-bold ${uploadResult.success ? 'text-green-800' : 'text-red-800'}`}>
                                        {uploadResult.message}
                                    </p>
                                    {uploadResult.errors && uploadResult.errors.length > 0 && (
                                        <div className="mt-2 text-xs text-red-700 space-y-1 max-h-32 overflow-y-auto bg-white/50 p-2 rounded">
                                            {uploadResult.errors.map((err, idx) => (
                                                <div key={idx}>• {err}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 rounded-b-xl">
                    <Button variant="ghost" onClick={onClose} disabled={isUploading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleUpload}
                        disabled={!file || isUploading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[100px]"
                    >
                        {isUploading ? <Loader2 size={18} className="animate-spin mr-2" /> : <Upload size={18} className="mr-2" />}
                        {isUploading ? 'Uploading...' : 'Import'}
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default ImportEventModal;
