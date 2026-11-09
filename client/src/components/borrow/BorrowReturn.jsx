import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    RotateCcw,
    Search,
    Phone,
    Mail,
    KeyRound,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Package
} from 'lucide-react';
import { borrowApi } from '../../api/borrow';
import { borrowTokenStore } from '../../lib/borrow-token-store';
import { useToast } from '../Toast';
import { Button } from '../ui/Button';
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

            // If no active requests found, auto-open lookup section
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
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
                    <button
                        onClick={() => navigate('/borrow')}
                        className="p-1.5 -ml-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                        title="Quay lại"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-base font-bold text-slate-900">Trả Thiết Bị</h1>
                        <p className="text-xs text-slate-500">Báo trả thiết bị và tra cứu phiếu mượn</p>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-2xl mx-auto px-4 pt-5 space-y-6">
                {/* List of handed_over requests */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <RotateCcw size={16} className="text-indigo-600" />
                            Thiết Bị Đang Mượn Chờ Trả
                            {handedOverRequests.length > 0 && (
                                <span className="ml-1 bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-bold">
                                    {handedOverRequests.length}
                                </span>
                            )}
                        </h2>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
                            <Loader2 size={24} className="animate-spin text-indigo-600 mx-auto mb-2" />
                            <p className="text-xs text-slate-500">Đang tìm phiếu mượn của bạn...</p>
                        </div>
                    ) : handedOverRequests.length > 0 ? (
                        <div className="space-y-3">
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
                        <div className="text-center p-6 bg-white rounded-2xl border border-slate-200 text-xs text-slate-500 space-y-2">
                            <Package size={28} className="text-slate-300 mx-auto" />
                            <p className="font-semibold text-slate-700">
                                Không tìm thấy thiết bị nào đang mượn trên trình duyệt này
                            </p>
                            <p>
                                Nếu bạn đăng ký trên điện thoại hoặc thiết bị khác, vui lòng sử dụng phần
                                tra cứu bằng Số Điện Thoại bên dưới.
                            </p>
                        </div>
                    )}
                </section>

                {/* Lookup by Phone Box */}
                <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
                    <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
                        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <Search size={16} className="text-indigo-600" />
                            Tra Cứu Phiếu Bằng Số Điện Thoại
                        </h2>
                        {handedOverRequests.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setShowLookupBox((prev) => !prev)}
                                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                            >
                                {showLookupBox ? 'Thu gọn' : 'Mở rộng'}
                            </button>
                        )}
                    </div>

                    {(showLookupBox || handedOverRequests.length === 0) && (
                        <div className="space-y-4 pt-1">
                            <p className="text-xs text-slate-500">
                                Nhập số điện thoại đã dùng để đăng ký mượn thiết bị. Hệ thống sẽ gửi mã xác
                                thực OTP 6 số đến email tương ứng để bảo mật thông tin.
                            </p>

                            {lookupError && (
                                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-start gap-2">
                                    <AlertCircle size={15} className="text-rose-600 flex-shrink-0 mt-0.5" />
                                    <span>{lookupError}</span>
                                </div>
                            )}

                            {!otpSent ? (
                                <form onSubmit={handleRequestOtp} className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Số điện thoại người mượn
                                        </label>
                                        <input
                                            type="tel"
                                            required
                                            placeholder="Ví dụ: 0901234567"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="w-full h-10 px-3 text-sm border-2 border-slate-200 rounded-lg focus:border-indigo-600 focus:outline-none"
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        variant="primary"
                                        isLoading={sendingOtp}
                                        disabled={sendingOtp || !phone.trim()}
                                        className="w-full font-bold bg-indigo-600 hover:bg-indigo-700"
                                    >
                                        {sendingOtp ? 'Đang gửi mã...' : 'Gửi Mã Xác Thực Đến Email'}
                                    </Button>
                                </form>
                            ) : (
                                <form onSubmit={handleVerifyOtp} className="space-y-3">
                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                                        <p className="font-semibold flex items-center gap-1.5">
                                            <Mail size={14} /> Mã đã gửi tới email của bạn!
                                        </p>
                                        <p>
                                            Vui lòng kiểm tra email liên kết với số điện thoại{' '}
                                            <strong>{phone}</strong> (bao gồm cả hòm thư Spam/Rác) và nhập mã
                                            xác thực 6 số bên dưới.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Nhập mã xác thực (OTP 6 số)
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            maxLength="6"
                                            placeholder="123456"
                                            value={otpCode}
                                            onChange={(e) => setOtpCode(e.target.value)}
                                            className="w-full h-11 text-center font-mono tracking-widest text-lg font-bold border-2 border-slate-200 rounded-lg focus:border-indigo-600 focus:outline-none"
                                        />
                                    </div>

                                    <div className="flex gap-2 pt-1">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() => {
                                                setOtpSent(false);
                                                setOtpCode('');
                                            }}
                                            className="w-1/3 text-xs"
                                        >
                                            Đổi SĐT
                                        </Button>

                                        <Button
                                            type="submit"
                                            variant="primary"
                                            isLoading={verifyingOtp}
                                            disabled={verifyingOtp || otpCode.trim().length !== 6}
                                            className="w-2/3 font-bold bg-indigo-600 hover:bg-indigo-700"
                                        >
                                            {verifyingOtp ? 'Đang xác thực...' : 'Xác Nhận & Tra Cứu'}
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}
                </section>
            </main>

            {/* Confirmation Modal for Báo Trả */}
            {selectedRequestToReturn && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
                        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                            <RotateCcw size={24} />
                        </div>

                        <div className="text-center space-y-1.5">
                            <h3 className="text-base font-bold text-slate-900">Xác Nhận Báo Trả Thiết Bị</h3>
                            <p className="text-xs text-slate-600">
                                Bạn đang báo trả cho phiếu mượn{' '}
                                <strong className="text-indigo-600">
                                    #{selectedRequestToReturn.id}
                                </strong>
                                .
                            </p>
                            <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-left">
                                Sau khi bấm xác nhận, trạng thái sẽ đổi thành <strong>"Chờ kho kiểm tra"</strong>.
                                Bạn cần mang toàn bộ thiết bị tới kho để thủ kho kiểm tra và ký nhận hoàn trả.
                            </p>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button
                                variant="secondary"
                                onClick={() => setSelectedRequestToReturn(null)}
                                disabled={submittingReturn}
                                className="w-1/2 text-xs font-semibold"
                            >
                                Đóng
                            </Button>

                            <Button
                                variant="primary"
                                onClick={handleConfirmReturn}
                                isLoading={submittingReturn}
                                disabled={submittingReturn}
                                className="w-1/2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                Xác Nhận Báo Trả
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

