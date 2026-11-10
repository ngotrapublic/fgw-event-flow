import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Printer,
    QrCode,
    Download,
    Copy,
    Check,
    Loader2,
    AlertTriangle,
    RefreshCw,
    Sparkles,
    Smartphone
} from 'lucide-react';
import { borrowAdminApi } from '../../api/borrow-admin';
import { useToast } from '../Toast';

export default function BorrowQr() {
    const navigate = useNavigate();
    const { showSuccess, showError } = useToast();

    const [qrData, setQrData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);
    const [copied, setCopied] = useState(false);

    const fetchQr = useCallback(async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            const res = await borrowAdminApi.qrStation();
            setQrData(res.data);
        } catch (err) {
            console.error('[BORROW QR] Error loading QR station:', err);
            const msg =
                err.response?.data?.error ||
                'Không thể tạo mã QR trạm mượn trả. Vui lòng kiểm tra cấu hình server.';
            setErrorMsg(msg);
            showError(msg);
        } finally {
            setLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        fetchQr();
    }, [fetchQr]);

    const handleCopyUrl = async () => {
        if (!qrData?.url) return;
        try {
            await navigator.clipboard.writeText(qrData.url);
            setCopied(true);
            showSuccess('Đã sao chép đường dẫn trang mượn trả!');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            showError('Không thể sao chép tự động, vui lòng copy thủ công.');
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-6 pb-10">
            {/* Scoped Print Styles to isolate ONLY the printable QR poster and override global print.css */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    html body #borrow-qr-print-area,
                    html body #borrow-qr-print-area * {
                        visibility: visible !important;
                        box-shadow: none !important;
                    }
                    html body #borrow-qr-print-area {
                        position: fixed !important;
                        inset: 0 !important;
                        width: 210mm !important;
                        max-width: 210mm !important;
                        min-width: 210mm !important;
                        height: 297mm !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        margin: 0 !important;
                        padding: 15mm !important;
                        background: #ffffff !important;
                        z-index: 9999 !important;
                    }
                    html body #borrow-qr-print-area #borrow-qr-poster-card {
                        width: 145mm !important;
                        max-width: 145mm !important;
                        min-width: 0 !important;
                        margin: 0 auto !important;
                        background: #ffffff !important;
                    }
                    html body #borrow-qr-print-area #borrow-qr-poster-card .qr-poster-header {
                        background: #0f172a !important;
                        padding: 1.25rem 1.5rem !important;
                    }
                    html body #borrow-qr-print-area #borrow-qr-poster-card .qr-poster-header h2,
                    html body #borrow-qr-print-area #borrow-qr-poster-card .qr-poster-header p {
                        color: #ffffff !important;
                    }
                    html body #borrow-qr-print-area #borrow-qr-poster-card .qr-poster-badge {
                        background: #fcd34d !important;
                        color: #000000 !important;
                        padding: 0.25rem 0.75rem !important;
                    }
                    html body #borrow-qr-print-area #borrow-qr-poster-card .qr-poster-body {
                        background: #fffbeb !important;
                        padding: 2rem !important;
                    }
                    html body #borrow-qr-print-area #borrow-qr-poster-card .qr-poster-url {
                        width: 100% !important;
                        max-width: 100% !important;
                        background: #ffffff !important;
                        padding: 0.625rem 1rem !important;
                    }
                    html body #borrow-qr-print-area #borrow-qr-poster-card .qr-poster-footer {
                        background: #f1f5f9 !important;
                        padding: 0.75rem 1.5rem !important;
                    }
                }
            `}</style>

            {/* Screen Toolbar (hidden when printing) */}
            <div className="print:hidden bg-white border-2 border-black rounded-2xl p-4 sm:p-5 shadow-[4px_4px_0_#000] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => navigate('/equipment-loans')}
                        className="p-2.5 rounded-xl bg-white hover:bg-slate-100 border-2 border-black shadow-[2px_2px_0_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all"
                        title="Quay lại Quản lý mượn trả"
                    >
                        <ArrowLeft size={18} strokeWidth={2.5} />
                    </button>
                    <div>
                        <h1 className="text-lg sm:text-xl font-black text-black tracking-tight flex items-center gap-2">
                            <QrCode size={20} strokeWidth={2.5} className="text-amber-600" />
                            Mã QR Trạm Mượn Trả Thiết Bị
                        </h1>
                        <p className="text-xs font-bold text-slate-500">
                            In poster dán tại Kho A102 / quầy trực để sinh viên & giảng viên quét mượn trả
                        </p>
                    </div>
                </div>

                {qrData && (
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={handleCopyUrl}
                            className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-black font-black text-xs border-2 border-black rounded-xl shadow-[2px_2px_0_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center gap-1.5"
                        >
                            {copied ? (
                                <>
                                    <Check size={14} strokeWidth={3} className="text-emerald-600" /> Đã
                                    chép link
                                </>
                            ) : (
                                <>
                                    <Copy size={14} strokeWidth={2.5} /> Copy URL
                                </>
                            )}
                        </button>

                        <a
                            href={qrData.qr}
                            download="qr-tram-muon-tra.png"
                            className="px-3.5 py-2.5 bg-sky-300 hover:bg-sky-400 text-black font-black text-xs border-2 border-black rounded-xl shadow-[2px_2px_0_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center gap-1.5"
                        >
                            <Download size={14} strokeWidth={2.5} /> Tải ảnh PNG
                        </a>

                        <button
                            type="button"
                            onClick={handlePrint}
                            className="px-4 py-2.5 bg-amber-300 hover:bg-amber-400 text-black font-black text-xs border-2 border-black rounded-xl shadow-[3px_3px_0_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center gap-1.5"
                        >
                            <Printer size={15} strokeWidth={2.5} /> In Poster QR
                        </button>
                    </div>
                )}
            </div>

            {/* Content / Printable Poster */}
            {loading ? (
                <div className="p-14 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0_#000] text-center space-y-3">
                    <Loader2 size={34} className="animate-spin text-indigo-600 mx-auto" />
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                        Đang tạo mã QR từ APP_PUBLIC_URL...
                    </p>
                </div>
            ) : errorMsg ? (
                <div className="p-8 bg-rose-50 border-2 border-black rounded-2xl shadow-[4px_4px_0_#000] text-center space-y-4 max-w-lg mx-auto">
                    <div className="w-14 h-14 bg-rose-300 border-2 border-black rounded-2xl flex items-center justify-center mx-auto shadow-[2px_2px_0_#000]">
                        <AlertTriangle size={28} strokeWidth={2.5} className="text-black" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-base font-black text-black">Chưa thể tạo Mã QR</h3>
                        <p className="text-xs font-bold text-rose-800">{errorMsg}</p>
                        <p className="text-[11px] text-slate-600 font-medium pt-1">
                            Hãy đảm bảo biến môi trường <code className="bg-white px-1 py-0.5 rounded border border-black">APP_PUBLIC_URL</code> đã được cấu hình trên server (ví dụ: https://event.greenwich-it.com).
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={fetchQr}
                        className="px-4 py-2 bg-white hover:bg-slate-50 text-black font-black text-xs border-2 border-black rounded-xl shadow-[2px_2px_0_#000] inline-flex items-center gap-1.5"
                    >
                        <RefreshCw size={14} /> Thử lại
                    </button>
                </div>
            ) : (
                <div id="borrow-qr-print-area" className="flex justify-center">
                    <div
                        id="borrow-qr-poster-card"
                        className="w-full max-w-md bg-white border-[3px] border-black rounded-3xl shadow-[8px_8px_0_#000] overflow-hidden"
                    >
                        {/* Poster Header Banner */}
                        <div className="qr-poster-header bg-slate-900 text-white px-6 py-5 border-b-[3px] border-black text-center space-y-1.5">
                            <span className="qr-poster-badge inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-300 text-black border border-black text-[10px] font-black uppercase tracking-widest">
                                <Sparkles size={11} strokeWidth={3} /> Greenwich Equipment Station
                            </span>
                            <h2 className="text-2xl font-black tracking-tight uppercase pt-1">
                                Quét để mượn / trả thiết bị
                            </h2>
                            <p className="text-xs font-semibold text-slate-300">
                                Mở Camera điện thoại hoặc Zalo để quét mã bên dưới
                            </p>
                        </div>

                        {/* QR Frame */}
                        <div className="qr-poster-body p-8 bg-amber-50/40 flex flex-col items-center space-y-5">
                            <div className="p-4 bg-white border-[3px] border-black rounded-2xl shadow-[5px_5px_0_#000]">
                                <img
                                    src={qrData.qr}
                                    alt="Mã QR Trạm Mượn Trả Thiết Bị"
                                    className="w-64 h-64 sm:w-72 sm:h-72 object-contain block"
                                />
                            </div>

                            {/* Public URL Text */}
                            <div className="qr-poster-url w-full bg-white border-2 border-black rounded-xl px-4 py-2.5 text-center shadow-[2px_2px_0_#000]">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Địa chỉ truy cập
                                </p>
                                <p className="text-xs sm:text-sm font-mono font-black text-indigo-700 break-all mt-0.5">
                                    {qrData.url}
                                </p>
                            </div>

                            {/* Simple 3-step poster instructions */}
                            <div className="w-full grid grid-cols-3 gap-2 text-center pt-1">
                                <div className="p-2 bg-white border-2 border-black rounded-xl text-[10px] font-bold text-slate-700">
                                    <span className="block font-black text-indigo-700 text-xs mb-0.5">
                                        1. Quét QR
                                    </span>
                                    Chọn thiết bị & ngày trả
                                </div>
                                <div className="p-2 bg-white border-2 border-black rounded-xl text-[10px] font-bold text-slate-700">
                                    <span className="block font-black text-emerald-700 text-xs mb-0.5">
                                        2. Nhận đồ
                                    </span>
                                    Kho A102 (Tòa Gamma)
                                </div>
                                <div className="p-2 bg-white border-2 border-black rounded-xl text-[10px] font-bold text-slate-700">
                                    <span className="block font-black text-amber-700 text-xs mb-0.5">
                                        3. Hoàn trả
                                    </span>
                                    Quét lại mã để báo trả
                                </div>
                            </div>
                        </div>

                        {/* Poster Footer */}
                        <div className="qr-poster-footer bg-slate-100 border-t-2 border-black px-6 py-3 flex items-center justify-center gap-2 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                            <Smartphone size={14} strokeWidth={2.5} /> Không cần cài đặt ứng dụng
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
