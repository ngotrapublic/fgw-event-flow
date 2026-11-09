import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
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
    Check
} from 'lucide-react';
import { borrowApi } from '../../api/borrow';
import { borrowTokenStore } from '../../lib/borrow-token-store';
import { useToast } from '../Toast';
import BorrowRequestCard from './BorrowRequestCard';

export default function BorrowReturn() {
    const navigate = useNavigate();
    const { showSuccess, showError } = useToast();

    // Requests state
    const [handedOverRequests, setHandedOverRequests] = useState([]);
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

    // Fetch user's borrow requests
    const fetchRequests = useCallback(async () => {
        setLoading(true);
        try {
            const tokens = borrowTokenStore.load();
            const res = await borrowApi.getMy(tokens);
            const data = res.data || {};

            if (data.invalidTokens && data.invalidTokens.length > 0) {
                borrowTokenStore.remove(data.invalidTokens);
            }

            const allRequests = data.requests || [];
            const activeToReturn = allRequests.filter((r) => r.status === 'handed_over');
            setHandedOverRequests(activeToReturn);

            if (activeToReturn.length === 0) {
                setShowLookupBox(true);
            }
        } catch (err) {
            console.error('[BORROW RETURN] Error fetching requests:', err);
            showError('Không thể tải danh sách phiếu mượn, vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    // Handle Confirm Return Request
    const handleConfirmReturn = async () => {
        if (!selectedRequestToReturn) return;
        setSubmittingReturn(true);
        try {
            const tokens = borrowTokenStore.load();
            await borrowApi.returnRequest(selectedRequestToReturn.id, tokens[0] || '');
            showSuccess('Đã báo trả thành công! Vui lòng mang thiết bị đến kho để hoàn tất.');
            setSelectedRequestToReturn(null);
            fetchRequests();
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
            showSuccess('Mã xác thực đã được gửi đến email đăng ký của bạn.');
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
        const cleanCode = otpCode.trim();

        if (!cleanCode) {
            setLookupError('Vui lòng nhập mã OTP xác thực.');
            return;
        }

        setVerifyingOtp(true);
        try {
            const res = await borrowApi.lookupVerify(cleanPhone, cleanCode);
            const accessTokens = res.data?.accessTokens || [];

            if (accessTokens.length > 0) {
                borrowTokenStore.addMany(accessTokens);
                showSuccess('Xác thực thành công! Đã tìm thấy phiếu mượn của bạn.');
                setOtpSent(false);
                setOtpCode('');
                setPhone('');
                setShowLookupBox(false);
                fetchRequests();
            } else {
                showSuccess('Xác thực thành công nhưng không có phiếu mượn nào đang mở.');
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
                        onClick={() => navigate('/borrow')}
                        className="p-2 -ml-1.5 rounded-xl border-2 border-black bg-white hover:bg-slate-100 shadow-[2px_2px_0_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all"
                        title="Quay lại"
                    >
                        <ArrowLeft size={18} strokeWidth={2.5} />
                    </button>
                    <div>
                        <h1 className="text-base font-black tracking-tight text-black uppercase">
                            Trả Thiết Bị
                        </h1>
                        <p className="text-[11px] font-bold text-slate-500">
                            Báo trả thiết bị và tra cứu phiếu mượn
                        </p>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-2xl mx-auto px-4 pt-5 space-y-6">
                {/* List of handed_over requests */}
                <section className="space-y-3.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-emerald-500 border border-black inline-block"></span>
                            <h2 className="text-sm font-black text-black uppercase tracking-wider">
                                Thiết Bị Đang Mượn Chờ Trả
                            </h2>
                        </div>
                        {handedOverRequests.length > 0 && (
                            <span className="bg-emerald-300 text-black border-2 border-black text-xs px-2.5 py-0.5 rounded-full font-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                                {handedOverRequests.length} phiếu
                            </span>
                        )}
                    </div>

                    {loading ? (
                        <div className="p-10 text-center bg-white rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-3">
                            <Loader2 size={28} className="animate-spin text-indigo-600 mx-auto" />
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
                    ) : (
                        <div className="text-center p-8 bg-white rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-2.5">
                            <div className="w-14 h-14 bg-slate-100 text-slate-500 border-2 border-black rounded-2xl flex items-center justify-center mx-auto shadow-[2px_2px_0_#000]">
                                <Package size={28} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-sm font-black text-black">
                                Không tìm thấy thiết bị nào đang mượn trên trình duyệt này
                            </h3>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                                Nếu bạn đăng ký trên điện thoại hoặc máy khác, hãy nhập Số Điện Thoại bên
                                dưới để hệ thống tìm lại phiếu cho bạn nhé!
                            </p>
                        </div>
                    )}
                </section>

                {/* Neo-Brutalist Phone Lookup Box */}
                <section className="bg-white border-2 border-black rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
                    <div className="border-b-2 border-slate-100 pb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-amber-300 border-2 border-black font-black text-xs flex items-center justify-center shadow-[1px_1px_0_#000]">
                                <Search size={13} strokeWidth={3} />
                            </span>
                            <h2 className="text-sm font-black text-black uppercase tracking-wider">
                                Tra Cứu Phiếu Bằng Số Điện Thoại
                            </h2>
                        </div>
                        {handedOverRequests.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setShowLookupBox((prev) => !prev)}
                                className="text-xs font-black text-indigo-700 hover:underline"
                            >
                                {showLookupBox ? 'Thu gọn ▲' : 'Mở rộng ▼'}
                            </button>
                        )}
                    </div>

                    {(showLookupBox || handedOverRequests.length === 0) && (
                        <div className="space-y-4 pt-1">
                            <p className="text-xs text-slate-600 font-medium">
                                Nhập số điện thoại bạn đã dùng lúc đăng ký mượn. Hệ thống sẽ gửi mã OTP 6 số
                                đến email bảo mật để xác thực.
                            </p>

                            {lookupError && (
                                <div className="p-3.5 bg-rose-100 border-2 border-black rounded-xl text-rose-950 text-xs font-bold flex items-start gap-2 shadow-[2px_2px_0_#000]">
                                    <AlertCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
                                    <span>{lookupError}</span>
                                </div>
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

                                    <button
                                        type="submit"
                                        disabled={sendingOtp || !phone.trim()}
                                        className="w-full py-3 px-4 bg-indigo-600 text-white font-black text-sm border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {sendingOtp ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                Đang gửi mã xác thực...
                                            </>
                                        ) : (
                                            <>
                                                <Mail size={16} />
                                                Gửi Mã OTP Đến Email
                                            </>
                                        )}
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleVerifyOtp} className="space-y-4">
                                    <div className="p-3.5 bg-amber-100 border-2 border-black rounded-xl text-xs text-amber-950 font-bold space-y-1 shadow-[2px_2px_0_#000]">
                                        <p className="flex items-center gap-1.5 font-black">
                                            <Mail size={14} /> Mã xác thực đã gửi đến email của bạn!
                                        </p>
                                        <p className="font-medium text-[11px]">
                                            Mã OTP 6 số đã được gửi đến email đăng ký của SĐT{' '}
                                            <strong>{phone}</strong>. Vui lòng kiểm tra hộp thư (cả hòm thư Rác).
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                                            Nhập mã OTP 6 số
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            maxLength="6"
                                            placeholder="123456"
                                            value={otpCode}
                                            onChange={(e) => setOtpCode(e.target.value)}
                                            className="w-full h-12 text-center font-mono tracking-widest text-xl font-black border-2 border-black rounded-xl bg-amber-50 shadow-[3px_3px_0_#000] focus:shadow-[1px_1px_0_#000] focus:translate-x-[1px] focus:translate-y-[1px] focus:outline-none transition-all"
                                        />
                                    </div>

                                    <div className="flex gap-2.5">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setOtpSent(false);
                                                setOtpCode('');
                                            }}
                                            className="w-1/3 py-2.5 px-3 bg-white border-2 border-black rounded-xl text-xs font-black shadow-[2px_2px_0_#000] hover:bg-slate-100 active:translate-x-[1px] active:translate-y-[1px] transition-all"
                                        >
                                            Đổi SĐT
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={verifyingOtp || otpCode.trim().length !== 6}
                                            className="w-2/3 py-2.5 px-4 bg-emerald-400 text-slate-900 border-2 border-black rounded-xl text-xs font-black shadow-[3px_3px_0_#000] hover:shadow-[1px_1px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-emerald-500 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                                        >
                                            {verifyingOtp ? (
                                                <>
                                                    <Loader2 size={14} className="animate-spin" />
                                                    Đang xác thực...
                                                </>
                                            ) : (
                                                <>
                                                    <Check size={16} strokeWidth={3} />
                                                    Xác Nhận & Tra Cứu
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}
                </section>
            </main>

            {/* Neo-Glass Pro Modal for Confirmation */}
            {selectedRequestToReturn && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="relative w-full max-w-sm">
                        {/* Multi-layer shadow */}
                        <div
                            className="absolute inset-0 rounded-2xl"
                            style={{ background: '#ec4899', transform: 'translate(8px, 8px)' }}
                        />
                        <div
                            className="absolute inset-0 rounded-2xl"
                            style={{ background: '#8b5cf6', transform: 'translate(4px, 4px)' }}
                        />

                        {/* Modal content */}
                        <div className="relative bg-white border-[3px] border-black rounded-2xl p-6 shadow-2xl space-y-4">
                            {/* Decorative dots */}
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
                                <div className="p-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-left text-xs font-medium text-slate-600">
                                    Sau khi bấm xác nhận, trạng thái sẽ chuyển thành{' '}
                                    <strong className="text-black">"Chờ kho kiểm tra"</strong>. Bạn vui lòng
                                    mang toàn bộ thiết bị đến <strong>Kho A102 (Tòa Gamma)</strong> để thủ kho
                                    kiểm tra và hoàn tất.
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
        </div>
    );
}
