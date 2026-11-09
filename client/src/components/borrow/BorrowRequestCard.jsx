import React from 'react';
import {
    Clock,
    Package,
    AlertTriangle,
    CheckCircle2,
    RotateCcw,
    Mail,
    Calendar,
    Send
} from 'lucide-react';
import { Button } from '../ui/Button';

const STATUS_CONFIGS = {
    unverified: {
        label: 'Chờ xác nhận email',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
        icon: Mail,
        helper: 'Vui lòng kiểm tra email (kể cả hòm thư Spam) và nhấp vào liên kết xác nhận.'
    },
    pending: {
        label: 'Chờ xét duyệt',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
        icon: Clock,
        helper: 'Yêu cầu mượn đã gửi thành công, đang chờ Quản trị viên duyệt.'
    },
    approved: {
        label: 'Đã duyệt — Tới kho nhận',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        icon: CheckCircle2,
        helper: 'Phiếu đã duyệt! Vui lòng tới kho thiết bị để nhận đồ.'
    },
    handed_over: {
        label: 'Đang mượn',
        badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        icon: Package,
        helper: 'Thiết bị đang được bạn mượn sử dụng.'
    },
    return_pending: {
        label: 'Chờ kho kiểm tra',
        badgeClass: 'bg-teal-100 text-teal-800 border-teal-300',
        icon: RotateCcw,
        helper: 'Đã báo trả! Vui lòng mang thiết bị đến kho để thủ kho kiểm tra và chốt.'
    },
    returned: {
        label: 'Đã trả hoàn tất',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
        icon: CheckCircle2,
        helper: null
    },
    returned_with_issue: {
        label: 'Đã trả (có sự cố)',
        badgeClass: 'bg-orange-100 text-orange-800 border-orange-300',
        icon: AlertTriangle,
        helper: null
    },
    rejected: {
        label: 'Bị từ chối',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
        icon: AlertTriangle,
        helper: null
    },
    cancelled: {
        label: 'Đã huỷ',
        badgeClass: 'bg-slate-100 text-slate-600 border-slate-300',
        icon: AlertTriangle,
        helper: null
    },
    expired: {
        label: 'Hết hạn xác nhận',
        badgeClass: 'bg-slate-100 text-slate-500 border-slate-300',
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
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
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
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm hover:shadow transition-shadow space-y-3.5">
            {/* Header: ID + Status badge */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        #{request.id}
                    </span>
                    {request.borrower?.name && (
                        <span className="text-xs text-slate-600 font-medium truncate max-w-[150px] sm:max-w-[200px]">
                            {request.borrower.name}
                        </span>
                    )}
                </div>

                <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusConfig.badgeClass}`}
                >
                    <StatusIcon size={13} />
                    <span>{statusConfig.label}</span>
                </div>
            </div>

            {/* Overdue alert banner if overdue */}
            {isOverdue && (
                <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-semibold">
                    <AlertTriangle size={15} className="text-rose-600 flex-shrink-0" />
                    <span>Đã quá hạn trả thiết bị! Vui lòng hoàn trả ngay tại kho.</span>
                </div>
            )}

            {/* Items list */}
            <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Thiết bị đăng ký mượn:
                </p>
                <div className="space-y-1">
                    {(request.items || []).map((item, idx) => (
                        <div
                            key={idx}
                            className="flex items-center justify-between text-sm py-1 px-2.5 rounded bg-slate-50 border border-slate-100"
                        >
                            <span className="font-medium text-slate-800">
                                {item.label || item.resourceId}
                            </span>
                            <span className="text-xs font-bold bg-white text-indigo-700 px-2 py-0.5 rounded border border-slate-200">
                                SL: {item.qty}
                                {item.receivedQty !== undefined && item.receivedQty !== null && (
                                    <span className="text-slate-500 font-normal ml-1">
                                        (Đã nhận lại: {item.receivedQty})
                                    </span>
                                )}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Due date and details */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-slate-400" />
                    <span>
                        Hạn trả:{' '}
                        <strong className={isOverdue ? 'text-rose-600' : 'text-slate-800'}>
                            {formatDueDate(request.dueAt) || 'Không có'}
                        </strong>
                    </span>
                </div>

                {request.createdAt && (
                    <span className="text-slate-400">
                        Tạo lúc: {formatDueDate(request.createdAt)}
                    </span>
                )}
            </div>

            {/* Reject reason if present */}
            {request.rejectReason && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-1">
                    <p className="font-semibold flex items-center gap-1">
                        <AlertTriangle size={13} /> Lý do từ chối:
                    </p>
                    <p className="italic">{request.rejectReason}</p>
                </div>
            )}

            {/* Cancel reason if present */}
            {request.cancelReason && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
                    <p className="font-semibold flex items-center gap-1">
                        <AlertTriangle size={13} /> Lý do huỷ:
                    </p>
                    <p className="italic">{request.cancelReason}</p>
                </div>
            )}

            {/* Return note if present */}
            {request.returnNote && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 space-y-1">
                    <p className="font-semibold">Ghi chú khi trả:</p>
                    <p className="italic">{request.returnNote}</p>
                </div>
            )}

            {/* Status helper text */}
            {statusConfig.helper && (
                <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded">
                    {statusConfig.helper}
                </p>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                {request.status === 'unverified' && onResendEmail && (
                    <Button
                        size="sm"
                        variant="outline"
                        isLoading={isResending}
                        onClick={() => onResendEmail(request)}
                        className="text-xs"
                    >
                        <Send size={13} className="mr-1.5" />
                        Gửi lại email xác nhận
                    </Button>
                )}

                {showReturnButton && request.status === 'handed_over' && onReturn && (
                    <Button
                        size="sm"
                        variant="primary"
                        onClick={() => onReturn(request)}
                        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                    >
                        <RotateCcw size={13} className="mr-1.5" />
                        Báo trả thiết bị
                    </Button>
                )}
            </div>
        </div>
    );
}

