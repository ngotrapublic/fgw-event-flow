import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
    AlertTriangle,
    RotateCcw,
    Calendar,
    Send,
    Tag,
    ChevronRight
} from 'lucide-react';
import {
    formatVnDueDate,
    formatVnDateShort,
    getCountdownBadge,
    isRequestOverdue
} from '../../lib/borrow-utils';
import { BorrowStatusBadge, getStatusConfig } from './BorrowStatus';

export default function BorrowRequestCard({
    request,
    onResendEmail,
    onReturn,
    isResending = false,
    showReturnButton = false
}) {
    const shouldReduceMotion = useReducedMotion();
    if (!request) return null;

    const statusConfig = getStatusConfig(request.status);
    const isOverdue = isRequestOverdue(request);
    const countdown = getCountdownBadge(request.dueAt, request.status, Date.now(), request.dueDate);

    return (
        <motion.article
            initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={shouldReduceMotion ? undefined : { y: -2 }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
            className="group relative bg-white border-2 border-black rounded-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow overflow-hidden"
        >
            {/* Top Pass Header */}
            <div className="bg-slate-900 px-4 sm:px-5 py-3 text-white flex items-center justify-between border-b-2 border-black">
                <div className="flex items-center gap-2.5">
                    <div className="hidden sm:flex items-center gap-1" aria-hidden="true">
                        <span className="w-2.5 h-2.5 rounded-full bg-violet-400 border border-black inline-block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-pink-400 border border-black inline-block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-300 border border-black inline-block" />
                    </div>
                    <span className="font-mono text-xs font-black tracking-widest text-amber-300">
                        PASS #{request.id}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {countdown && (
                        <span
                            className={`text-xs font-black px-2.5 py-0.5 rounded-md border border-black shadow-[1px_1px_0_#000] ${countdown.className}`}
                        >
                            {countdown.text}
                        </span>
                    )}
                    <span className="text-xs font-mono text-slate-300 uppercase hidden sm:inline">
                        FPT GEAR PASS
                    </span>
                </div>
            </div>

            {/* Ticket Body: Status -> Next Action -> Due Date -> CTA -> Equipment -> Metadata */}
            <div className="p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <BorrowStatusBadge status={request.status} />

                    {request.borrower?.name && (
                        <div className="text-right">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                Người mượn
                            </p>
                            <p className="text-sm font-black text-black">{request.borrower.name}</p>
                        </div>
                    )}
                </div>

                {isOverdue && (
                    <div
                        role="alert"
                        className="flex items-center gap-2.5 p-3 bg-rose-100 border-2 border-black rounded-2xl text-rose-950 text-xs font-black shadow-[2px_2px_0_#000]"
                    >
                        <AlertTriangle
                            size={18}
                            aria-hidden="true"
                            className="text-rose-700 flex-shrink-0 animate-bounce motion-reduce:animate-none"
                        />
                        <div>
                            <p className="font-black text-rose-950">ĐÃ QUÁ HẠN HOÀN TRẢ THIẾT BỊ!</p>
                            <p className="font-medium text-rose-900 text-xs">
                                Vui lòng mang ngay thiết bị tới Phòng IT - Floor 2 - Campus HCM để bàn giao hoàn tất.
                            </p>
                        </div>
                    </div>
                )}

                {statusConfig.helper && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 flex items-start gap-2">
                        <span className="flex-shrink-0 text-sm" aria-hidden="true">💡</span>
                        <span>{statusConfig.helper}</span>
                    </div>
                )}

                {request.rejectReason && (
                    <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-xl text-xs text-rose-900 space-y-1">
                        <p className="font-black flex items-center gap-1.5">
                            <AlertTriangle size={14} className="text-rose-700" aria-hidden="true" /> Lý do từ chối:
                        </p>
                        <p className="italic font-medium">{request.rejectReason}</p>
                    </div>
                )}

                {request.cancelReason && (
                    <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-xl text-xs text-amber-900 space-y-1">
                        <p className="font-black flex items-center gap-1.5">
                            <AlertTriangle size={14} className="text-amber-700" aria-hidden="true" /> Lý do huỷ phiếu:
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

                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-xl border border-slate-300">
                        <Calendar size={14} className="text-indigo-700 flex-shrink-0" aria-hidden="true" />
                        <span className="font-bold text-slate-700">Hạn trả: </span>
                        <strong
                            className={
                                isOverdue
                                    ? 'text-rose-700 font-black underline decoration-2'
                                    : 'text-black font-black'
                            }
                        >
                            {formatVnDueDate(request.dueDate || request.dueAt) || 'Chưa định'}
                        </strong>
                    </div>

                    {request.status === 'unverified' && onResendEmail && (
                        <motion.button
                            whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                            type="button"
                            disabled={isResending}
                            onClick={() => onResendEmail(request)}
                            className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 bg-white border-2 border-black rounded-xl text-xs font-black shadow-[2px_2px_0_#000] hover:bg-slate-100 transition-all disabled:opacity-50"
                        >
                            <Send size={14} aria-hidden="true" />
                            {isResending ? 'Đang gửi...' : 'Gửi lại email xác nhận'}
                        </motion.button>
                    )}

                    {showReturnButton && request.status === 'handed_over' && onReturn && (
                        <motion.button
                            whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                            type="button"
                            onClick={() => onReturn(request)}
                            className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white border-2 border-black rounded-xl text-xs font-black shadow-[3px_3px_0_#000] hover:bg-indigo-700 transition-all"
                        >
                            <RotateCcw size={15} strokeWidth={2.5} aria-hidden="true" />
                            Báo Trả Thiết Bị Ngay
                            <ChevronRight size={15} aria-hidden="true" />
                        </motion.button>
                    )}
                </div>

                {/* Perforated Divider */}
                <div className="relative my-2" aria-hidden="true">
                    <div className="hidden sm:block absolute -left-7 -top-2.5 w-5 h-5 bg-[#fafafa] border-r-2 border-black rounded-full" />
                    <div className="border-t-2 border-dashed border-slate-300 w-full" />
                    <div className="hidden sm:block absolute -right-7 -top-2.5 w-5 h-5 bg-[#fafafa] border-l-2 border-black rounded-full" />
                </div>

                {/* Items List & Metadata */}
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                            <Tag size={13} className="text-slate-700" aria-hidden="true" />
                            Thiết bị mượn ({(request.items || []).length} loại):
                        </p>
                        {request.createdAt && (
                            <span className="text-xs font-medium text-slate-600">
                                Ngày tạo: {formatVnDateShort(request.createdAt)}
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(request.items || []).map((item, idx) => (
                            <div
                                key={item.resourceId || idx}
                                className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                            >
                                <span className="text-xs font-bold text-slate-800 truncate mr-2">
                                    {item.label || item.resourceId}
                                </span>
                                <span className="flex-shrink-0 text-xs font-black px-2 py-0.5 rounded-lg bg-white border-2 border-black shadow-[1px_1px_0_#000] text-indigo-700">
                                    x{item.qty}
                                    {item.receivedQty !== undefined && item.receivedQty !== null && (
                                        <span className="text-slate-600 font-bold ml-1 text-xs">
                                            (trả: {item.receivedQty})
                                        </span>
                                    )}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="hidden sm:flex bg-slate-50 border-t-2 border-black px-5 py-2.5 items-center justify-between text-slate-600">
                <div className="flex items-center gap-1" aria-hidden="true">
                    <span className="font-mono text-xs tracking-widest text-slate-600 font-bold">
                        ||||| ||| |||||| || |||||
                    </span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-600">
                    PHÒNG IT • FLOOR 2 • CAMPUS HCM
                </span>
            </div>
        </motion.article>
    );
}
