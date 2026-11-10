import React from 'react';
import {
    Mail,
    Phone,
    Calendar,
    Clock,
    Package,
    Check,
    X,
    Truck,
    RotateCcw,
    AlertTriangle,
    UserCheck,
    User,
    Eye
} from 'lucide-react';
import {
    ADMIN_STATUS_CONFIGS,
    isRequestOverdue,
    formatDateVi,
    formatDateTimeVi
} from './borrowAdminConstants';

export default function AdminBorrowCard({ request, onSelect, onQuickAction }) {
    if (!request) return null;

    const statusConfig = ADMIN_STATUS_CONFIGS[request.status] || {
        label: request.status,
        badgeBg: 'bg-slate-200 text-slate-800 border-2 border-black',
        icon: Clock
    };
    const StatusIcon = statusConfig.icon;
    const overdue = isRequestOverdue(request);

    const handleActionClick = (e, action) => {
        e.stopPropagation();
        if (onQuickAction) {
            onQuickAction(request, action);
        } else if (onSelect) {
            onSelect(request);
        }
    };

    const activeReason = request.rejectReason || request.cancelReason || request.returnNote;

    return (
        <div
            onClick={() => onSelect && onSelect(request)}
            className={`group bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] hover:-translate-x-[1px] hover:-translate-y-[1px] transition-all cursor-pointer flex flex-col justify-between overflow-hidden ${
                overdue ? 'ring-2 ring-rose-500 ring-offset-2' : ''
            }`}
        >
            {/* Top Header Strip */}
            <div>
                <div className="bg-slate-900 px-4 py-2.5 text-white flex items-center justify-between gap-2 border-b-2 border-black">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-xs font-black text-amber-300 truncate">
                            #{request.id}
                        </span>
                        <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase border border-black ${
                                request.borrowerType === 'account'
                                    ? 'bg-indigo-200 text-indigo-950'
                                    : 'bg-amber-200 text-amber-950'
                            }`}
                        >
                            {request.borrowerType === 'account' ? (
                                <>
                                    <UserCheck size={10} strokeWidth={3} /> Tài khoản
                                </>
                            ) : (
                                <>
                                    <User size={10} strokeWidth={3} /> Khách
                                </>
                            )}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        {overdue && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500 text-white border border-black text-[10px] font-black uppercase animate-pulse">
                                <AlertTriangle size={10} strokeWidth={3} /> Quá hạn
                            </span>
                        )}
                        <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-black shadow-[1px_1px_0_#000] ${statusConfig.badgeBg}`}
                        >
                            <StatusIcon size={12} strokeWidth={2.5} />
                            {statusConfig.label}
                        </span>
                    </div>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3.5">
                    {/* Borrower unmasked details */}
                    <div className="space-y-1">
                        <h3 className="text-base font-black text-black leading-snug truncate">
                            {request.borrower?.name || 'Khách vãng lai'}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-600">
                            {request.borrower?.email && (
                                <span className="inline-flex items-center gap-1.5 truncate max-w-full">
                                    <Mail size={13} className="text-indigo-600 flex-shrink-0" />
                                    <span className="truncate">{request.borrower.email}</span>
                                </span>
                            )}
                            {request.borrower?.phone && (
                                <span className="inline-flex items-center gap-1.5 flex-shrink-0 font-mono font-bold text-slate-800">
                                    <Phone size={13} className="text-emerald-600 flex-shrink-0" />
                                    {request.borrower.phone}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Requested Equipment Chips */}
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                            <Package size={11} /> Thiết bị ({(request.items || []).length} loại)
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {(request.items || []).map((item, idx) => {
                                const hasReceived =
                                    item.receivedQty !== undefined && item.receivedQty !== null;
                                const shortReturn = hasReceived && item.receivedQty < item.qty;
                                return (
                                    <span
                                        key={idx}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border-2 border-black text-xs font-bold shadow-[1px_1px_0_#000] ${
                                            shortReturn
                                                ? 'bg-orange-100 text-orange-950'
                                                : 'bg-slate-50 text-slate-900'
                                        }`}
                                    >
                                        <span className="truncate max-w-[170px]">
                                            {item.label || item.resourceId}
                                        </span>
                                        <span className="px-1.5 py-0.2 rounded-md bg-white border border-black font-black text-[11px] text-indigo-700">
                                            x{item.qty}
                                        </span>
                                        {hasReceived && (
                                            <span
                                                className={`text-[10px] font-black ${
                                                    shortReturn ? 'text-rose-600' : 'text-emerald-700'
                                                }`}
                                            >
                                                (nhận {item.receivedQty})
                                            </span>
                                        )}
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    {/* Dates Metadata */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t-2 border-dashed border-slate-200 text-xs">
                        <div>
                            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                                Hạn trả
                            </span>
                            <span
                                className={`inline-flex items-center gap-1 font-black mt-0.5 ${
                                    overdue ? 'text-rose-600' : 'text-black'
                                }`}
                            >
                                <Calendar size={13} />
                                {formatDateVi(request.dueAt || request.dueDate)}
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                                Ngày tạo
                            </span>
                            <span className="inline-flex items-center gap-1 font-bold text-slate-600 mt-0.5">
                                <Clock size={12} />
                                {formatDateTimeVi(request.createdAt)}
                            </span>
                        </div>
                    </div>

                    {/* Note or Reason preview */}
                    {(request.note || activeReason) && (
                        <div className="space-y-1.5">
                            {request.note && (
                                <p className="text-[11px] font-medium text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 line-clamp-2">
                                    <strong className="text-slate-800">Ghi chú:</strong> {request.note}
                                </p>
                            )}
                            {activeReason && (
                                <p className="text-[11px] font-bold text-rose-900 bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200 line-clamp-2">
                                    <strong className="text-rose-700">
                                        {request.rejectReason
                                            ? 'Lý do từ chối:'
                                            : request.cancelReason
                                                ? 'Lý do huỷ:'
                                                : 'Ghi chú trả:'}
                                    </strong>{' '}
                                    {activeReason}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="px-4 py-3 bg-slate-50 border-t-2 border-black flex items-center gap-2">
                {request.status === 'pending' && (
                    <>
                        <button
                            type="button"
                            onClick={(e) => handleActionClick(e, 'approve')}
                            className="flex-1 py-2 px-3 bg-emerald-400 hover:bg-emerald-500 text-black font-black text-xs border-2 border-black rounded-xl shadow-[2px_2px_0_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#000] transition-all flex items-center justify-center gap-1.5"
                        >
                            <Check size={14} strokeWidth={3} /> Duyệt
                        </button>
                        <button
                            type="button"
                            onClick={(e) => handleActionClick(e, 'reject')}
                            className="flex-1 py-2 px-3 bg-rose-400 hover:bg-rose-500 text-black font-black text-xs border-2 border-black rounded-xl shadow-[2px_2px_0_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#000] transition-all flex items-center justify-center gap-1.5"
                        >
                            <X size={14} strokeWidth={3} /> Từ chối
                        </button>
                    </>
                )}

                {request.status === 'approved' && (
                    <>
                        <button
                            type="button"
                            onClick={(e) => handleActionClick(e, 'handover')}
                            className="flex-1 py-2 px-3 bg-emerald-400 hover:bg-emerald-500 text-black font-black text-xs border-2 border-black rounded-xl shadow-[2px_2px_0_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#000] transition-all flex items-center justify-center gap-1.5"
                        >
                            <Truck size={14} strokeWidth={2.5} /> Đã giao
                        </button>
                        <button
                            type="button"
                            onClick={(e) => handleActionClick(e, 'cancel')}
                            className="flex-1 py-2 px-3 bg-rose-400 hover:bg-rose-500 text-black font-black text-xs border-2 border-black rounded-xl shadow-[2px_2px_0_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#000] transition-all flex items-center justify-center gap-1.5"
                        >
                            <X size={14} strokeWidth={3} /> Huỷ
                        </button>
                    </>
                )}

                {(request.status === 'handed_over' || request.status === 'return_pending') && (
                    <button
                        type="button"
                        onClick={(e) => handleActionClick(e, 'confirmReturn')}
                        className="w-full py-2 px-3 bg-emerald-400 hover:bg-emerald-500 text-black font-black text-xs border-2 border-black rounded-xl shadow-[2px_2px_0_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#000] transition-all flex items-center justify-center gap-1.5"
                    >
                        <RotateCcw size={14} strokeWidth={2.5} /> Chốt trả
                    </button>
                )}

                {!['pending', 'approved', 'handed_over', 'return_pending'].includes(
                    request.status
                ) && (
                    <button
                        type="button"
                        onClick={() => onSelect && onSelect(request)}
                        className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-slate-800 font-black text-xs border-2 border-black rounded-xl shadow-[2px_2px_0_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-center gap-1.5"
                    >
                        <Eye size={14} strokeWidth={2.5} /> Xem chi tiết & lịch sử
                    </button>
                )}
            </div>
        </div>
    );
}
