import React from 'react';
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
    ChevronRight
} from 'lucide-react';

const STATUS_CONFIGS = {
    unverified: {
        label: 'Chờ xác nhận email',
        badgeBg: 'bg-amber-300 text-slate-900 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
        icon: Mail,
        helper: 'Vui lòng kiểm tra email (kể cả hòm thư Spam) và nhấp vào liên kết xác nhận.'
    },
    pending: {
        label: 'Chờ xét duyệt',
        badgeBg: 'bg-sky-300 text-slate-900 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
        icon: Clock,
        helper: 'Yêu cầu mượn đã gửi thành công, đang chờ Quản trị viên duyệt.'
    },
    approved: {
        label: 'Đã duyệt — Tới kho nhận',
        badgeBg: 'bg-emerald-300 text-slate-900 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
        icon: CheckCircle2,
        helper: 'Phiếu đã duyệt! Vui lòng tới kho thiết bị để nhận đồ.'
    },
    handed_over: {
        label: 'Đang mượn',
        badgeBg: 'bg-violet-300 text-slate-900 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
        icon: Package,
        helper: 'Thiết bị đang được bạn mượn sử dụng.'
    },
    return_pending: {
        label: 'Chờ kho kiểm tra',
        badgeBg: 'bg-teal-300 text-slate-900 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
        icon: RotateCcw,
        helper: 'Đã báo trả! Vui lòng mang thiết bị đến kho để thủ kho kiểm tra và chốt.'
    },
    returned: {
        label: 'Đã trả hoàn tất',
        badgeBg: 'bg-slate-200 text-slate-800 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
        icon: CheckCircle2,
        helper: null
    },
    returned_with_issue: {
        label: 'Đã trả (sự cố/thiếu)',
        badgeBg: 'bg-orange-300 text-slate-900 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
        icon: AlertTriangle,
        helper: null
    },
    rejected: {
        label: 'Bị từ chối',
        badgeBg: 'bg-rose-300 text-slate-900 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
        icon: AlertTriangle,
        helper: null
    },
    cancelled: {
        label: 'Đã huỷ',
        badgeBg: 'bg-slate-200 text-slate-600 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
        icon: AlertTriangle,
        helper: null
    },
    expired: {
        label: 'Hết hạn xác nhận',
        badgeBg: 'bg-slate-200 text-slate-500 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
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
        badgeBg: 'bg-slate-200 text-slate-800 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
        icon: Clock,
        helper: null
    };

    const StatusIcon = statusConfig.icon;
    const isOverdue =
        request.isOverdue ||
        (['handed_over', 'return_pending'].includes(request.status) &&
            request.dueAt &&
            new Date(request.dueAt).getTime() < Date.now());

    return (
        <div className="group relative bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200 p-4 sm:p-5 overflow-hidden">
            {/* Top Bar: Corner Dots + ID + Status */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                    {/* Decorative neo dots */}
                    <div className="flex items-center gap-1 mr-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-violet-500 border border-black inline-block"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-pink-500 border border-black inline-block"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-black inline-block"></span>
                    </div>

                    <span className="font-mono text-xs font-black bg-slate-900 text-white px-2.5 py-1 rounded-md shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                        #{request.id}
                    </span>

                    {request.borrower?.name && (
                        <span className="text-xs font-bold text-slate-700 truncate max-w-[140px] sm:max-w-[200px]">
                            {request.borrower.name}
                        </span>
                    )}
                </div>

                {/* Status Badge */}
                <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${statusConfig.badgeBg}`}
                >
                    <StatusIcon size={13} strokeWidth={2.5} />
                    <span>{statusConfig.label}</span>
                </div>
            </div>

            {/* Overdue alert banner if overdue */}
            {isOverdue && (
                <div className="mt-3.5 flex items-center gap-2 p-2.5 bg-rose-100 border-2 border-black rounded-xl text-rose-950 text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <AlertTriangle size={16} className="text-rose-600 flex-shrink-0 animate-bounce" />
                    <span>ĐÃ QUÁ HẠN TRẢ THIẾT BỊ! Vui lòng hoàn trả ngay tại kho.</span>
                </div>
            )}

            {/* Items list */}
            <div className="mt-3.5 space-y-2">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Tag size={13} className="text-slate-600" />
                    Thiết bị đăng ký:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(request.items || []).map((item, idx) => (
                        <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl hover:border-black transition-colors"
                        >
                            <span className="text-xs font-bold text-slate-800 truncate mr-2">
                                {item.label || item.resourceId}
                            </span>
                            <span className="flex-shrink-0 text-xs font-black px-2 py-0.5 rounded-md bg-white border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] text-indigo-700">
                                x{item.qty}
                                {item.receivedQty !== undefined && item.receivedQty !== null && (
                                    <span className="text-slate-500 font-semibold ml-1 text-[11px]">
                                        (trả: {item.receivedQty})
                                    </span>
                                )}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Date Details Bar */}
            <div className="mt-3.5 pt-3 border-t-2 border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
                <div className="flex items-center gap-1.5 font-bold">
                    <Calendar size={14} className="text-indigo-600" />
                    <span>Hạn trả: </span>
                    <span
                        className={
                            isOverdue
                                ? 'text-rose-600 font-black underline decoration-2'
                                : 'text-slate-900 font-black'
                        }
                    >
                        {formatDueDate(request.dueAt) || 'Chưa định'}
                    </span>
                </div>

                {request.createdAt && (
                    <span className="text-[11px] font-medium text-slate-400">
                        Tạo ngày: {formatDueDate(request.createdAt)}
                    </span>
                )}
            </div>

            {/* Reject reason */}
            {request.rejectReason && (
                <div className="mt-3 p-3 bg-rose-50 border-2 border-rose-300 rounded-xl text-xs text-rose-900 space-y-1">
                    <p className="font-black flex items-center gap-1.5">
                        <AlertTriangle size={13} className="text-rose-600" /> Lý do từ chối:
                    </p>
                    <p className="italic font-medium">{request.rejectReason}</p>
                </div>
            )}

            {/* Cancel reason */}
            {request.cancelReason && (
                <div className="mt-3 p-3 bg-amber-50 border-2 border-amber-300 rounded-xl text-xs text-amber-900 space-y-1">
                    <p className="font-black flex items-center gap-1.5">
                        <AlertTriangle size={13} className="text-amber-600" /> Lý do huỷ:
                    </p>
                    <p className="italic font-medium">{request.cancelReason}</p>
                </div>
            )}

            {/* Return note */}
            {request.returnNote && (
                <div className="mt-3 p-3 bg-slate-100 border-2 border-slate-300 rounded-xl text-xs text-slate-800 space-y-1">
                    <p className="font-black">Ghi chú kiểm tra trả:</p>
                    <p className="italic font-medium">{request.returnNote}</p>
                </div>
            )}

            {/* Status helper text */}
            {statusConfig.helper && (
                <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-600">
                    💡 {statusConfig.helper}
                </div>
            )}

            {/* Action Buttons */}
            {(request.status === 'unverified' ||
                (showReturnButton && request.status === 'handed_over')) && (
                <div className="mt-4 pt-3 border-t-2 border-slate-100 flex items-center justify-end gap-2">
                    {request.status === 'unverified' && onResendEmail && (
                        <button
                            type="button"
                            disabled={isResending}
                            onClick={() => onResendEmail(request)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-black rounded-lg text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] active:bg-slate-100 transition-all disabled:opacity-50"
                        >
                            <Send size={13} />
                            {isResending ? 'Đang gửi...' : 'Gửi lại email xác nhận'}
                        </button>
                    )}

                    {showReturnButton && request.status === 'handed_over' && onReturn && (
                        <button
                            type="button"
                            onClick={() => onReturn(request)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white border-2 border-black rounded-xl text-xs font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-indigo-700 active:bg-indigo-800 transition-all"
                        >
                            <RotateCcw size={14} strokeWidth={2.5} />
                            Báo Trả Thiết Bị Ngay
                            <ChevronRight size={14} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
