import React, { useState, useEffect, useMemo } from 'react';
import {
    X,
    Check,
    Truck,
    RotateCcw,
    AlertTriangle,
    Mail,
    Phone,
    Calendar,
    Clock,
    Package,
    User,
    UserCheck,
    Loader2,
    Minus,
    Plus,
    History,
    CheckCircle2,
    Info
} from 'lucide-react';
import { borrowAdminApi } from '../../api/borrow-admin';
import { useToast } from '../Toast';
import {
    ADMIN_STATUS_CONFIGS,
    isRequestOverdue,
    formatDateVi,
    formatDateTimeVi
} from './borrowAdminConstants';

const QUICK_REJECT_REASONS = [
    'Không đủ thiết bị phục vụ trong thời gian này',
    'Thông tin mục đích / thời gian mượn chưa rõ ràng',
    'Thiết bị đang bảo trì kỹ thuật'
];

const QUICK_CANCEL_REASONS = [
    'Người mượn báo huỷ không nhận thiết bị',
    'Thay đổi lịch sự kiện / không còn nhu cầu mượn',
    'Quá hạn 3 ngày chưa tới kho nhận thiết bị'
];

function getDefaultAction(status) {
    if (status === 'pending') return 'approve';
    if (status === 'approved') return 'handover';
    if (status === 'handed_over' || status === 'return_pending') return 'confirmReturn';
    return null;
}

export default function BorrowDetailModal({
    request,
    initialAction = null,
    onClose,
    onSuccess
}) {
    const { showSuccess, showError } = useToast();

    const [activeAction, setActiveAction] = useState(
        initialAction || getDefaultAction(request?.status)
    );
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [shortages, setShortages] = useState([]);

    // Reject / Cancel reason
    const [reason, setReason] = useState('');

    // Confirm Return state
    const [receivedQtyMap, setReceivedQtyMap] = useState(() => {
        const init = {};
        (request?.items || []).forEach((item) => {
            init[item.resourceId] = item.qty;
        });
        return init;
    });
    const [returnNote, setReturnNote] = useState('');

    useEffect(() => {
        if (!request) return;
        setActiveAction(initialAction || getDefaultAction(request.status));
        setErrorMsg(null);
        setShortages([]);
        setReason('');
        setReturnNote('');
        const init = {};
        (request.items || []).forEach((item) => {
            init[item.resourceId] = item.qty;
        });
        setReceivedQtyMap(init);
    }, [request, initialAction]);

    const statusConfig = useMemo(() => {
        if (!request) return null;
        return (
            ADMIN_STATUS_CONFIGS[request.status] || {
                label: request.status,
                badgeBg: 'bg-slate-200 text-slate-800 border-2 border-black',
                icon: Clock
            }
        );
    }, [request]);

    const hasMissingReturn = useMemo(() => {
        if (!request) return false;
        return (request.items || []).some((item) => {
            const val = receivedQtyMap[item.resourceId] ?? item.qty;
            return val < item.qty;
        });
    }, [request, receivedQtyMap]);

    const willHaveReturnIssue = hasMissingReturn || returnNote.trim().length > 0;

    if (!request) return null;

    const StatusIcon = statusConfig.icon;
    const overdue = isRequestOverdue(request);

    const switchAction = (nextAction) => {
        setActiveAction(nextAction);
        setErrorMsg(null);
        setShortages([]);
    };

    const updateReceivedQty = (resourceId, maxQty, nextVal) => {
        const parsed = parseInt(nextVal, 10);
        const clamped = Number.isNaN(parsed) ? 0 : Math.max(0, Math.min(maxQty, parsed));
        setReceivedQtyMap((prev) => ({
            ...prev,
            [resourceId]: clamped
        }));
    };

    const handleApprove = async () => {
        setSubmitting(true);
        setErrorMsg(null);
        setShortages([]);
        try {
            const res = await borrowAdminApi.approve(request.id);
            const emailSent = res.data?.emailSent !== false;
            if (emailSent) {
                showSuccess(`Đã duyệt phiếu #${request.id} & gửi email thông báo!`);
            } else {
                showSuccess(`Đã duyệt phiếu #${request.id} (Lưu ý: gửi email thông báo bị lỗi).`);
            }
            if (onSuccess) onSuccess(res.data?.request);
            onClose();
        } catch (err) {
            const data = err.response?.data || {};
            if (err.response?.status === 409 && Array.isArray(data.details?.shortages)) {
                setShortages(data.details.shortages);
                setErrorMsg(data.error || 'Kho không đủ số lượng thiết bị để duyệt phiếu này.');
            } else {
                setErrorMsg(data.error || 'Không thể duyệt phiếu lúc này, vui lòng thử lại.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleRejectOrCancel = async (mode) => {
        const trimmed = reason.trim();
        if (trimmed.length < 3 || trimmed.length > 500) {
            setErrorMsg(
                mode === 'reject'
                    ? 'Vui lòng nhập lý do từ chối từ 3 đến 500 ký tự.'
                    : 'Vui lòng nhập lý do huỷ từ 3 đến 500 ký tự.'
            );
            return;
        }

        setSubmitting(true);
        setErrorMsg(null);
        try {
            const res =
                mode === 'reject'
                    ? await borrowAdminApi.reject(request.id, trimmed)
                    : await borrowAdminApi.cancel(request.id, trimmed);
            const emailSent = res.data?.emailSent !== false;
            const actionLabel = mode === 'reject' ? 'từ chối' : 'huỷ';
            if (emailSent) {
                showSuccess(`Đã ${actionLabel} phiếu #${request.id} & gửi email thông báo.`);
            } else {
                showSuccess(
                    `Đã ${actionLabel} phiếu #${request.id} (Lưu ý: gửi email thông báo bị lỗi).`
                );
            }
            if (onSuccess) onSuccess(res.data?.request);
            onClose();
        } catch (err) {
            setErrorMsg(err.response?.data?.error || 'Thao tác thất bại, vui lòng thử lại.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleHandover = async () => {
        setSubmitting(true);
        setErrorMsg(null);
        try {
            const res = await borrowAdminApi.handover(request.id);
            showSuccess(`Đã xác nhận bàn giao thiết bị cho phiếu #${request.id}!`);
            if (onSuccess) onSuccess(res.data?.request);
            onClose();
        } catch (err) {
            setErrorMsg(err.response?.data?.error || 'Không thể xác nhận bàn giao lúc này.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirmReturn = async () => {
        const trimmedNote = returnNote.trim();
        if (trimmedNote.length > 500) {
            setErrorMsg('Ghi chú sự cố không được vượt quá 500 ký tự.');
            return;
        }

        const itemsPayload = (request.items || []).map((item) => ({
            resourceId: item.resourceId,
            receivedQty:
                receivedQtyMap[item.resourceId] !== undefined
                    ? receivedQtyMap[item.resourceId]
                    : item.qty
        }));

        setSubmitting(true);
        setErrorMsg(null);
        try {
            const res = await borrowAdminApi.confirmReturn(request.id, itemsPayload, trimmedNote);
            const updatedReq = res.data?.request;
            const emailSent = res.data?.emailSent !== false;
            const isIssue = updatedReq?.status === 'returned_with_issue';
            if (isIssue) {
                showSuccess(
                    `Đã chốt trả phiếu #${request.id} (ghi nhận có sự cố / thiếu số lượng)${
                        emailSent ? '.' : ' — email lỗi.'
                    }`
                );
            } else {
                showSuccess(
                    `Đã chốt trả đủ thiết bị cho phiếu #${request.id}${
                        emailSent ? '.' : ' — email lỗi.'
                    }`
                );
            }
            if (onSuccess) onSuccess(updatedReq);
            onClose();
        } catch (err) {
            const msg = err.response?.data?.error || 'Không thể chốt trả phiếu lúc này.';
            setErrorMsg(msg);
            showError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-150"
            onClick={onClose}
        >
            {/* NEO-GLASS PRO CONTAINER */}
            <div
                className="relative w-full max-w-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{ background: '#ec4899', transform: 'translate(8px, 8px)' }}
                />
                <div
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{ background: '#8b5cf6', transform: 'translate(4px, 4px)' }}
                />

                {/* Main Card */}
                <div className="relative bg-white border-[3px] border-black rounded-2xl flex flex-col max-h-[90vh] overflow-hidden">
                    {/* Header */}
                    <div className="bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between border-b-[3px] border-black">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="hidden sm:flex gap-1.5 flex-shrink-0">
                                <span className="w-2.5 h-2.5 rounded-full bg-violet-500 border border-black" />
                                <span className="w-2.5 h-2.5 rounded-full bg-pink-500 border border-black" />
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-black" />
                            </div>
                            <h3 className="text-base sm:text-lg font-black tracking-tight truncate">
                                Chi Tiết Phiếu{' '}
                                <span className="font-mono text-amber-300">#{request.id}</span>
                            </h3>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                            {overdue && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500 text-white border border-black text-[10px] font-black uppercase">
                                    <AlertTriangle size={11} strokeWidth={3} /> Quá hạn
                                </span>
                            )}
                            <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-black ${statusConfig.badgeBg}`}
                            >
                                <StatusIcon size={12} strokeWidth={2.5} />
                                {statusConfig.label}
                            </span>
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-colors"
                                aria-label="Đóng"
                            >
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Body */}
                    <div className="overflow-y-auto p-5 space-y-5 custom-scrollbar">
                        {/* Borrower Info Box */}
                        <div className="bg-slate-50 border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0_#000] space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="font-black text-base text-black">
                                        {request.borrower?.name || 'Khách vãng lai'}
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
                                                <UserCheck size={10} strokeWidth={3} /> Có tài khoản
                                            </>
                                        ) : (
                                            <>
                                                <User size={10} strokeWidth={3} /> Khách vãng lai
                                            </>
                                        )}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
                                <div className="flex items-center gap-2">
                                    <Mail size={14} className="text-indigo-600 flex-shrink-0" />
                                    <span className="break-all">{request.borrower?.email || '—'}</span>
                                </div>
                                <div className="flex items-center gap-2 font-mono font-bold text-black">
                                    <Phone size={14} className="text-emerald-600 flex-shrink-0" />
                                    <span>{request.borrower?.phone || '—'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar
                                        size={14}
                                        className={
                                            overdue ? 'text-rose-600 flex-shrink-0' : 'text-amber-600 flex-shrink-0'
                                        }
                                    />
                                    <span>
                                        Hạn trả:{' '}
                                        <strong className={overdue ? 'text-rose-600' : 'text-black'}>
                                            {formatDateVi(request.dueAt || request.dueDate)}
                                        </strong>
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock size={14} className="text-slate-500 flex-shrink-0" />
                                    <span>Tạo lúc: {formatDateTimeVi(request.createdAt)}</span>
                                </div>
                            </div>

                            {request.note && (
                                <div className="p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-700">
                                    <strong className="text-black">Ghi chú người mượn:</strong>{' '}
                                    {request.note}
                                </div>
                            )}

                            {(request.rejectReason || request.cancelReason || request.returnNote) && (
                                <div className="p-2.5 bg-rose-50 border-2 border-rose-300 rounded-xl text-xs font-bold text-rose-900">
                                    {request.rejectReason && (
                                        <p>Lý do từ chối: {request.rejectReason}</p>
                                    )}
                                    {request.cancelReason && (
                                        <p>Lý do huỷ: {request.cancelReason}</p>
                                    )}
                                    {request.returnNote && (
                                        <p>Ghi chú trả thiết bị: {request.returnNote}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Items summary (when not in confirmReturn form where items are edited inline) */}
                        {activeAction !== 'confirmReturn' && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                    <Package size={14} /> Danh sách thiết bị mượn (
                                    {(request.items || []).length} loại)
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {(request.items || []).map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between p-3 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0_#000]"
                                        >
                                            <span className="text-xs font-black text-slate-900 truncate mr-2">
                                                {item.label || item.resourceId}
                                            </span>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                <span className="px-2 py-0.5 rounded-lg bg-indigo-50 border-2 border-black text-xs font-black text-indigo-800">
                                                    Mượn: {item.qty}
                                                </span>
                                                {item.receivedQty !== undefined &&
                                                    item.receivedQty !== null && (
                                                        <span
                                                            className={`px-2 py-0.5 rounded-lg border-2 border-black text-xs font-black ${
                                                                item.receivedQty < item.qty
                                                                    ? 'bg-orange-200 text-orange-950'
                                                                    : 'bg-emerald-200 text-emerald-950'
                                                            }`}
                                                        >
                                                            Nhận: {item.receivedQty}
                                                        </span>
                                                    )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Action Area for Open Actionable Statuses */}
                        {['pending', 'approved', 'handed_over', 'return_pending'].includes(
                            request.status
                        ) && (
                            <div className="border-2 border-black rounded-2xl bg-amber-50/60 p-4 shadow-[3px_3px_0_#000] space-y-4">
                                {/* Mode Selector Pills when multiple actions exist */}
                                {request.status === 'pending' && (
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => switchAction('approve')}
                                            disabled={submitting}
                                            className={`flex-1 py-2 px-3 rounded-xl border-2 border-black text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                                                activeAction === 'approve'
                                                    ? 'bg-emerald-400 text-black shadow-[2px_2px_0_#000]'
                                                    : 'bg-white text-slate-600 hover:bg-slate-100'
                                            }`}
                                        >
                                            <Check size={14} strokeWidth={3} /> Duyệt phiếu
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => switchAction('reject')}
                                            disabled={submitting}
                                            className={`flex-1 py-2 px-3 rounded-xl border-2 border-black text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                                                activeAction === 'reject'
                                                    ? 'bg-rose-400 text-black shadow-[2px_2px_0_#000]'
                                                    : 'bg-white text-slate-600 hover:bg-slate-100'
                                            }`}
                                        >
                                            <X size={14} strokeWidth={3} /> Từ chối phiếu
                                        </button>
                                    </div>
                                )}

                                {request.status === 'approved' && (
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => switchAction('handover')}
                                            disabled={submitting}
                                            className={`flex-1 py-2 px-3 rounded-xl border-2 border-black text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                                                activeAction === 'handover'
                                                    ? 'bg-emerald-400 text-black shadow-[2px_2px_0_#000]'
                                                    : 'bg-white text-slate-600 hover:bg-slate-100'
                                            }`}
                                        >
                                            <Truck size={14} strokeWidth={2.5} /> Xác nhận đã giao
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => switchAction('cancel')}
                                            disabled={submitting}
                                            className={`flex-1 py-2 px-3 rounded-xl border-2 border-black text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                                                activeAction === 'cancel'
                                                    ? 'bg-rose-400 text-black shadow-[2px_2px_0_#000]'
                                                    : 'bg-white text-slate-600 hover:bg-slate-100'
                                            }`}
                                        >
                                            <X size={14} strokeWidth={3} /> Huỷ phiếu đã duyệt
                                        </button>
                                    </div>
                                )}

                                {/* Error & 409 Shortages Display */}
                                {errorMsg && (
                                    <div className="p-3.5 bg-rose-100 border-2 border-black rounded-xl text-xs font-bold text-rose-950 space-y-2 shadow-[2px_2px_0_#000]">
                                        <div className="flex items-start gap-2">
                                            <AlertTriangle
                                                size={16}
                                                className="text-rose-600 flex-shrink-0 mt-0.5"
                                            />
                                            <span>{errorMsg}</span>
                                        </div>

                                        {shortages.length > 0 && (
                                            <div className="bg-white border-2 border-black rounded-xl p-3 space-y-1.5">
                                                <p className="text-[11px] font-black uppercase text-rose-700">
                                                    Chi tiết thiết bị không đủ tồn kho:
                                                </p>
                                                <ul className="space-y-1">
                                                    {shortages.map((s, idx) => (
                                                        <li
                                                            key={idx}
                                                            className="flex items-center justify-between text-xs border-b border-dashed border-slate-200 last:border-b-0 pb-1 last:pb-0"
                                                        >
                                                            <span className="font-black text-black">
                                                                {s.label || s.resourceId}
                                                            </span>
                                                            <span className="font-mono font-bold text-rose-700">
                                                                Yêu cầu: {s.requested} • Còn lại:{' '}
                                                                {s.available}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 1. Approve Confirm Panel */}
                                {activeAction === 'approve' && request.status === 'pending' && (
                                    <div className="space-y-3">
                                        <div className="p-3 bg-white border-2 border-black rounded-xl text-xs font-medium text-slate-700 flex items-start gap-2">
                                            <Info
                                                size={16}
                                                className="text-indigo-600 flex-shrink-0 mt-0.5"
                                            />
                                            <span>
                                                Khi bấm duyệt, hệ thống sẽ tự động trừ số lượng tồn kho
                                                khả dụng và gửi email thông báo người mượn tới{' '}
                                                <strong>Kho A102 (Tòa Gamma)</strong> nhận thiết bị
                                                trong 3 ngày.
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleApprove}
                                            disabled={submitting}
                                            className="w-full py-3 px-4 bg-emerald-400 hover:bg-emerald-500 text-black font-black text-sm border-2 border-black rounded-xl shadow-[3px_3px_0_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {submitting ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" /> Đang
                                                    duyệt & giữ chỗ kho...
                                                </>
                                            ) : (
                                                <>
                                                    <Check size={16} strokeWidth={3} /> Xác Nhận Duyệt
                                                    Phiếu
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}

                                {/* 2. Reject Panel */}
                                {activeAction === 'reject' && request.status === 'pending' && (
                                    <div className="space-y-3">
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="text-xs font-black uppercase text-slate-700">
                                                    Lý do từ chối <span className="text-rose-600">*</span>
                                                </label>
                                                <span className="text-[11px] font-mono font-bold text-slate-500">
                                                    {reason.trim().length}/500
                                                </span>
                                            </div>
                                            <textarea
                                                rows={3}
                                                maxLength={500}
                                                placeholder="Nhập lý do từ chối (từ 3 đến 500 ký tự)..."
                                                value={reason}
                                                onChange={(e) => setReason(e.target.value)}
                                                className="w-full p-3 text-xs font-semibold bg-white border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400"
                                            />
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {QUICK_REJECT_REASONS.map((preset) => (
                                                    <button
                                                        key={preset}
                                                        type="button"
                                                        onClick={() => setReason(preset)}
                                                        className="text-[11px] font-bold px-2.5 py-1 bg-white hover:bg-rose-50 border border-black rounded-lg transition-colors"
                                                    >
                                                        + {preset}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRejectOrCancel('reject')}
                                            disabled={submitting}
                                            className="w-full py-3 px-4 bg-rose-500 hover:bg-rose-600 text-white font-black text-sm border-2 border-black rounded-xl shadow-[3px_3px_0_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {submitting ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" /> Đang
                                                    xử lý...
                                                </>
                                            ) : (
                                                <>
                                                    <X size={16} strokeWidth={3} /> Xác Nhận Từ Chối
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}

                                {/* 3. Handover Confirm Panel */}
                                {activeAction === 'handover' && request.status === 'approved' && (
                                    <div className="space-y-3">
                                        <div className="p-3 bg-white border-2 border-black rounded-xl text-xs font-medium text-slate-700 flex items-start gap-2">
                                            <Truck
                                                size={16}
                                                className="text-emerald-600 flex-shrink-0 mt-0.5"
                                            />
                                            <span>
                                                Xác nhận người mượn đã có mặt tại kho và nhận đủ thiết
                                                bị. Trạng thái sẽ chuyển sang{' '}
                                                <strong>"Đang mượn"</strong>.
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleHandover}
                                            disabled={submitting}
                                            className="w-full py-3 px-4 bg-emerald-400 hover:bg-emerald-500 text-black font-black text-sm border-2 border-black rounded-xl shadow-[3px_3px_0_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {submitting ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" /> Đang
                                                    cập nhật...
                                                </>
                                            ) : (
                                                <>
                                                    <Truck size={16} strokeWidth={2.5} /> Xác Nhận Đã
                                                    Bàn Giao Thiết Bị
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}

                                {/* 4. Cancel Panel */}
                                {activeAction === 'cancel' && request.status === 'approved' && (
                                    <div className="space-y-3">
                                        <div className="p-3 bg-white border-2 border-black rounded-xl text-xs font-medium text-slate-700 flex items-start gap-2">
                                            <Info
                                                size={16}
                                                className="text-rose-600 flex-shrink-0 mt-0.5"
                                            />
                                            <span>
                                                Huỷ phiếu đã duyệt sẽ{' '}
                                                <strong>hoàn trả toàn bộ tồn kho đã giữ chỗ</strong> và
                                                gửi email thông báo cho người mượn.
                                            </span>
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="text-xs font-black uppercase text-slate-700">
                                                    Lý do huỷ phiếu <span className="text-rose-600">*</span>
                                                </label>
                                                <span className="text-[11px] font-mono font-bold text-slate-500">
                                                    {reason.trim().length}/500
                                                </span>
                                            </div>
                                            <textarea
                                                rows={3}
                                                maxLength={500}
                                                placeholder="Nhập lý do huỷ (từ 3 đến 500 ký tự)..."
                                                value={reason}
                                                onChange={(e) => setReason(e.target.value)}
                                                className="w-full p-3 text-xs font-semibold bg-white border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400"
                                            />
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {QUICK_CANCEL_REASONS.map((preset) => (
                                                    <button
                                                        key={preset}
                                                        type="button"
                                                        onClick={() => setReason(preset)}
                                                        className="text-[11px] font-bold px-2.5 py-1 bg-white hover:bg-rose-50 border border-black rounded-lg transition-colors"
                                                    >
                                                        + {preset}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRejectOrCancel('cancel')}
                                            disabled={submitting}
                                            className="w-full py-3 px-4 bg-rose-500 hover:bg-rose-600 text-white font-black text-sm border-2 border-black rounded-xl shadow-[3px_3px_0_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {submitting ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" /> Đang
                                                    huỷ & hoàn kho...
                                                </>
                                            ) : (
                                                <>
                                                    <X size={16} strokeWidth={3} /> Xác Nhận Huỷ Phiếu
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}

                                {/* 5. Confirm Return Form */}
                                {activeAction === 'confirmReturn' &&
                                    (request.status === 'handed_over' ||
                                        request.status === 'return_pending') && (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-xs font-black uppercase text-black">
                                                        Kiểm kê số lượng thực nhận từng món
                                                    </h4>
                                                    <span className="text-[11px] font-bold text-slate-500">
                                                        Mặc định = đủ
                                                    </span>
                                                </div>

                                                <div className="space-y-2">
                                                    {(request.items || []).map((item) => {
                                                        const currentVal =
                                                            receivedQtyMap[item.resourceId] !==
                                                            undefined
                                                                ? receivedQtyMap[item.resourceId]
                                                                : item.qty;
                                                        const isShort = currentVal < item.qty;
                                                        return (
                                                            <div
                                                                key={item.resourceId}
                                                                className={`flex items-center justify-between gap-3 p-3 bg-white border-2 border-black rounded-xl ${
                                                                    isShort ? 'bg-orange-50' : ''
                                                                }`}
                                                            >
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-black text-black truncate">
                                                                        {item.label ||
                                                                            item.resourceId}
                                                                    </p>
                                                                    <p className="text-[11px] font-bold text-slate-500">
                                                                        Đã mượn:{' '}
                                                                        <strong className="text-black">
                                                                            {item.qty}
                                                                        </strong>
                                                                        {isShort && (
                                                                            <span className="text-rose-600 ml-2">
                                                                                (Thiếu{' '}
                                                                                {item.qty -
                                                                                    currentVal}
                                                                                )
                                                                            </span>
                                                                        )}
                                                                    </p>
                                                                </div>

                                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            updateReceivedQty(
                                                                                item.resourceId,
                                                                                item.qty,
                                                                                currentVal - 1
                                                                            )
                                                                        }
                                                                        disabled={currentVal <= 0}
                                                                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 border-2 border-black flex items-center justify-center disabled:opacity-40"
                                                                    >
                                                                        <Minus
                                                                            size={14}
                                                                            strokeWidth={3}
                                                                        />
                                                                    </button>
                                                                    <input
                                                                        type="number"
                                                                        min={0}
                                                                        max={item.qty}
                                                                        value={currentVal}
                                                                        onChange={(e) =>
                                                                            updateReceivedQty(
                                                                                item.resourceId,
                                                                                item.qty,
                                                                                e.target.value
                                                                            )
                                                                        }
                                                                        className="w-14 h-8 text-center font-mono font-black text-sm border-2 border-black rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            updateReceivedQty(
                                                                                item.resourceId,
                                                                                item.qty,
                                                                                currentVal + 1
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            currentVal >= item.qty
                                                                        }
                                                                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 border-2 border-black flex items-center justify-center disabled:opacity-40"
                                                                    >
                                                                        <Plus
                                                                            size={14}
                                                                            strokeWidth={3}
                                                                        />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="text-xs font-black uppercase text-slate-700">
                                                        Ghi chú tình trạng / sự cố (tuỳ chọn)
                                                    </label>
                                                    <span className="text-[11px] font-mono font-bold text-slate-500">
                                                        {returnNote.trim().length}/500
                                                    </span>
                                                </div>
                                                <textarea
                                                    rows={2}
                                                    maxLength={500}
                                                    placeholder="Để trống nếu trả đủ và nguyên vẹn; nhập ghi chú nếu thiếu phụ kiện, hư hỏng..."
                                                    value={returnNote}
                                                    onChange={(e) => setReturnNote(e.target.value)}
                                                    className="w-full p-2.5 text-xs font-semibold bg-white border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                                />
                                            </div>

                                            <div
                                                className={`p-3 rounded-xl border-2 border-black text-xs font-bold flex items-start gap-2 ${
                                                    willHaveReturnIssue
                                                        ? 'bg-orange-200 text-orange-950'
                                                        : 'bg-emerald-200 text-emerald-950'
                                                }`}
                                            >
                                                {willHaveReturnIssue ? (
                                                    <>
                                                        <AlertTriangle
                                                            size={16}
                                                            className="flex-shrink-0 mt-0.5"
                                                        />
                                                        <span>
                                                            Ghi nhận thiếu hoặc có ghi chú sự cố: phiếu
                                                            sẽ chốt trạng thái{' '}
                                                            <strong>"Đã trả (có sự cố)"</strong> và chỉ
                                                            hoàn kho đúng số lượng thực nhận.
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle2
                                                            size={16}
                                                            className="flex-shrink-0 mt-0.5"
                                                        />
                                                        <span>
                                                            Trả đủ thiết bị: phiếu sẽ chuyển sang{' '}
                                                            <strong>"Đã hoàn tất trả"</strong> và hoàn đủ
                                                            tồn kho.
                                                        </span>
                                                    </>
                                                )}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={handleConfirmReturn}
                                                disabled={submitting}
                                                className="w-full py-3 px-4 bg-emerald-400 hover:bg-emerald-500 text-black font-black text-sm border-2 border-black rounded-xl shadow-[3px_3px_0_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {submitting ? (
                                                    <>
                                                        <Loader2 size={16} className="animate-spin" />{' '}
                                                        Đang chốt trả & cập nhật kho...
                                                    </>
                                                ) : (
                                                    <>
                                                        <RotateCcw size={16} strokeWidth={2.5} /> Xác
                                                        Nhận Chốt Trả Thiết Bị
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}
                            </div>
                        )}

                        {/* History Timeline */}
                        {Array.isArray(request.history) && request.history.length > 0 && (
                            <div className="space-y-2.5 pt-2 border-t-2 border-dashed border-slate-200">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                    <History size={14} /> Lịch sử xử lý ({request.history.length})
                                </h4>
                                <div className="relative pl-5 space-y-3 before:content-[''] before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-300">
                                    {request.history.map((entry, idx) => {
                                        const hCfg = ADMIN_STATUS_CONFIGS[entry.status] || {
                                            label: entry.status,
                                            badgeBg: 'bg-slate-200 text-slate-800 border border-black'
                                        };
                                        return (
                                            <div key={idx} className="relative">
                                                <span className="absolute -left-[20px] top-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-black" />
                                                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                                                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                                                        <span
                                                            className={`px-2 py-0.5 rounded-md text-[10px] font-black ${hCfg.badgeBg}`}
                                                        >
                                                            {hCfg.label}
                                                        </span>
                                                        <span className="text-[11px] font-mono text-slate-500">
                                                            {formatDateTimeVi(entry.at)}
                                                        </span>
                                                    </div>
                                                    {entry.byEmail && (
                                                        <p className="text-[11px] font-semibold text-slate-600">
                                                            Bởi: <strong>{entry.byEmail}</strong>
                                                        </p>
                                                    )}
                                                    {entry.note && (
                                                        <p className="text-[11px] text-slate-700 italic">
                                                            "{entry.note}"
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
