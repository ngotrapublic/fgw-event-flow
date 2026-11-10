import React from 'react';
import { motion } from 'framer-motion';
import {
    Clock,
    Package,
    AlertTriangle,
    CheckCircle2,
    RotateCcw,
    Mail,
    Calendar,
    Send,
    Tag,
    ChevronRight,
    QrCode,
    Sparkles,
    Check
} from 'lucide-react';

const STATUS_CONFIGS = {
    unverified: {
        label: 'Chờ xác nhận email',
        badgeBg: 'bg-amber-300 text-black border-2 border-black shadow-[2px_2px_0_#000]',
        icon: Mail,
        helper: 'Vui lòng kiểm tra email (cả hòm thư Spam) và nhấp vào liên kết xác nhận trong vòng 24h.'
    },
    pending: {
        label: 'Chờ xét duyệt',
        badgeBg: 'bg-sky-300 text-black border-2 border-black shadow-[2px_2px_0_#000]',
        icon: Clock,
        helper: 'Yêu cầu mượn đã gửi thành công, Thủ kho đang xét duyệt số lượng tồn.'
    },
    approved: {
        label: 'Đã duyệt — Tới kho nhận',
        badgeBg: 'bg-emerald-300 text-black border-2 border-black shadow-[2px_2px_0_#000]',
        icon: CheckCircle2,
        helper: 'Phiếu đã duyệt! Vui lòng tới Kho A102 (Tòa Gamma) để nhận thiết bị trong 3 ngày.'
    },
    handed_over: {
        label: 'Đang mượn',
        badgeBg: 'bg-violet-300 text-black border-2 border-black shadow-[2px_2px_0_#000]',
        icon: Package,
        helper: 'Thiết bị đang được bạn mượn sử dụng.'
    },
    return_pending: {
        label: 'Chờ kho kiểm tra',
        badgeBg: 'bg-teal-300 text-black border-2 border-black shadow-[2px_2px_0_#000]',
        icon: RotateCcw,
        helper: 'Bạn đã báo trả. Vui lòng mang thiết bị đến Kho A102 để thủ kho kiểm tra số lượng và ký nhận.'
    },
    returned: {
        label: 'Đã hoàn tất trả',
        badgeBg: 'bg-slate-200 text-slate-800 border-2 border-black shadow-[2px_2px_0_#000]',
        icon: CheckCircle2,
        helper: null
    },
    returned_with_issue: {
        label: 'Đã trả (có sự cố)',
        badgeBg: 'bg-orange-300 text-black border-2 border-black shadow-[2px_2px_0_#000]',
        icon: AlertTriangle,
        helper: null
    },
    rejected: {
        label: 'Bị từ chối',
        badgeBg: 'bg-rose-300 text-black border-2 border-black shadow-[2px_2px_0_#000]',
        icon: AlertTriangle,
        helper: null
    },
    cancelled: {
        label: 'Đã huỷ',
        badgeBg: 'bg-slate-200 text-slate-600 border-2 border-black shadow-[2px_2px_0_#000]',
        icon: AlertTriangle,
        helper: null
    },
    expired: {
        label: 'Hết hạn xác nhận',
        badgeBg: 'bg-slate-200 text-slate-500 border-2 border-black shadow-[2px_2px_0_#000]',
        icon: Clock,
        helper: null
    }
};

function formatDueDate(isoString) {
    if (!isoString) return '';
    try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return isoString;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    } catch {
        return isoString;
    }
}

function getCountdownBadge(dueAt, status) {
    if (!dueAt || !['handed_over', 'approved', 'return_pending'].includes(status)) return null;
    const now = Date.now();
    const dueMs = new Date(dueAt).getTime();
    if (isNaN(dueMs)) return null;

    const diffHours = Math.round((dueMs - now) / (1000 * 3600));

    if (diffHours < 0) {
        const daysAgo = Math.abs(Math.floor(diffHours / 24)) || 1;
        return {
            text: `Quá hạn ${daysAgo} ngày!`,
            className: 'bg-rose-500 text-white animate-pulse'
        };
    }
    if (diffHours <= 24) {
        return {
            text: `Còn ${Math.max(1, diffHours)} giờ`,
            className: 'bg-amber-400 text-black'
        };
    }
    const daysLeft = Math.ceil(diffHours / 24);
    return {
        text: `Còn ${daysLeft} ngày`,
        className: 'bg-emerald-200 text-emerald-950'
    };
}

export default function BorrowRequestCard({
    request,
    onResendEmail,
    onReturn,
    isResending = false,
    showReturnButton = false
}) {
    if (!request) return null;

    const statusConfig = STATUS_CONFIGS[request.status] || {
        label: request.status,
        badgeBg: 'bg-slate-200 text-slate-800 border-2 border-black shadow-[2px_2px_0_#000]',
        icon: Clock,
        helper: null
    };

    const StatusIcon = statusConfig.icon;
    const isOverdue =
        request.isOverdue ||
        (['handed_over', 'return_pending'].includes(request.status) &&
            request.dueAt &&
            new Date(request.dueAt).getTime() < Date.now());

    const countdown = getCountdownBadge(request.dueAt, request.status);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2 }}
            className="group relative bg-white border-2 border-black rounded-3xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)] transition-all overflow-hidden"
        >
            {/* Top Pass Header: Barcode / Accent Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-5 py-3 text-white flex items-center justify-between border-b-2 border-black">
                <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-violet-400 border border-black inline-block"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-pink-400 border border-black inline-block"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-300 border border-black inline-block"></span>
                    </div>
                    <span className="font-mono text-xs font-black tracking-widest text-amber-300">
                        PASS #{request.id}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {countdown && (
                        <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-md border border-black shadow-[1px_1px_0_#000] ${countdown.className}`}
                        >
                            {countdown.text}
                        </span>
                    )}
                    <span className="text-[10px] font-mono text-slate-400 uppercase hidden sm:inline">
                        FPT GEAR PASS
                    </span>
                </div>
            </div>

            {/* Ticket Body */}
            <div className="p-5 space-y-4">
                {/* Status + Borrower info row */}
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Người mượn
                        </p>
                        <p className="text-sm font-black text-black">
                            {request.borrower?.name || 'Khách vãng lai'}
                        </p>
                        {request.borrower?.email && (
                            <p className="text-[11px] font-medium text-slate-500 truncate max-w-[220px]">
                                {request.borrower.email}
                            </p>
                        )}
                    </div>

                    <div
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider ${statusConfig.badgeBg}`}
                    >
                        <StatusIcon size={14} strokeWidth={2.5} />
                        <span>{statusConfig.label}</span>
                    </div>
                </div>

                {/* Overdue alert banner */}
                {isOverdue && (
                    <div className="flex items-center gap-2.5 p-3 bg-rose-100 border-2 border-black rounded-2xl text-rose-950 text-xs font-black shadow-[2px_2px_0_#000]">
                        <AlertTriangle size={18} className="text-rose-600 flex-shrink-0 animate-bounce" />
                        <div>
                            <p className="font-black text-rose-950">ĐÃ QUÁ HẠN HOÀN TRẢ THIẾT BỊ!</p>
                            <p className="font-medium text-rose-800 text-[11px]">
                                Vui lòng mang ngay thiết bị tới Kho A102 (Tòa Gamma) để bàn giao hoàn tất.
                            </p>
                        </div>
                    </div>
                )}

                {/* Items List */}
                <div className="space-y-2">
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Tag size={13} className="text-slate-600" />
                        Thiết bị mượn ({(request.items || []).length} loại):
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(request.items || []).map((item, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between p-2.5 bg-slate-50 border-2 border-black/10 rounded-xl hover:border-black transition-colors"
                            >
                                <span className="text-xs font-bold text-slate-800 truncate mr-2">
                                    {item.label || item.resourceId}
                                </span>
                                <span className="flex-shrink-0 text-xs font-black px-2 py-0.5 rounded-lg bg-white border-2 border-black shadow-[1px_1px_0_#000] text-indigo-700">
                                    x{item.qty}
                                    {item.receivedQty !== undefined && item.receivedQty !== null && (
                                        <span className="text-slate-500 font-bold ml-1 text-[10px]">
                                            (trả: {item.receivedQty})
                                        </span>
                                    )}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Perforated Divider Line with Left & Right Cutout Notches */}
                <div className="relative my-4">
                    {/* Left notch */}
                    <div className="absolute -left-7 -top-2.5 w-5 h-5 bg-[#fafafa] border-r-2 border-black rounded-full"></div>
                    {/* Dashed line */}
                    <div className="border-t-2 border-dashed border-slate-300 w-full"></div>
                    {/* Right notch */}
                    <div className="absolute -right-7 -top-2.5 w-5 h-5 bg-[#fafafa] border-l-2 border-black rounded-full"></div>
                </div>

                {/* Dates & Location Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-black/10">
                        <Calendar size={14} className="text-indigo-600" />
                        <span className="font-bold text-slate-700">Hạn trả: </span>
                        <strong
                            className={
                                isOverdue
                                    ? 'text-rose-600 font-black underline decoration-2'
                                    : 'text-black font-black'
                            }
                        >
                            {formatDueDate(request.dueAt) || 'Chưa định'}
                        </strong>
                    </div>

                    {request.createdAt && (
                        <span className="text-[11px] font-medium text-slate-400">
                            Ngày tạo: {formatDueDate(request.createdAt)}
                        </span>
                    )}
                </div>

                {/* Reject / Cancel Reasons */}
                {request.rejectReason && (
                    <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-xl text-xs text-rose-900 space-y-1">
                        <p className="font-black flex items-center gap-1.5">
                            <AlertTriangle size={14} className="text-rose-600" /> Lý do từ chối:
                        </p>
                        <p className="italic font-medium">{request.rejectReason}</p>
                    </div>
                )}

                {request.cancelReason && (
                    <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-xl text-xs text-amber-900 space-y-1">
                        <p className="font-black flex items-center gap-1.5">
                            <AlertTriangle size={14} className="text-amber-600" /> Lý do huỷ phiếu:
                        </p>
                        <p className="italic font-medium">{request.cancelReason}</p>
                    </div>
                )}

                {request.returnNote && (
                    <div className="p-3 bg-slate-100 border-2 border-slate-300 rounded-xl text-xs text-slate-800 space-y-1">
                        <p className="font-black">Ghi chú kiểm tra trả thiết bị:</p>
                        <p className="italic font-medium">{request.returnNote}</p>
                    </div>
                )}

                {/* Helper info */}
                {statusConfig.helper && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 flex items-start gap-2">
                        <span className="flex-shrink-0 text-sm">💡</span>
                        <span>{statusConfig.helper}</span>
                    </div>
                )}

                {/* Action Buttons */}
                {(request.status === 'unverified' ||
                    (showReturnButton && request.status === 'handed_over')) && (
                    <div className="pt-2 flex items-center justify-end gap-2.5">
                        {request.status === 'unverified' && onResendEmail && (
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                type="button"
                                disabled={isResending}
                                onClick={() => onResendEmail(request)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border-2 border-black rounded-xl text-xs font-black shadow-[2px_2px_0_#000] hover:shadow-[1px_1px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] active:bg-slate-100 transition-all disabled:opacity-50"
                            >
                                <Send size={13} />
                                {isResending ? 'Đang gửi...' : 'Gửi lại email xác nhận'}
                            </motion.button>
                        )}

                        {showReturnButton && request.status === 'handed_over' && onReturn && (
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                type="button"
                                onClick={() => onReturn(request)}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white border-2 border-black rounded-xl text-xs font-black shadow-[3px_3px_0_#000] hover:shadow-[1px_1px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-indigo-700 active:bg-indigo-800 transition-all"
                            >
                                <RotateCcw size={14} strokeWidth={2.5} />
                                Báo Trả Thiết Bị Ngay
                                <ChevronRight size={14} />
                            </motion.button>
                        )}
                    </div>
                )}
            </div>

            {/* Stylized Ticket Barcode Footer */}
            <div className="bg-slate-50 border-t-2 border-black px-5 py-2.5 flex items-center justify-between text-slate-400">
                <div className="flex items-center gap-1 opacity-70">
                    <span className="font-mono text-[9px] tracking-widest text-slate-600 font-bold">
                        ||||| ||| |||||| || ||||| |||| ||| |||||
                    </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-500">
                    KHO A102 • TÒA GAMMA
                </span>
            </div>
        </motion.div>
    );
}
