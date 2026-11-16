import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    ArrowRight,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Package,
    Clock,
    Info,
    RefreshCw
} from 'lucide-react';
import { borrowApi } from '../../api/borrow';
import { isValidVnPhone, normalizePhoneInput } from '../../lib/borrow-utils';
import { useAuth } from '../../context/AuthContext';
import { useBorrowRequests } from '../../hooks/useBorrowRequests';
import { useToast } from '../Toast';
import BorrowRequestCard from './BorrowRequestCard';
import { NON_RETURNABLE_HINTS } from './BorrowStatus';
import OtpLookupSection from './OtpLookupSection';
import ReturnConfirmDialog from './ReturnConfirmDialog';
import BorrowPortalHeader from './BorrowPortalHeader';

export default function BorrowReturn() {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const { showSuccess, showError } = useToast();

    const {
        setRequests,
        loading,
        fetchError,
        refetch: fetchRequests,
        handedOverRequests,
        otherOpenRequests,
        closedRequests
    } = useBorrowRequests({
        userUid: user?.uid,
        authLoading,
        onError: showError
    });

    const [selectedRequestToReturn, setSelectedRequestToReturn] = useState(null);
    const [submittingReturn, setSubmittingReturn] = useState(false);

    const [phone, setPhone] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [otpCooldown, setOtpCooldown] = useState(0);
    const [sendingOtp, setSendingOtp] = useState(false);
    const [verifyingOtp, setVerifyingOtp] = useState(false);
    const [lookupError, setLookupError] = useState(null);
    const [showLookupBox, setShowLookupBox] = useState(false);
    const [lookedUpInfo, setLookedUpInfo] = useState(null);

    useEffect(() => {
        setLookedUpInfo(null);
    }, [user?.uid]);

    useEffect(() => {
        if (!loading && !fetchError && handedOverRequests.length === 0 && otherOpenRequests.length === 0) {
            setShowLookupBox(true);
        }
    }, [loading, fetchError, handedOverRequests.length, otherOpenRequests.length]);

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
                setRequests((prev) => [updated, ...prev.filter((r) => r.id !== updated.id)]);
            }
        } catch (err) {
            console.error('[BORROW RETURN] Return error:', err);
            if (err.response?.status === 409) {
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
        if (!isValidVnPhone(phone)) {
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
            setLookupError(
                err.response?.data?.error || 'Không thể gửi yêu cầu OTP lúc này, vui lòng thử lại sau.'
            );
        } finally {
            setSendingOtp(false);
        }
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
                const readyCount = lookedUpRequests.filter((r) => r.status === 'handed_over').length;
                setRequests((prev) => {
                    const map = new Map(prev.map((r) => [r.id, r]));
                    lookedUpRequests.forEach((r) => map.set(r.id, r));
                    return Array.from(map.values());
                });

                setLookedUpInfo({
                    phone: cleanPhone,
                    total: lookedUpRequests.length,
                    readyCount
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

    const closedRequestsCount = closedRequests.length;

    return (
        <div className="min-h-screen bg-[#fafafa] text-slate-900 pb-20 relative overflow-x-hidden">
            <BorrowPortalHeader
                title="Hoàn Trả & Tra Cứu Thiết Bị"
                subtitle="Báo trả tại kho & tra cứu qua số điện thoại"
                badge={null}
                backTo="/borrow"
                backLabel="Quay lại trang chủ mượn thiết bị"
            />

            <main className="max-w-2xl mx-auto px-4 pt-5 space-y-6">
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

                {/* Handed Over Requests */}
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
                                {closedRequestsCount > 0
                                    ? `Bạn có ${closedRequestsCount} phiếu đã hoàn tất (Đã trả / Đã huỷ / Từ chối). Nếu muốn tra cứu phiếu đang mở đăng ký trên thiết bị khác, hãy dùng mục Số Điện Thoại bên dưới.`
                                    : 'Nếu bạn đăng ký trên điện thoại hoặc máy khác, hãy dùng chức năng tra cứu bằng Số Điện Thoại bên dưới để tìm lại phiếu đang mở nhé!'}
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

                <OtpLookupSection
                    hasOpenRequests={handedOverRequests.length > 0 || otherOpenRequests.length > 0}
                    showLookupBox={showLookupBox}
                    onToggleLookupBox={() => setShowLookupBox((prev) => !prev)}
                    lookupError={lookupError}
                    onClearError={() => {
                        if (lookupError) setLookupError(null);
                    }}
                    otpSent={otpSent}
                    phone={phone}
                    onChangePhone={setPhone}
                    otpCode={otpCode}
                    onChangeOtpCode={setOtpCode}
                    otpCooldown={otpCooldown}
                    sendingOtp={sendingOtp}
                    verifyingOtp={verifyingOtp}
                    onRequestOtp={requestOtpForPhone}
                    onVerifyOtp={handleVerifyOtp}
                    onResetPhoneStep={() => {
                        setOtpSent(false);
                        setOtpCode('');
                        setOtpCooldown(0);
                        setLookupError(null);
                    }}
                />
            </main>

            <AnimatePresence>
                {selectedRequestToReturn && (
                    <ReturnConfirmDialog
                        request={selectedRequestToReturn}
                        submitting={submittingReturn}
                        onClose={() => setSelectedRequestToReturn(null)}
                        onConfirm={handleConfirmReturn}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
