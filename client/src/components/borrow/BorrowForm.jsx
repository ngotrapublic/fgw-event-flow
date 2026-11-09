import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Package,
    Calendar,
    User,
    Mail,
    Phone,
    FileText,
    CheckCircle2,
    AlertCircle,
    Send,
    Loader2
} from 'lucide-react';
import { borrowApi } from '../../api/borrow';
import { borrowTokenStore } from '../../lib/borrow-token-store';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../Toast';
import { Button } from '../ui/Button';

function getTomorrowDateString() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getMaxDueDateString() {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export default function BorrowForm() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();

    // Resources from API
    const [resources, setResources] = useState([]);
    const [loadingResources, setLoadingResources] = useState(true);

    // Selected quantities: { [resourceId]: qty }
    const [selectedItems, setSelectedItems] = useState({});

    // Form inputs
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [dueDate, setDueDate] = useState(getTomorrowDateString());
    const [note, setNote] = useState('');

    // State
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [createdGuestRequest, setCreatedGuestRequest] = useState(null);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [isResending, setIsResending] = useState(false);

    // Load resources on mount
    useEffect(() => {
        let isMounted = true;
        async function fetchResources() {
            setLoadingResources(true);
            try {
                const res = await borrowApi.getResources();
                if (isMounted) {
                    setResources(res.data || []);
                }
            } catch (err) {
                console.error('[BORROW FORM] Error fetching resources:', err);
                if (isMounted) {
                    showError('Không thể tải danh mục thiết bị, vui lòng tải lại trang.');
                }
            } finally {
                if (isMounted) setLoadingResources(false);
            }
        }
        fetchResources();
        return () => {
            isMounted = false;
        };
    }, [showError]);

    // Resend cooldown timer
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => {
            setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    // Total selected count
    const totalSelectedQty = useMemo(() => {
        return Object.values(selectedItems).reduce((acc, qty) => acc + (qty > 0 ? qty : 0), 0);
    }, [selectedItems]);

    // Handle quantity change
    const handleQtyChange = (resourceId, val, maxQty) => {
        const parsed = parseInt(val, 10);
        if (isNaN(parsed) || parsed <= 0) {
            setSelectedItems((prev) => {
                const copy = { ...prev };
                delete copy[resourceId];
                return copy;
            });
        } else {
            const clamped = Math.min(parsed, maxQty);
            setSelectedItems((prev) => ({ ...prev, [resourceId]: clamped }));
        }
    };

    // Toggle resource selection
    const handleToggleResource = (resourceId, maxQty) => {
        if (maxQty <= 0) return;
        setSelectedItems((prev) => {
            const copy = { ...prev };
            if (copy[resourceId]) {
                delete copy[resourceId];
            } else {
                copy[resourceId] = 1;
            }
            return copy;
        });
    };

    // Submit handler
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError(null);

        // Build items payload
        const itemsPayload = Object.entries(selectedItems)
            .filter(([, qty]) => qty > 0)
            .map(([resourceId, qty]) => ({ resourceId, qty }));

        if (itemsPayload.length === 0) {
            setSubmitError('Vui lòng chọn ít nhất 1 thiết bị để mượn.');
            return;
        }

        // Phone validation
        const cleanPhone = phone.trim();
        if (!/^0\d{9}$/.test(cleanPhone)) {
            setSubmitError('Số điện thoại không hợp lệ (yêu cầu 10 chữ số, bắt đầu bằng số 0).');
            return;
        }

        // Validate guest details
        if (!user) {
            const cleanName = name.trim();
            const cleanEmail = email.trim();
            if (cleanName.length < 2 || cleanName.length > 100) {
                setSubmitError('Họ và tên người mượn phải từ 2 đến 100 ký tự.');
                return;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
                setSubmitError('Địa chỉ email không đúng định dạng.');
                return;
            }
        }

        if (!dueDate) {
            setSubmitError('Vui lòng chọn ngày hẹn trả thiết bị.');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                items: itemsPayload,
                phone: cleanPhone,
                dueDate,
                note: note.trim()
            };

            if (!user) {
                payload.name = name.trim();
                payload.email = email.trim().toLowerCase();
            }

            const res = await borrowApi.create(payload);
            const { request, accessToken } = res.data || {};

            // Save accessToken to store if returned
            if (accessToken) {
                borrowTokenStore.add(accessToken);
            }

            if (user) {
                // Logged-in user -> direct to pending, return to home
                showSuccess('Đã tạo phiếu mượn thành công! Đang chờ Quản trị viên duyệt.');
                navigate('/borrow');
            } else {
                // Guest -> show email verification screen
                setCreatedGuestRequest({
                    request,
                    accessToken,
                    email: email.trim().toLowerCase()
                });
                setResendCooldown(60);
            }
        } catch (err) {
            console.error('[BORROW FORM] Submission error:', err);
            const resData = err.response?.data || {};

            if (err.response?.status === 502) {
                setSubmitError(
                    'Không gửi được email xác nhận. Vui lòng kiểm tra lại địa chỉ email hoặc thử lại sau ít phút.'
                );
            } else if (resData.details?.shortages) {
                const shortageDesc = resData.details.shortages
                    .map(
                        (s) =>
                            `"${s.label || s.resourceId}" (còn ${s.available}, bạn yêu cầu ${s.requested})`
                    )
                    .join('; ');
                setSubmitError(`Kho không đủ số lượng cho các thiết bị: ${shortageDesc}.`);
            } else {
                setSubmitError(resData.error || 'Có lỗi xảy ra khi tạo yêu cầu. Vui lòng kiểm tra lại.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    // Resend verification for guest
    const handleResend = async () => {
        if (!createdGuestRequest || resendCooldown > 0) return;
        setIsResending(true);
        try {
            await borrowApi.resendVerification(
                createdGuestRequest.request.id,
                createdGuestRequest.accessToken
            );
            showSuccess('Đã gửi lại email xác nhận thành công!');
            setResendCooldown(60);
        } catch (err) {
            showError(err.response?.data?.error || 'Không thể gửi lại email xác nhận.');
        } finally {
            setIsResending(false);
        }
    };

    // ==========================================
    // RENDER: GUEST SUCCESS VERIFICATION SCREEN
    // ==========================================
    if (createdGuestRequest) {
        return (
            <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
                <header className="bg-white border-b border-slate-200">
                    <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Package size={20} className="text-indigo-600" />
                            <h1 className="text-base font-bold text-slate-900">Mượn Trả Thiết Bị</h1>
                        </div>
                    </div>
                </header>

                <main className="max-w-md mx-auto px-4 pt-10 text-center space-y-6">
                    <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
                        <Mail size={32} />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-slate-900">Kiểm tra Email để xác nhận</h2>
                        <p className="text-sm text-slate-600">
                            Chúng tôi đã gửi một liên kết xác nhận đến địa chỉ:
                        </p>
                        <p className="font-semibold text-indigo-700 bg-indigo-50 py-1 px-3 rounded-lg inline-block text-sm border border-indigo-100">
                            {createdGuestRequest.email}
                        </p>
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-slate-200 text-left text-xs text-slate-600 space-y-2 shadow-sm">
                        <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <AlertCircle size={14} className="text-amber-500" /> Lưu ý quan trọng:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-slate-600">
                            <li>Kiểm tra cả hòm thư <strong>Spam / Rác</strong> nếu không thấy trong Hộp thư đến.</li>
                            <li>Liên kết xác nhận có hiệu lực trong vòng <strong>24 giờ</strong>.</li>
                            <li>Sau khi bạn bấm xác nhận, phiếu mượn mới chính thức được chuyển tới Quản trị viên để phê duyệt.</li>
                        </ul>
                    </div>

                    <div className="space-y-3 pt-2">
                        <Button
                            variant="secondary"
                            onClick={handleResend}
                            disabled={resendCooldown > 0 || isResending}
                            className="w-full text-xs font-semibold"
                        >
                            {isResending ? (
                                <>
                                    <Loader2 size={14} className="mr-2 animate-spin" />
                                    Đang gửi lại...
                                </>
                            ) : resendCooldown > 0 ? (
                                `Gửi lại email sau (${resendCooldown}s)`
                            ) : (
                                <>
                                    <Send size={14} className="mr-1.5" />
                                    Gửi lại email xác nhận
                                </>
                            )}
                        </Button>

                        <Button
                            variant="primary"
                            onClick={() => navigate('/borrow')}
                            className="w-full text-sm font-semibold bg-indigo-600 hover:bg-indigo-700"
                        >
                            Về trang chủ Mượn Thiết Bị
                        </Button>
                    </div>
                </main>
            </div>
        );
    }

    // ==========================================
    // RENDER: BORROW REQUEST FORM
    // ==========================================
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
                        <h1 className="text-base font-bold text-slate-900">Đăng Ký Mượn Thiết Bị</h1>
                        <p className="text-xs text-slate-500">Điền thông tin và chọn thiết bị cần mượn</p>
                    </div>
                </div>
            </header>

            {/* Form */}
            <main className="max-w-2xl mx-auto px-4 pt-5">
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Error Box */}
                    {submitError && (
                        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-start gap-2 shadow-sm">
                            <AlertCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">{submitError}</div>
                        </div>
                    )}

                    {/* Section 1: Equipment Selection */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3.5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Package size={17} className="text-indigo-600" />
                                1. Chọn Thiết Bị Cần Mượn
                            </h2>
                            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                                Đã chọn: {totalSelectedQty} món
                            </span>
                        </div>

                        {loadingResources ? (
                            <div className="py-8 text-center">
                                <Loader2 size={24} className="animate-spin text-indigo-600 mx-auto mb-2" />
                                <p className="text-xs text-slate-500">Đang tải danh sách thiết bị khả dụng...</p>
                            </div>
                        ) : resources.length === 0 ? (
                            <div className="p-6 text-center text-xs text-slate-500">
                                Hiện không có thiết bị nào sẵn sàng trong kho.
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {resources.map((res) => {
                                    const isAvailable = res.availableQty > 0;
                                    const isChecked = !!selectedItems[res.id];
                                    const currentQty = selectedItems[res.id] || 0;

                                    return (
                                        <div
                                            key={res.id}
                                            className={`py-3 flex items-center justify-between gap-3 ${
                                                !isAvailable ? 'opacity-50' : ''
                                            }`}
                                        >
                                            <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    disabled={!isAvailable}
                                                    onChange={() =>
                                                        handleToggleResource(res.id, res.availableQty)
                                                    }
                                                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 disabled:cursor-not-allowed"
                                                />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-slate-900 truncate">
                                                        {res.label}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {res.category || 'Thiết bị'} • Còn sẵn:{' '}
                                                        <strong
                                                            className={
                                                                isAvailable ? 'text-emerald-700' : 'text-rose-600'
                                                            }
                                                        >
                                                            {res.availableQty}
                                                        </strong>
                                                    </p>
                                                </div>
                                            </label>

                                            {/* Quantity input */}
                                            {isChecked && isAvailable && (
                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                    <span className="text-xs text-slate-500 font-medium">SL:</span>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max={res.availableQty}
                                                        value={currentQty || 1}
                                                        onChange={(e) =>
                                                            handleQtyChange(
                                                                res.id,
                                                                e.target.value,
                                                                res.availableQty
                                                            )
                                                        }
                                                        className="w-16 h-8 text-center text-sm font-bold border-2 border-slate-200 rounded-lg focus:border-indigo-600 focus:outline-none"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Section 2: Borrower Information */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3.5">
                        <div className="border-b border-slate-100 pb-2.5">
                            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <User size={17} className="text-indigo-600" />
                                2. Thông Tin Người Mượn
                            </h2>
                        </div>

                        {user ? (
                            <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs space-y-1">
                                <p className="font-semibold text-indigo-900">
                                    Đang mượn bằng tài khoản: {user.name || user.email}
                                </p>
                                <p className="text-indigo-700">Email: {user.email}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Họ và tên <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ví dụ: Nguyễn Văn A"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full h-10 px-3 text-sm border-2 border-slate-200 rounded-lg focus:border-indigo-600 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Email nhận thông báo <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="email@fpt.edu.vn"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full h-10 px-3 text-sm border-2 border-slate-200 rounded-lg focus:border-indigo-600 focus:outline-none"
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Số điện thoại liên hệ <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="tel"
                                required
                                placeholder="0901234567"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full h-10 px-3 text-sm border-2 border-slate-200 rounded-lg focus:border-indigo-600 focus:outline-none"
                            />
                            <p className="text-[11px] text-slate-400 mt-1">
                                Dùng để liên hệ khi nhận/trả và tra cứu phiếu mượn sau này.
                            </p>
                        </div>
                    </div>

                    {/* Section 3: Due Date & Note */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3.5">
                        <div className="border-b border-slate-100 pb-2.5">
                            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Calendar size={17} className="text-indigo-600" />
                                3. Thời Gian Trả & Ghi Chú
                            </h2>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Ngày hẹn trả thiết bị <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="date"
                                required
                                min={getTomorrowDateString()}
                                max={getMaxDueDateString()}
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full h-10 px-3 text-sm border-2 border-slate-200 rounded-lg focus:border-indigo-600 focus:outline-none"
                            />
                            <p className="text-[11px] text-slate-400 mt-1">
                                Thiết bị mượn cần được hoàn trả trước 23:59 ngày hẹn.
                            </p>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-semibold text-slate-700">
                                    Ghi chú / Mục đích sử dụng (tuỳ chọn)
                                </label>
                                <span className="text-[11px] text-slate-400">{note.length}/500</span>
                            </div>
                            <textarea
                                rows="3"
                                maxLength="500"
                                placeholder="Phục vụ sự kiện, bài tập nhóm, hội thảo..."
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="w-full p-2.5 text-sm border-2 border-slate-200 rounded-lg focus:border-indigo-600 focus:outline-none resize-none"
                            ></textarea>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={submitting}
                            disabled={totalSelectedQty === 0 || submitting}
                            className="w-full h-12 text-base font-bold bg-indigo-600 hover:bg-indigo-700 shadow-md"
                        >
                            {submitting ? 'Đang gửi yêu cầu...' : 'Gửi Đăng Ký Mượn Thiết Bị'}
                        </Button>
                    </div>
                </form>
            </main>
        </div>
    );
}

