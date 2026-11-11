import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
    ArrowLeft,
    ArrowRight,
    RotateCcw,
    Search,
    Mail,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Package,
    Check,
    Clock,
    Info,
    RefreshCw
} from 'lucide-react';
import { borrowApi } from '../../api/borrow';
import { borrowTokenStore } from '../../lib/borrow-token-store';
import { CLOSED_STATUSES, normalizePhoneInput } from '../../lib/borrow-utils';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../Toast';
import BorrowRequestCard from './BorrowRequestCard';
import AccessibleDialog from './AccessibleDialog';

// Semantic Single-Input One-Time-Code with Visual 6-Slot Overlay
function OtpInput({ code, setCode, hasError = false, inputRef }) {
    const [focused, setFocused] = useState(false);

    const handleChange = (e) => {
        const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
        setCode(cleaned);
    };

    const handlePaste = (e) => {
        const pasted = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6);
        if (pasted) {
            e.preventDefault();
            setCode(pasted);
        }
    };

    return (
        <div className="space-y-2">
            <label
                htmlFor="borrow-otp-input"
                className="block text-center text-xs font-black uppercase tracking-wider text-slate-700"
            >
                Mã Xác Thực OTP (6 số) <span className="text-rose-600">*</span>
            </label>

            <div className="relative max-w-[340px] mx-auto">
                {/* Semantic accessible input spanning full 6-slot visual width */}
                <input
                    ref={inputRef}
                    id="borrow-otp-input"
                    name="otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    maxLength={6}
                    aria-required="true"
                    aria-invalid={hasError}
                    aria-describedby={hasError ? 'return-lookup-error borrow-otp-hint' : 'borrow-otp-hint'}
                    value={code}
                    onChange={handleChange}
                    onPaste={handlePaste}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-text z-10"
                />

                {/* 6 visual digit cells */}
                <div aria-hidden="true" className="grid grid-cols-6 gap-2 sm:gap-2.5">
                    {[0, 1, 2, 3, 4, 5].map((idx) => {
                        const char = code[idx] || '';
                        const isActiveSlot = focused && idx === Math.min(code.length, 5);
                        return (
                            <div
                                key={idx}
                                className={`h-14 flex items-center justify-center font-mono font-black text-2xl border-2 rounded-xl transition-all select-none ${
                                    isActiveSlot
                                        ? 'border-indigo-600 ring-2 ring-indigo-600 bg-yellow-100 shadow-[1px_1px_0_#000]'
                                        : char
                                        ? 'border-indigo-700 bg-amber-100 text-black shadow-[2px_2px_0_#000]'
                                        : 'border-black bg-amber-50 text-slate-500 shadow-[3px_3px_0_#000]'
                                }`}
                            >
                                {char}
                            </div>
                        );
                    })}
                </div>
            </div>

            <p id="borrow-otp-hint" className="text-center text-xs font-medium text-slate-600">
                Bạn có thể dán thẳng 6 chữ số hoặc nhập từ bàn phím.
            </p>
        </div>
    );
}

const NON_RETURNABLE_HINTS = {
    pending: 'Phiếu đang chờ Quản trị viên duyệt — Chưa nhận thiết bị nên chưa thể báo trả.',
    approved: 'Phiếu đã duyệt! Vui lòng tới Phòng IT - Floor 2 - Campus HCM nhận thiết bị trước khi trả.',
    return_pending: 'Đã báo trả! Vui lòng mang thiết bị tới Phòng IT - Floor 2 - Campus HCM để kiểm tra và ký nhận.',
    unverified: 'Phiếu chưa xác nhận email! Vui lòng mở email và nhấn liên kết xác nhận.'
};

export default function BorrowReturn() {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const { showSuccess, showError } = useToast();
    const shouldReduceMotion = useReducedMotion();

    // Requests state (loading / error / empty / success separated)
    const [handedOverRequests, setHandedOverRequests] = useState([]);
    const [otherOpenRequests, setOtherOpenRequests] = useState([]);
    const [closedRequestsCount, setClosedRequestsCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    // Return confirmation modal
    const [selectedRequestToReturn, setSelectedRequestToReturn] = useState(null);
    const [submittingReturn, setSubmittingReturn] = useState(false);

    // Lookup state
    const [phone, setPhone] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [otpCooldown, setOtpCooldown] = useState(0);
    const [sendingOtp, setSendingOtp] = useState(false);
    const [verifyingOtp, setVerifyingOtp] = useState(false);
    const [lookupError, setLookupError] = useState(null);
    const [showLookupBox, setShowLookupBox] = useState(false);
    const [lookedUpInfo, setLookedUpInfo] = useState(null);

    const fetchRequests = useCallback(async () => {
        if (authLoading) return;
        setLoading(true);
        setFetchError(null);
        try {
            borrowTokenStore.purgeLegacy();
            const res = await borrowApi.getMy();
            const data = res.data || {};

            const allRequests = data.requests || [];
            const closedRequests = allRequests.filter((r) => CLOSED_STATUSES.includes(r.status));
            const openRequests = allRequests.filter((r) => !CLOSED_STATUSES.includes(r.status));
            const activeToReturn = openRequests.filter((r) => r.status === 'handed_over');
            const otherOpen = openRequests.filter((r) => r.status !== 'handed_over');

            setClosedRequestsCount(closedRequests.length);
            setHandedOverRequests(activeToReturn);
            setOtherOpenRequests(otherOpen);

            if (activeToReturn.length === 0 && otherOpen.length === 0) {
                setShowLookupBox(true);
            }
        } catch (err) {
            console.error('[BORROW RETURN] Error fetching requests:', err);
            const msg = 'Không thể tải danh sách phiếu mượn. Vui lòng thử lại.';
            setFetchError(msg);
            showError(msg);
        } finally {
            setLoading(false);
        }
    }, [authLoading, showError]);

    useEffect(() => {
        if (!authLoading) {
            setHandedOverRequests([]);
            setOtherOpenRequests([]);
            setClosedRequestsCount(0);
            setLookedUpInfo(null);
            fetchRequests();
        }
    }, [user?.uid, authLoading, fetchRequests]);

    useEffect(() => {
        if (otpCooldown <= 0) return;
        const timer = setInterval(() => {
            setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [otpCooldown]);

    const handleConfirmReturn = async () => {
        if (!selectedRequestToReturn) return;
        setSubmittingReturn(true);
        try {
            const res = await borrowApi.returnRequest(selectedRequestToReturn.id);
            const updated = res.data?.request;

            showSuccess('Đã báo trả thành công! Vui lòng mang thiết bị đến kho để hoàn tất.');
            setSelectedRequestToReturn(null);

            if (updated) {
                setHandedOverRequests((prev) => prev.filter((r) => r.id !== updated.id));
                setOtherOpenRequests((prev) => [updated, ...prev.filter((r) => r.id !== updated.id)]);
            }
        } catch (err) {
            console.error('[BORROW RETURN] Return error:', err);
            const status = err.response?.status;
            if (status === 409) {
                showError('Phiếu này không ở trạng thái sẵn sàng để báo trả.');
            } else {
                showError(err.response?.data?.error || 'Có lỗi xảy ra khi báo trả thiết bị.');
            }
        } finally {
            setSubmittingReturn(false);
        }
    };

    const requestOtpForPhone = async () => {
        setLookupError(null);

        const cleanPhone = normalizePhoneInput(phone);
        if (!/^0\d{9}$/.test(cleanPhone)) {
            setLookupError('Số điện thoại không hợp lệ (yêu cầu 10 chữ số, bắt đầu bằng số 0).');
            return;
        }

        setPhone(cleanPhone);
        setSendingOtp(true);
        try {
            const res = await borrowApi.lookupOtp(cleanPhone);
            setOtpSent(true);
            setOtpCooldown(60);
            showSuccess(
                res.data?.message ||
                    'Nếu số điện thoại có phiếu đang mở, mã xác thực đã được gửi tới email đã đăng ký.'
            );
        } catch (err) {
            console.error('[BORROW RETURN] Lookup OTP error:', err);
            const resData = err.response?.data || {};
            setLookupError(resData.error || 'Không thể gửi yêu cầu OTP lúc này, vui lòng thử lại sau.');
        } finally {
            setSendingOtp(false);
        }
    };

    const handleRequestOtp = async (e) => {
        e.preventDefault();
        await requestOtpForPhone();
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setLookupError(null);

        const cleanPhone = normalizePhoneInput(phone);
        const cleanCode = otpCode.replace(/\s+/g, '');

        if (cleanCode.length !== 6) {
            setLookupError('Vui lòng nhập đầy đủ 6 chữ số mã OTP.');
            return;
        }

        setVerifyingOtp(true);
        try {
            const res = await borrowApi.lookupVerify(cleanPhone, cleanCode);
            const lookedUpRequests = res.data?.requests || [];

            if (lookedUpRequests.length > 0) {
                const activeToReturn = lookedUpRequests.filter((r) => r.status === 'handed_over');
                const otherOpen = lookedUpRequests.filter((r) => r.status !== 'handed_over');

                setHandedOverRequests((prev) => {
                    const map = new Map(prev.map((r) => [r.id, r]));
                    activeToReturn.forEach((r) => map.set(r.id, r));
                    return Array.from(map.values());
                });
                setOtherOpenRequests((prev) => {
                    const map = new Map(prev.map((r) => [r.id, r]));
                    otherOpen.forEach((r) => map.set(r.id, r));
                    return Array.from(map.values());
                });

                setLookedUpInfo({
                    phone: cleanPhone,
                    total: lookedUpRequests.length,
                    readyCount: activeToReturn.length
                });
                showSuccess(`Xác thực thành công! Tìm thấy ${lookedUpRequests.length} phiếu mượn của bạn.`);
                setOtpSent(false);
                setOtpCode('');
                setOtpCooldown(0);
                setPhone('');
                setShowLookupBox(false);
            } else {
                setLookedUpInfo({ phone: cleanPhone, total: 0, readyCount: 0 });
                showSuccess('Xác thực thành công nhưng hiện không có phiếu mượn nào đang mở với SĐT này.');
                setOtpSent(false);
                setOtpCode('');
                setOtpCooldown(0);
            }
        } catch (err) {
            console.error('[BORROW RETURN] Lookup Verify error:', err);
            setLookupError(err.response?.data?.error || 'Mã xác nhận không đúng hoặc đã hết hạn.');
        } finally {
            setVerifyingOtp(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#fafafa] text-slate-900 pb-20 relative overflow-x-hidden">
            {/* Header */}
            <header className="bg-white border-b-2 border-black sticky top-0 z-30 shadow-sm">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => navigate('/borrow')}
                        aria-label="Quay lại trang chủ mượn thiết bị"
                        className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center -ml-1 rounded-xl border-2 border-black bg-white hover:bg-slate-100 shadow-[2px_2px_0_#000] transition-colors flex-shrink-0"
                    >
                        <ArrowLeft size={18} strokeWidth={2.5} aria-hidden="true" />
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-base font-black tracking-tight text-black uppercase truncate">
                            Hoàn Trả & Tra Cứu Thiết Bị
                        </h1>
                        <p className="text-xs font-bold text-slate-600 truncate">
                            Báo trả tại kho & tra cứu qua số điện thoại
                        </p>
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 pt-5 space-y-6">
                {/* Lookup confirmation banner */}
                {lookedUpInfo && (
                    <div className="p-4 bg-emerald-100 border-2 border-black rounded-2xl shadow-[3px_3px_0_#000] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                            <CheckCircle2 size={20} className="text-emerald-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
                            <div>
                                <h2 className="text-xs font-black text-black uppercase tracking-wider">
                                    Kết Quả Tra Cứu SĐT: {lookedUpInfo.phone}
                                </h2>
                                <p className="text-xs font-medium text-emerald-950 mt-0.5">
                                    {lookedUpInfo.total > 0
                                        ? `Tìm thấy ${lookedUpInfo.total} phiếu mượn đang mở (${lookedUpInfo.readyCount} phiếu đang mượn có thể báo trả).`
                                        : 'Không có phiếu mượn nào đang mở với số điện thoại này.'}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setShowLookupBox(true);
                                setOtpSent(false);
                                setOtpCode('');
                                setOtpCooldown(0);
                                setPhone('');
                            }}
                            className="min-h-[44px] px-3.5 py-2 bg-white border-2 border-black rounded-xl text-xs font-black shadow-[2px_2px_0_#000] hover:bg-slate-50 transition-all flex-shrink-0 self-start sm:self-center"
                        >
                            Tra cứu SĐT khác
                        </button>
                    </div>
                )}

                {/* List of handed_over requests */}
                <section aria-labelledby="section-handed-over-title" className="space-y-3.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span aria-hidden="true" className="w-3.5 h-3.5 rounded-full bg-emerald-500 border border-black inline-block" />
                            <h2 id="section-handed-over-title" className="text-sm font-black text-black uppercase tracking-wider">
                                Thiết Bị Đang Mượn Chờ Trả
                            </h2>
                        </div>
                        {handedOverRequests.length > 0 && (
                            <span className="bg-emerald-300 text-black border-2 border-black text-xs px-2.5 py-0.5 rounded-full font-black">
                                {handedOverRequests.length} phiếu
                            </span>
                        )}
                    </div>

                    {loading ? (
                        <div role="status" className="p-10 text-center bg-white rounded-3xl border-2 border-black shadow-[4px_4px_0_#000] space-y-3">
                            <Loader2 size={28} className="animate-spin motion-reduce:animate-none text-indigo-600 mx-auto" aria-hidden="true" />
                            <p className="text-xs font-bold text-slate-600">
                                Đang tìm phiếu mượn của bạn...
                            </p>
                        </div>
                    ) : fetchError ? (
                        <div
                            role="alert"
                            className="text-center p-6 bg-rose-50 rounded-3xl border-2 border-black shadow-[4px_4px_0_#000] space-y-3"
                        >
                            <AlertCircle size={28} className="text-rose-700 mx-auto" aria-hidden="true" />
                            <p className="text-sm font-bold text-rose-950">{fetchError}</p>
                            <button
                                type="button"
                                onClick={fetchRequests}
                                className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2 bg-white border-2 border-black rounded-xl text-xs font-black shadow-[2px_2px_0_#000] hover:bg-slate-100"
                            >
                                <RefreshCw size={14} aria-hidden="true" />
                                Thử lại
                            </button>
                        </div>
                    ) : handedOverRequests.length > 0 ? (
                        <div className="space-y-4">
                            {handedOverRequests.map((req) => (
                                <BorrowRequestCard
                                    key={req.id}
                                    request={req}
                                    showReturnButton={true}
                                    onReturn={(r) => setSelectedRequestToReturn(r)}
                                />
                            ))}
                        </div>
                    ) : otherOpenRequests.length > 0 ? (
                        <div className="p-5 bg-amber-50 rounded-3xl border-2 border-black shadow-[4px_4px_0_#000] flex items-start gap-3">
                            <div
                                aria-hidden="true"
                                className="w-10 h-10 bg-amber-300 text-black border-2 border-black rounded-xl flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_#000]"
                            >
                                <Info size={20} strokeWidth={2.5} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xs font-black text-black uppercase tracking-wider">
                                    Chưa có thiết bị nào ở trạng thái "Đang mượn" để báo trả
                                </h3>
                                <p className="text-xs text-slate-700 font-medium leading-relaxed">
                                    Hiện tại bạn đang có <strong>{otherOpenRequests.length} phiếu mượn</strong> ở trạng
                                    thái chờ duyệt hoặc chờ kho kiểm tra (hiển thị chi tiết bên dưới). Chỉ những phiếu đã
                                    nhận thiết bị mới có thể nhấn "Báo trả".
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center p-7 bg-white rounded-3xl border-2 border-black shadow-[4px_4px_0_#000] space-y-3">
                            <div
                                aria-hidden="true"
                                className="w-14 h-14 bg-slate-100 text-slate-600 border-2 border-black rounded-2xl flex items-center justify-center mx-auto shadow-[2px_2px_0_#000]"
                            >
                                <Package size={28} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-sm font-black text-black">
                                {closedRequestsCount > 0
                                    ? 'Tất cả phiếu mượn của bạn đã hoàn tất'
                                    : 'Không tìm thấy thiết bị nào đang mượn trên trình duyệt này'}
                            </h3>
                            <p className="text-xs text-slate-600 max-w-sm mx-auto font-medium">
                                {closedRequestsCount > 0 ? (
                                    <>
                                        Bạn có <strong>{closedRequestsCount} phiếu</strong> đã hoàn tất
                                        (Đã trả / Đã huỷ / Từ chối). Nếu muốn tra cứu phiếu đang mở đăng ký trên
                                        thiết bị khác, hãy dùng mục Số Điện Thoại bên dưới.
                                    </>
                                ) : (
                                    <>
                                        Nếu bạn đăng ký trên điện thoại hoặc máy khác, hãy dùng chức năng tra
                                        cứu bằng Số Điện Thoại bên dưới để tìm lại phiếu đang mở nhé!
                                    </>
                                )}
                            </p>
                            {closedRequestsCount > 0 && (
                                <button
                                    type="button"
                                    onClick={() => navigate('/borrow')}
                                    className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 border-2 border-black rounded-xl text-xs font-black shadow-[2px_2px_0_#000] transition-all"
                                >
                                    Xem lịch sử tại Trang chủ <ArrowRight size={13} aria-hidden="true" />
                                </button>
                            )}
                        </div>
                    )}
                </section>

                {/* Other Open Requests */}
                {!loading && !fetchError && otherOpenRequests.length > 0 && (
                    <section aria-labelledby="section-other-open-title" className="space-y-3.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span aria-hidden="true" className="w-3.5 h-3.5 rounded-full bg-sky-400 border border-black inline-block" />
                                <h2 id="section-other-open-title" className="text-sm font-black text-black uppercase tracking-wider">
                                    Phiếu Mượn Đang Xử Lý Khác
                                </h2>
                            </div>
                            <span className="bg-sky-200 text-black border-2 border-black text-xs px-2.5 py-0.5 rounded-full font-black">
                                {otherOpenRequests.length} phiếu
                            </span>
                        </div>

                        <div className="space-y-4">
                            {otherOpenRequests.map((req) => (
                                <div key={req.id} className="space-y-2">
                                    <BorrowRequestCard request={req} />
                                    {NON_RETURNABLE_HINTS[req.status] && (
                                        <div className="mx-1 px-3.5 py-2.5 bg-slate-100 border-2 border-black rounded-xl text-xs font-bold text-slate-700 flex flex-wrap items-center justify-between gap-2 shadow-[2px_2px_0_#000]">
                                            <span className="flex items-center gap-1.5">
                                                <Clock size={14} className="text-indigo-700 flex-shrink-0" aria-hidden="true" />
                                                {NON_RETURNABLE_HINTS[req.status]}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => navigate('/borrow')}
                                                className="min-h-[44px] px-2 text-indigo-700 font-black hover:underline inline-flex items-center gap-0.5 flex-shrink-0"
                                            >
                                                Trang chủ <ArrowRight size={12} aria-hidden="true" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Phone & OTP Lookup Box */}
                <section
                    aria-labelledby="section-otp-lookup-title"
                    className="bg-white border-2 border-black rounded-3xl p-4 sm:p-5 shadow-[4px_4px_0_#000] space-y-4"
                >
                    <div className="border-b-2 border-slate-100 pb-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <span
                                aria-hidden="true"
                                className="w-6 h-6 rounded-lg bg-amber-300 border-2 border-black font-black text-xs flex items-center justify-center shadow-[1px_1px_0_#000]"
                            >
                                <Search size={13} strokeWidth={3} />
                            </span>
                            <h2 id="section-otp-lookup-title" className="text-sm font-black text-black uppercase tracking-wider">
                                Tra Cứu Phiếu Bằng Số Điện Thoại
                            </h2>
                        </div>
                        {(handedOverRequests.length > 0 || otherOpenRequests.length > 0) && (
                            <button
                                type="button"
                                onClick={() => setShowLookupBox((prev) => !prev)}
                                aria-expanded={showLookupBox}
                                className="min-h-[44px] px-2 text-xs font-black text-indigo-700 hover:underline"
                            >
                                {showLookupBox ? 'Thu gọn ▲' : 'Mở rộng ▼'}
                            </button>
                        )}
                    </div>

                    {(showLookupBox || (handedOverRequests.length === 0 && otherOpenRequests.length === 0)) && (
                        <div className="space-y-4 pt-1">
                            <p className="text-xs text-slate-600 font-medium leading-relaxed">
                                Nhập số điện thoại gắn với <strong>phiếu đang mở</strong> (chờ duyệt, đã duyệt,
                                đang mượn hoặc chờ kiểm tra). Hệ thống sẽ gửi mã OTP 6 số đến email đăng ký của
                                phiếu đó.
                            </p>

                            {lookupError && (
                                <div
                                    id="return-lookup-error"
                                    role="alert"
                                    aria-live="assertive"
                                    className="p-3.5 bg-rose-100 border-2 border-black rounded-2xl text-rose-950 text-xs font-bold flex items-start gap-2 shadow-[2px_2px_0_#000]"
                                >
                                    <AlertCircle size={16} className="text-rose-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
                                    <span>{lookupError}</span>
                                </div>
                            )}

                            {!otpSent ? (
                                <form onSubmit={handleRequestOtp} noValidate className="space-y-3.5">
                                    <div>
                                        <label
                                            htmlFor="return-lookup-phone"
                                            className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5"
                                        >
                                            Số điện thoại người mượn <span className="text-rose-600">*</span>
                                        </label>
                                        <input
                                            id="return-lookup-phone"
                                            name="phone"
                                            type="tel"
                                            autoComplete="tel"
                                            required
                                            aria-required="true"
                                            aria-invalid={Boolean(lookupError)}
                                            aria-describedby={lookupError ? 'return-lookup-error' : undefined}
                                            placeholder="Ví dụ: 0901234567"
                                            value={phone}
                                            onChange={(e) => {
                                                setPhone(e.target.value);
                                                if (lookupError) setLookupError(null);
                                            }}
                                            className="w-full h-11 px-3.5 text-sm font-bold border-2 border-black rounded-xl bg-white shadow-[3px_3px_0_#000] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 transition-all placeholder:font-normal placeholder:text-slate-500"
                                        />
                                    </div>

                                    <motion.button
                                        whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                                        type="submit"
                                        disabled={sendingOtp}
                                        className="w-full min-h-[48px] py-3 px-4 bg-indigo-600 text-white font-black text-sm border-2 border-black rounded-xl shadow-[3px_3px_0_#000] hover:bg-indigo-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                                    >
                                        {sendingOtp ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                                                Đang gửi mã OTP...
                                            </>
                                        ) : (
                                            <>
                                                <Mail size={16} aria-hidden="true" />
                                                Gửi Mã OTP Đến Email Đăng Ký
                                            </>
                                        )}
                                    </motion.button>
                                </form>
                            ) : (
                                <form onSubmit={handleVerifyOtp} noValidate className="space-y-4">
                                    <div className="p-3.5 bg-amber-100 border-2 border-black rounded-2xl text-xs text-amber-950 font-bold space-y-1.5 shadow-[2px_2px_0_#000]">
                                        <p className="flex items-center gap-1.5 font-black">
                                            <Mail size={15} aria-hidden="true" /> Kiểm tra email để lấy mã OTP
                                        </p>
                                        <p className="font-medium text-xs leading-relaxed">
                                            Nếu SĐT <strong>{phone}</strong> có <strong>phiếu đang mở</strong>,
                                            mã 6 số đã được gửi tới email đã đăng ký phiếu đó. Vui lòng kiểm tra
                                            cả thư mục <strong>Spam / Thư rác</strong>.
                                        </p>
                                        <ul className="font-medium text-xs text-amber-900 list-disc pl-4 space-y-0.5">
                                            <li>Phiếu đã trả / đã huỷ / bị từ chối sẽ không phát sinh OTP.</li>
                                            <li>Phiếu lập bằng tài khoản nội bộ không có hộp thư thật (vd: @fgw-event.com) sẽ không nhận được email.</li>
                                            <li>Giới hạn gửi OTP: tối đa 1 lần / 60 giây và 3 lần / giờ.</li>
                                        </ul>
                                    </div>

                                    <OtpInput
                                        code={otpCode}
                                        setCode={(next) => {
                                            setOtpCode(next);
                                            if (lookupError) setLookupError(null);
                                        }}
                                        hasError={Boolean(lookupError)}
                                    />

                                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setOtpSent(false);
                                                setOtpCode('');
                                                setOtpCooldown(0);
                                                setLookupError(null);
                                            }}
                                            className="min-h-[44px] px-2 font-black text-slate-700 hover:text-black underline"
                                        >
                                            ← Đổi số điện thoại khác
                                        </button>

                                        <button
                                            type="button"
                                            onClick={requestOtpForPhone}
                                            disabled={sendingOtp || otpCooldown > 0}
                                            className="min-h-[44px] px-2 font-black text-indigo-700 hover:text-indigo-900 disabled:text-slate-500 disabled:cursor-not-allowed flex items-center gap-1"
                                        >
                                            {sendingOtp ? (
                                                <>
                                                    <Loader2 size={12} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                                                    Đang gửi lại...
                                                </>
                                            ) : otpCooldown > 0 ? (
                                                `Gửi lại OTP sau ${otpCooldown}s`
                                            ) : (
                                                'Gửi lại mã OTP'
                                            )}
                                        </button>
                                    </div>

                                    <motion.button
                                        whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                                        type="submit"
                                        disabled={verifyingOtp || otpCode.replace(/\s+/g, '').length !== 6}
                                        className="w-full min-h-[48px] py-3 px-4 bg-emerald-400 text-slate-900 border-2 border-black rounded-xl text-sm font-black shadow-[3px_3px_0_#000] hover:bg-emerald-500 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                                    >
                                        {verifyingOtp ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                                                Đang xác thực...
                                            </>
                                        ) : (
                                            <>
                                                <Check size={16} strokeWidth={3} aria-hidden="true" />
                                                Xác Nhận & Tra Cứu
                                            </>
                                        )}
                                    </motion.button>
                                </form>
                            )}
                        </div>
                    )}
                </section>
            </main>

            {/* Accessible Confirmation Return Modal */}
            <AnimatePresence>
                {selectedRequestToReturn && (
                    <AccessibleDialog
                        open={Boolean(selectedRequestToReturn)}
                        onClose={() => setSelectedRequestToReturn(null)}
                        closeDisabled={submittingReturn}
                        titleId="confirm-return-dialog-title"
                        layeredShadow={true}
                    >
                        <div className="hidden sm:flex gap-1" aria-hidden="true">
                            <span className="w-2.5 h-2.5 rounded-full bg-violet-500 border border-black inline-block" />
                            <span className="w-2.5 h-2.5 rounded-full bg-pink-500 border border-black inline-block" />
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-black inline-block" />
                        </div>

                        <div
                            aria-hidden="true"
                            className="w-14 h-14 bg-emerald-100 text-black border-2 border-black rounded-2xl flex items-center justify-center mx-auto shadow-[2px_2px_0_#000]"
                        >
                            <RotateCcw size={28} strokeWidth={2.5} className="text-emerald-700" />
                        </div>

                        <div className="text-center space-y-1.5">
                            <h2
                                id="confirm-return-dialog-title"
                                className="text-base font-black text-black uppercase tracking-tight"
                            >
                                Xác Nhận Báo Trả Thiết Bị
                            </h2>
                            <p className="text-xs font-bold text-slate-700">
                                Phiếu mượn: <strong className="text-indigo-700 font-mono">#{selectedRequestToReturn.id}</strong>
                            </p>
                            <div className="p-3 bg-slate-50 border-2 border-slate-300 rounded-2xl text-left text-xs font-medium text-slate-700">
                                Sau khi bấm xác nhận, trạng thái sẽ đổi thành{' '}
                                <strong className="text-black">"Chờ kho kiểm tra"</strong>. Bạn hãy mang toàn
                                bộ thiết bị đến <strong>Phòng IT - Floor 2 - Campus HCM</strong> để kiểm tra và ký nhận.
                            </div>
                        </div>

                        <div className="flex gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={() => setSelectedRequestToReturn(null)}
                                disabled={submittingReturn}
                                className="w-1/2 min-h-[44px] py-2.5 px-3 bg-white border-2 border-black rounded-xl text-xs font-black shadow-[2px_2px_0_#000] hover:bg-slate-100 transition-colors"
                            >
                                Đóng
                            </button>

                            <button
                                type="button"
                                onClick={handleConfirmReturn}
                                disabled={submittingReturn}
                                className="w-1/2 min-h-[44px] py-2.5 px-3 bg-indigo-600 text-white border-2 border-black rounded-xl text-xs font-black shadow-[2px_2px_0_#000] hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5"
                            >
                                {submittingReturn ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                                        Đang xử lý...
                                    </>
                                ) : (
                                    'Xác Nhận Báo Trả'
                                )}
                            </button>
                        </div>
                    </AccessibleDialog>
                )}
            </AnimatePresence>
        </div>
    );
}
