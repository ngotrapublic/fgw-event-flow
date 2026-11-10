import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    ArrowRight,
    RotateCcw,
    Search,
    Phone,
    Mail,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Package,
    KeyRound,
    X,
    Check,
    Sparkles,
    ShieldCheck,
    Clock,
    Info
} from 'lucide-react';
import { borrowApi } from '../../api/borrow';
import { borrowTokenStore } from '../../lib/borrow-token-store';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../Toast';
import BorrowRequestCard from './BorrowRequestCard';

// 6-digit OTP input row
function OtpInputBoxes({ code, setCode }) {
    const inputRefs = useRef([]);

    const handleDigitChange = (index, val) => {
        const clean = val.replace(/\D/g, '');
        if (!clean) {
            const arr = code.padEnd(6, ' ').split('');
            arr[index] = ' ';
            setCode(arr.join('').trimEnd());
            return;
        }

        // Handle pasting full 6 digits
        if (clean.length > 1) {
            const pasted = clean.slice(0, 6);
            setCode(pasted);
            const nextIdx = Math.min(pasted.length, 5);
            inputRefs.current[nextIdx]?.focus();
            return;
        }

        const arr = code.padEnd(6, ' ').split('');
        arr[index] = clean[0];
        const newCode = arr.join('').trimEnd();
        setCode(newCode);

        // Auto advance to next box
        if (index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        const currentChar = code[index] && code[index] !== ' ' ? code[index] : '';
        if (e.key === 'Backspace' && !currentChar && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    return (
        <div className="flex items-center justify-center gap-2 sm:gap-2.5">
            {[0, 1, 2, 3, 4, 5].map((idx) => {
                const char = code[idx] && code[idx] !== ' ' ? code[idx] : '';
                return (
                    <input
                        key={idx}
                        ref={(el) => (inputRefs.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength="6"
                        value={char}
                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        className={`w-11 h-13 sm:w-12 sm:h-14 text-center font-mono font-black text-2xl border-2 border-black rounded-xl bg-amber-50 shadow-[3px_3px_0_#000] focus:bg-yellow-200 focus:shadow-[1px_1px_0_#000] focus:translate-x-[1px] focus:translate-y-[1px] focus:outline-none transition-all ${
                            char ? 'border-indigo-600 bg-amber-100' : ''
                        }`}
                    />
                );
            })}
        </div>
    );
}

const CLOSED_STATUSES = ['returned', 'returned_with_issue', 'rejected', 'cancelled', 'expired'];

const NON_RETURNABLE_HINTS = {
    pending: 'Phiếu đang chờ Quản trị viên duyệt — Chưa nhận thiết bị nên chưa thể báo trả.',
    approved: 'Phiếu đã duyệt! Vui lòng tới Kho A102 (Tòa Gamma) nhận thiết bị trước khi trả.',
    return_pending: 'Đã báo trả! Vui lòng mang thiết bị tới Kho A102 để thủ kho kiểm tra và ký nhận.',
    unverified: 'Phiếu chưa xác nhận email! Vui lòng mở email và nhấn liên kết xác nhận.'
};

export default function BorrowReturn() {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const { showSuccess, showError } = useToast();

    // Requests state
    const [handedOverRequests, setHandedOverRequests] = useState([]);
    const [otherOpenRequests, setOtherOpenRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    // Return confirmation modal
    const [selectedRequestToReturn, setSelectedRequestToReturn] = useState(null);
    const [submittingReturn, setSubmittingReturn] = useState(false);

    // Lookup state
    const [phone, setPhone] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [sendingOtp, setSendingOtp] = useState(false);
    const [verifyingOtp, setVerifyingOtp] = useState(false);
    const [lookupError, setLookupError] = useState(null);
    const [showLookupBox, setShowLookupBox] = useState(false);
    const [lookedUpInfo, setLookedUpInfo] = useState(null);
    const [lookedUpTokens, setLookedUpTokens] = useState([]);

    // Fetch user's borrow requests
    const fetchRequests = useCallback(async () => {
        if (authLoading) return;
        setLoading(true);
        try {
            const tokens = borrowTokenStore.load();
            const res = await borrowApi.getMy(tokens);
            const data = res.data || {};

            if (data.invalidTokens && data.invalidTokens.length > 0) {
                borrowTokenStore.remove(data.invalidTokens);
            }

            const allRequests = data.requests || [];
            const openRequests = allRequests.filter((r) => !CLOSED_STATUSES.includes(r.status));
            const activeToReturn = openRequests.filter((r) => r.status === 'handed_over');
            const otherOpen = openRequests.filter((r) => r.status !== 'handed_over');

            setHandedOverRequests(activeToReturn);
            setOtherOpenRequests(otherOpen);

            if (activeToReturn.length === 0 && otherOpen.length === 0) {
                setShowLookupBox(true);
            }
        } catch (err) {
            console.error('[BORROW RETURN] Error fetching requests:', err);
            showError('Không thể tải danh sách phiếu mượn, vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    }, [authLoading, showError]);

    useEffect(() => {
        if (!authLoading) {
            setHandedOverRequests([]);
            setOtherOpenRequests([]);
            setLookedUpInfo(null);
            setLookedUpTokens([]);
            fetchRequests();
        }
    }, [user?.uid, authLoading, fetchRequests]);

    // Handle Confirm Return Request
    const handleConfirmReturn = async () => {
        if (!selectedRequestToReturn) return;
        setSubmittingReturn(true);
        try {
            const allTokens = Array.from(new Set([...lookedUpTokens, ...borrowTokenStore.load()]));
            const res = await borrowApi.returnRequest(selectedRequestToReturn.id, allTokens);
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

    // Step 1: Request OTP
    const handleRequestOtp = async (e) => {
        e.preventDefault();
        setLookupError(null);

        const cleanPhone = phone.trim();
        if (!/^0\d{9}$/.test(cleanPhone)) {
            setLookupError('Số điện thoại không hợp lệ (yêu cầu 10 chữ số, bắt đầu bằng số 0).');
            return;
        }

        setSendingOtp(true);
        try {
            await borrowApi.lookupOtp(cleanPhone);
            setOtpSent(true);
            showSuccess('Mã xác thực OTP đã được gửi đến email đăng ký của bạn.');
        } catch (err) {
            console.error('[BORROW RETURN] Lookup OTP error:', err);
            const resData = err.response?.data || {};
            setLookupError(resData.error || 'Không tìm thấy phiếu mượn với số điện thoại này.');
        } finally {
            setSendingOtp(false);
        }
    };

    // Step 2: Verify OTP
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setLookupError(null);

        const cleanPhone = phone.trim();
        const cleanCode = otpCode.replace(/\s+/g, '');

        if (cleanCode.length !== 6) {
            setLookupError('Vui lòng nhập đầy đủ 6 chữ số mã OTP.');
            return;
        }

        setVerifyingOtp(true);
        try {
            const res = await borrowApi.lookupVerify(cleanPhone, cleanCode);
            const lookedUpRequests = res.data?.requests || [];
            const accessTokens = res.data?.accessTokens || [];

            if (accessTokens.length > 0) {
                setLookedUpTokens((prev) => Array.from(new Set([...accessTokens, ...prev])));
                if (!user) {
                    borrowTokenStore.addMany(accessTokens);
                }
            }

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
                setPhone('');
                setShowLookupBox(false);
            } else {
                setLookedUpInfo({ phone: cleanPhone, total: 0, readyCount: 0 });
                showSuccess('Xác thực thành công nhưng hiện không có phiếu mượn nào đang mở với SĐT này.');
                setOtpSent(false);
                setOtpCode('');
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
            <header className="bg-white border-b-2 border-black sticky top-0 z-30 shadow-sm backdrop-blur-md bg-white/95">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
                    <button
                        onClick={() => navigate('/borrow')}
                        className="p-2 -ml-1.5 rounded-xl border-2 border-black bg-white hover:bg-slate-100 shadow-[2px_2px_0_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all"
                        title="Quay lại"
                    >
                        <ArrowLeft size={18} strokeWidth={2.5} />
                    </button>
                    <div>
                        <h1 className="text-base font-black tracking-tight text-black uppercase">
                            Hoàn Trả Thiết Bị
                        </h1>
                        <p className="text-[11px] font-bold text-slate-500">
                            Báo trả tại kho & tra cứu qua số điện thoại
                        </p>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-2xl mx-auto px-4 pt-5 space-y-6">
                {/* Lookup confirmation banner */}
                {lookedUpInfo && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-emerald-100 border-2 border-black rounded-2xl shadow-[3px_3px_0_#000] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                        <div className="flex items-start gap-2.5">
                            <CheckCircle2 size={20} className="text-emerald-700 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-xs font-black text-black uppercase tracking-wider">
                                    Kết Quả Tra Cứu SĐT: {lookedUpInfo.phone}
                                </h3>
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
                                setPhone('');
                            }}
                            className="px-3 py-1.5 bg-white border-2 border-black rounded-xl text-[11px] font-black shadow-[2px_2px_0_#000] hover:bg-slate-50 active:translate-x-[1px] active:translate-y-[1px] transition-all flex-shrink-0 self-start sm:self-center"
                        >
                            Tra cứu SĐT khác
                        </button>
                    </motion.div>
                )}

                {/* List of handed_over requests */}
                <section className="space-y-3.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border border-black inline-block"></span>
                            <h2 className="text-sm font-black text-black uppercase tracking-wider">
                                Thiết Bị Đang Mượn Chờ Trả
                            </h2>
                        </div>
                        {handedOverRequests.length > 0 && (
                            <span className="bg-emerald-300 text-black border-2 border-black text-xs px-2.5 py-0.5 rounded-full font-black shadow-[1px_1px_0_#000]">
                                {handedOverRequests.length} phiếu
                            </span>
                        )}
                    </div>

                    {loading ? (
                        <div className="p-10 text-center bg-white rounded-3xl border-2 border-black shadow-[4px_4px_0_#000] space-y-3">
                            <Loader2 size={30} className="animate-spin text-indigo-600 mx-auto" />
                            <p className="text-xs font-bold text-slate-500">
                                Đang tìm phiếu mượn của bạn...
                            </p>
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
                            <div className="w-10 h-10 bg-amber-300 text-black border-2 border-black rounded-xl flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_#000]">
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
                        <div className="text-center p-8 bg-white rounded-3xl border-2 border-black shadow-[4px_4px_0_#000] space-y-2.5">
                            <div className="w-14 h-14 bg-slate-100 text-slate-500 border-2 border-black rounded-2xl flex items-center justify-center mx-auto shadow-[2px_2px_0_#000]">
                                <Package size={28} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-sm font-black text-black">
                                Không tìm thấy thiết bị nào đang mượn trên trình duyệt này
                            </h3>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                                Nếu bạn đăng ký trên điện thoại hoặc máy khác, hãy dùng chức năng tra cứu bằng
                                Số Điện Thoại bên dưới để tìm lại nhé!
                            </p>
                        </div>
                    )}
                </section>

                {/* Other Open Requests found via account or phone lookup */}
                {!loading && otherOpenRequests.length > 0 && (
                    <section className="space-y-3.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="w-3.5 h-3.5 rounded-full bg-sky-400 border border-black inline-block"></span>
                                <h2 className="text-sm font-black text-black uppercase tracking-wider">
                                    Phiếu Mượn Đang Xử Lý Khác
                                </h2>
                            </div>
                            <span className="bg-sky-200 text-black border-2 border-black text-xs px-2.5 py-0.5 rounded-full font-black shadow-[1px_1px_0_#000]">
                                {otherOpenRequests.length} phiếu
                            </span>
                        </div>

                        <div className="space-y-4">
                            {otherOpenRequests.map((req) => (
                                <div key={req.id} className="space-y-2">
                                    <BorrowRequestCard request={req} />
                                    {NON_RETURNABLE_HINTS[req.status] && (
                                        <div className="mx-2 px-3.5 py-2.5 bg-slate-100 border-2 border-black rounded-xl text-[11px] font-bold text-slate-700 flex items-center justify-between gap-2 shadow-[2px_2px_0_#000]">
                                            <span className="flex items-center gap-1.5">
                                                <Clock size={14} className="text-indigo-600 flex-shrink-0" />
                                                {NON_RETURNABLE_HINTS[req.status]}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => navigate('/borrow')}
                                                className="text-indigo-700 font-black hover:underline flex items-center gap-0.5 flex-shrink-0"
                                            >
                                                Trang chủ <ArrowRight size={12} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Neo Phone & OTP Lookup Box */}
                <section className="bg-white border-2 border-black rounded-3xl p-5 shadow-[4px_4px_0_#000] space-y-4">
                    <div className="border-b-2 border-slate-100 pb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-amber-300 border-2 border-black font-black text-xs flex items-center justify-center shadow-[1px_1px_0_#000]">
                                <Search size={13} strokeWidth={3} />
                            </span>
                            <h2 className="text-sm font-black text-black uppercase tracking-wider">
                                Tra Cứu Phiếu Bằng Số Điện Thoại
                            </h2>
                        </div>
                        {(handedOverRequests.length > 0 || otherOpenRequests.length > 0) && (
                            <button
                                type="button"
                                onClick={() => setShowLookupBox((prev) => !prev)}
                                className="text-xs font-black text-indigo-700 hover:underline"
                            >
                                {showLookupBox ? 'Thu gọn ▲' : 'Mở rộng ▼'}
                            </button>
                        )}
                    </div>

                    {(showLookupBox || (handedOverRequests.length === 0 && otherOpenRequests.length === 0)) && (
                        <div className="space-y-4 pt-1">
                            <p className="text-xs text-slate-600 font-medium">
                                Nhập số điện thoại bạn đã dùng lúc đăng ký mượn. Hệ thống sẽ gửi mã OTP 6 số
                                đến email bảo mật để xác thực.
                            </p>

                            {lookupError && (
                                <motion.div
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-3.5 bg-rose-100 border-2 border-black rounded-2xl text-rose-950 text-xs font-bold flex items-start gap-2 shadow-[2px_2px_0_#000]"
                                >
                                    <AlertCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
                                    <span>{lookupError}</span>
                                </motion.div>
                            )}

                            {!otpSent ? (
                                <form onSubmit={handleRequestOtp} className="space-y-3.5">
                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                                            Số điện thoại người mượn
                                        </label>
                                        <input
                                            type="tel"
                                            required
                                            placeholder="Ví dụ: 0901234567"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="w-full h-11 px-3.5 text-sm font-bold border-2 border-black rounded-xl bg-white shadow-[3px_3px_0_#000] focus:shadow-[1px_1px_0_#000] focus:translate-x-[1px] focus:translate-y-[1px] focus:outline-none transition-all placeholder:font-normal placeholder:text-slate-400"
                                        />
                                    </div>

                                    <motion.button
                                        whileTap={{ scale: 0.98 }}
                                        type="submit"
                                        disabled={sendingOtp || !phone.trim()}
                                        className="w-full py-3.5 px-4 bg-indigo-600 text-white font-black text-sm border-2 border-black rounded-xl shadow-[3px_3px_0_#000] hover:shadow-[1px_1px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {sendingOtp ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                Đang gửi mã OTP...
                                            </>
                                        ) : (
                                            <>
                                                <Mail size={16} />
                                                Gửi Mã OTP Đến Email Đăng Ký
                                            </>
                                        )}
                                    </motion.button>
                                </form>
                            ) : (
                                <form onSubmit={handleVerifyOtp} className="space-y-4">
                                    <div className="p-3.5 bg-amber-100 border-2 border-black rounded-2xl text-xs text-amber-950 font-bold space-y-1 shadow-[2px_2px_0_#000]">
                                        <p className="flex items-center gap-1.5 font-black">
                                            <Mail size={15} /> Mã OTP đã được gửi đến email!
                                        </p>
                                        <p className="font-medium text-[11px]">
                                            Kiểm tra hộp thư đến (và thư rác) của email liên kết với SĐT{' '}
                                            <strong>{phone}</strong> và điền mã 6 chữ số bên dưới.
                                        </p>
                                    </div>

                                    {/* 6-box OTP input */}
                                    <div className="space-y-1.5">
                                        <label className="block text-center text-xs font-black uppercase tracking-wider text-slate-700">
                                            Mã Xác Thực OTP (6 số)
                                        </label>
                                        <OtpInputBoxes code={otpCode} setCode={setOtpCode} />
                                    </div>

                                    <div className="flex gap-2.5 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setOtpSent(false);
                                                setOtpCode('');
                                                setLookupError(null);
                                            }}
                                            className="w-1/3 py-3 px-3 bg-white border-2 border-black rounded-xl text-xs font-black shadow-[2px_2px_0_#000] hover:bg-slate-100 active:translate-x-[1px] active:translate-y-[1px] transition-all"
                                        >
                                            Đổi SĐT
                                        </button>

                                        <motion.button
                                            whileTap={{ scale: 0.98 }}
                                            type="submit"
                                            disabled={verifyingOtp || otpCode.replace(/\s+/g, '').length !== 6}
                                            className="w-2/3 py-3 px-4 bg-emerald-400 text-slate-900 border-2 border-black rounded-xl text-xs font-black shadow-[3px_3px_0_#000] hover:shadow-[1px_1px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-emerald-500 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                                        >
                                            {verifyingOtp ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" />
                                                    Đang xác thực...
                                                </>
                                            ) : (
                                                <>
                                                    <Check size={16} strokeWidth={3} />
                                                    Xác Nhận & Tra Cứu
                                                </>
                                            )}
                                        </motion.button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}
                </section>
            </main>

            {/* Neo-Glass Pro Modal for Confirmation */}
            <AnimatePresence>
                {selectedRequestToReturn && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="relative w-full max-w-sm">
                            <div
                                className="absolute inset-0 rounded-3xl"
                                style={{ background: '#ec4899', transform: 'translate(8px, 8px)' }}
                            />
                            <div
                                className="absolute inset-0 rounded-3xl"
                                style={{ background: '#8b5cf6', transform: 'translate(4px, 4px)' }}
                            />

                            <div className="relative bg-white border-[3px] border-black rounded-3xl p-6 shadow-2xl space-y-4">
                                <div className="flex gap-1">
                                    <span className="w-2.5 h-2.5 rounded-full bg-violet-500 border border-black inline-block"></span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-pink-500 border border-black inline-block"></span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-black inline-block"></span>
                                </div>

                                <div className="w-14 h-14 bg-emerald-100 text-black border-2 border-black rounded-2xl flex items-center justify-center mx-auto shadow-[2px_2px_0_#000] rotate-3">
                                    <RotateCcw size={28} strokeWidth={2.5} className="text-emerald-700" />
                                </div>

                                <div className="text-center space-y-1.5">
                                    <h3 className="text-base font-black text-black uppercase tracking-tight">
                                        Xác Nhận Báo Trả Thiết Bị
                                    </h3>
                                    <p className="text-xs font-bold text-slate-700">
                                        Phiếu mượn: <strong className="text-indigo-600 font-mono">#{selectedRequestToReturn.id}</strong>
                                    </p>
                                    <div className="p-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-left text-xs font-medium text-slate-600">
                                        Sau khi bấm xác nhận, trạng thái sẽ đổi thành{' '}
                                        <strong className="text-black">"Chờ kho kiểm tra"</strong>. Bạn hãy mang toàn
                                        bộ thiết bị đến <strong>Kho A102 (Tòa Gamma)</strong> để thủ kho kiểm tra và ký nhận.
                                    </div>
                                </div>

                                <div className="flex gap-2.5 pt-2">
                                    <button
                                        onClick={() => setSelectedRequestToReturn(null)}
                                        disabled={submittingReturn}
                                        className="w-1/2 py-2.5 px-3 bg-white border-2 border-black rounded-xl text-xs font-black shadow-[2px_2px_0_#000] hover:bg-slate-100 transition-all"
                                    >
                                        Đóng
                                    </button>

                                    <button
                                        onClick={handleConfirmReturn}
                                        disabled={submittingReturn}
                                        className="w-1/2 py-2.5 px-3 bg-indigo-600 text-white border-2 border-black rounded-xl text-xs font-black shadow-[2px_2px_0_#000] hover:bg-indigo-700 active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-center gap-1.5"
                                    >
                                        {submittingReturn ? (
                                            <>
                                                <Loader2 size={14} className="animate-spin" />
                                                Đang xử lý...
                                            </>
                                        ) : (
                                            'Xác Nhận Báo Trả'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
