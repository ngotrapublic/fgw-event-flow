import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
    Loader2,
    Plus,
    Minus,
    Check,
    Sparkles,
    Zap,
    SlidersHorizontal,
    Volume2,
    Tv,
    Radio,
    Cpu
} from 'lucide-react';
import { borrowApi } from '../../api/borrow';
import { borrowTokenStore } from '../../lib/borrow-token-store';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../Toast';

function getOffsetDateString(daysOffset) {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
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
    const [selectedCategory, setSelectedCategory] = useState('all');

    // Form inputs
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [dueDate, setDueDate] = useState(getOffsetDateString(1));
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

    // Categories list
    const categories = useMemo(() => {
        const set = new Set();
        resources.forEach((r) => {
            if (r.category) set.add(r.category);
        });
        return ['all', ...Array.from(set)];
    }, [resources]);

    // Filtered resources
    const filteredResources = useMemo(() => {
        if (selectedCategory === 'all') return resources;
        return resources.filter((r) => r.category === selectedCategory);
    }, [resources, selectedCategory]);

    // Stepper controls
    const incrementQty = (resourceId, maxQty) => {
        const cur = selectedItems[resourceId] || 0;
        if (cur < maxQty) {
            setSelectedItems((prev) => ({ ...prev, [resourceId]: cur + 1 }));
        }
    };

    const decrementQty = (resourceId) => {
        const cur = selectedItems[resourceId] || 0;
        if (cur <= 1) {
            setSelectedItems((prev) => {
                const copy = { ...prev };
                delete copy[resourceId];
                return copy;
            });
        } else {
            setSelectedItems((prev) => ({ ...prev, [resourceId]: cur - 1 }));
        }
    };

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

    // Quick due date shortcuts
    const setQuickDueDate = (days) => {
        setDueDate(getOffsetDateString(days));
    };

    // Submit handler
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError(null);

        const itemsPayload = Object.entries(selectedItems)
            .filter(([, qty]) => qty > 0)
            .map(([resourceId, qty]) => ({ resourceId, qty }));

        if (itemsPayload.length === 0) {
            setSubmitError('Vui lòng chọn ít nhất 1 thiết bị để mượn.');
            return;
        }

        const cleanPhone = phone.trim();
        if (!/^0\d{9}$/.test(cleanPhone)) {
            setSubmitError('Số điện thoại không hợp lệ (yêu cầu 10 chữ số, bắt đầu bằng số 0).');
            return;
        }

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

            if (accessToken) {
                borrowTokenStore.add(accessToken);
            }

            if (user) {
                showSuccess('Đã tạo phiếu mượn thành công! Đang chờ Quản trị viên duyệt.');
                navigate('/borrow');
            } else {
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
                            `"${s.label || s.resourceId}" (còn ${s.available}, yêu cầu ${s.requested})`
                    )
                    .join('; ');
                setSubmitError(`Kho không đủ số lượng cho: ${shortageDesc}.`);
            } else {
                setSubmitError(resData.error || 'Có lỗi xảy ra khi tạo yêu cầu. Vui lòng kiểm tra lại.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    // Resend verification
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

    // Guest Success Screen
    if (createdGuestRequest) {
        return (
            <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
                <div className="relative w-full max-w-md">
                    <div
                        className="absolute inset-0 rounded-3xl"
                        style={{ background: '#ec4899', transform: 'translate(8px, 8px)' }}
                    />
                    <div
                        className="absolute inset-0 rounded-3xl"
                        style={{ background: '#8b5cf6', transform: 'translate(4px, 4px)' }}
                    />

                    <div className="relative bg-white border-[3px] border-black rounded-3xl p-6 sm:p-8 text-center space-y-5">
                        <div className="absolute top-3.5 left-3.5 flex gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-violet-500 border border-black inline-block"></span>
                            <span className="w-2.5 h-2.5 rounded-full bg-pink-500 border border-black inline-block"></span>
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-black inline-block"></span>
                        </div>

                        <div className="w-16 h-16 bg-yellow-300 text-black border-2 border-black rounded-2xl flex items-center justify-center mx-auto shadow-[3px_3px_0_#000] rotate-3 mt-2">
                            <Mail size={32} strokeWidth={2.5} />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-xl font-black text-black uppercase tracking-tight">
                                Kiểm Tra Hộp Thư Email
                            </h2>
                            <p className="text-xs text-slate-600 font-medium">
                                Hệ thống vừa gửi liên kết xác nhận đăng ký mượn thiết bị đến:
                            </p>
                            <div
                                className="inline-block px-4 py-2 bg-violet-100 border-2 border-black rounded-xl font-black text-sm text-black shadow-[2px_2px_0_#000]"
                                style={{ transform: 'rotate(-1deg)' }}
                            >
                                {createdGuestRequest.email}
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-left text-xs text-slate-700 space-y-1.5 font-medium">
                            <p className="font-black text-black flex items-center gap-1.5">
                                <AlertCircle size={15} className="text-amber-500" />
                                Hướng dẫn hoàn tất:
                            </p>
                            <p>1. Nhấp vào nút <strong>Xác nhận</strong> trong email (hiệu lực 24h).</p>
                            <p>2. Kiểm tra thư mục <strong>Spam / Rác</strong> nếu không thấy ở Hộp thư đến.</p>
                            <p>3. Khi xác nhận xong, phiếu sẽ chuyển tới Quản trị viên để xét duyệt.</p>
                        </div>

                        <div className="space-y-3 pt-2">
                            <button
                                onClick={handleResend}
                                disabled={resendCooldown > 0 || isResending}
                                className="w-full py-2.5 px-4 bg-white border-2 border-black rounded-xl text-xs font-black shadow-[3px_3px_0_#000] hover:shadow-[1px_1px_0_#000] active:bg-slate-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isResending ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        Đang gửi lại...
                                    </>
                                ) : resendCooldown > 0 ? (
                                    `Gửi lại email sau (${resendCooldown}s)`
                                ) : (
                                    <>
                                        <Send size={14} />
                                        Gửi lại email xác nhận
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => navigate('/borrow')}
                                className="w-full py-3 px-4 bg-indigo-600 text-white border-2 border-black rounded-xl text-sm font-black shadow-[3px_3px_0_#000] hover:bg-indigo-700 transition-all"
                            >
                                Về Trang Chủ Mượn Thiết Bị
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fafafa] text-slate-900 pb-28">
            {/* Header */}
            <header className="bg-white border-b-2 border-black sticky top-0 z-30 shadow-sm backdrop-blur-md bg-white/95">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/borrow')}
                            className="p-2 -ml-1.5 rounded-xl border-2 border-black bg-white hover:bg-slate-100 shadow-[2px_2px_0_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all"
                            title="Quay lại"
                        >
                            <ArrowLeft size={18} strokeWidth={2.5} />
                        </button>
                        <div>
                            <h1 className="text-base font-black tracking-tight text-black uppercase">
                                Đăng Ký Mượn Thiết Bị
                            </h1>
                            <p className="text-[11px] font-bold text-slate-500">
                                Phiếu mượn điện tử • Kho A102
                            </p>
                        </div>
                    </div>

                    <div className="text-right">
                        <span className="text-xs font-black bg-yellow-300 text-black px-2.5 py-1 rounded-xl border-2 border-black shadow-[2px_2px_0_#000]">
                            {totalSelectedQty} món đã chọn
                        </span>
                    </div>
                </div>
            </header>

            {/* Form */}
            <main className="max-w-2xl mx-auto px-4 pt-5">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Error Banner */}
                    {submitError && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 bg-rose-100 border-2 border-black rounded-2xl shadow-[4px_4px_0_#000] text-rose-950 text-xs font-bold flex items-start gap-3"
                        >
                            <AlertCircle size={18} className="text-rose-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">{submitError}</div>
                        </motion.div>
                    )}

                    {/* Section 1: Equipment Selection */}
                    <div className="bg-white border-2 border-black rounded-3xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
                        <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-yellow-300 border-2 border-black font-black text-xs flex items-center justify-center shadow-[1px_1px_0_#000]">
                                    1
                                </span>
                                <h2 className="text-sm font-black text-black uppercase tracking-wider">
                                    Chọn Thiết Bị Cần Dùng
                                </h2>
                            </div>
                        </div>

                        {/* Category filter pills */}
                        {categories.length > 2 && (
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold no-scrollbar">
                                {categories.map((cat) => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-3 py-1 rounded-xl border border-black shadow-[1px_1px_0_#000] transition-colors whitespace-nowrap ${
                                            selectedCategory === cat
                                                ? 'bg-black text-white font-black'
                                                : 'bg-white text-slate-700 hover:bg-slate-100'
                                        }`}
                                    >
                                        {cat === 'all' ? 'Tất cả' : cat}
                                    </button>
                                ))}
                            </div>
                        )}

                        {loadingResources ? (
                            <div className="py-10 text-center space-y-2">
                                <Loader2 size={28} className="animate-spin text-indigo-600 mx-auto" />
                                <p className="text-xs font-bold text-slate-500">
                                    Đang kiểm tra tồn kho thiết bị...
                                </p>
                            </div>
                        ) : filteredResources.length === 0 ? (
                            <div className="p-6 text-center text-xs font-bold text-slate-500">
                                Không có thiết bị nào trong phân loại này.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2.5">
                                {filteredResources.map((res) => {
                                    const isAvailable = res.availableQty > 0;
                                    const isSelected = !!selectedItems[res.id];
                                    const currentQty = selectedItems[res.id] || 0;

                                    return (
                                        <div
                                            key={res.id}
                                            className={`p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 ${
                                                isSelected
                                                    ? 'bg-violet-50 border-black shadow-[3px_3px_0_#000] translate-x-[-1px] translate-y-[-1px]'
                                                    : isAvailable
                                                    ? 'bg-white border-slate-200 hover:border-black hover:shadow-[2px_2px_0_#000]'
                                                    : 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed'
                                            }`}
                                        >
                                            <div
                                                onClick={() =>
                                                    handleToggleResource(res.id, res.availableQty)
                                                }
                                                className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                                            >
                                                <div
                                                    className={`w-6 h-6 rounded-lg border-2 border-black flex items-center justify-center flex-shrink-0 transition-colors shadow-[1px_1px_0_#000] ${
                                                        isSelected ? 'bg-violet-600 text-white' : 'bg-white'
                                                    }`}
                                                >
                                                    {isSelected && <Check size={14} strokeWidth={3} />}
                                                </div>

                                                <div className="min-w-0">
                                                    <p className="text-sm font-black text-black truncate">
                                                        {res.label}
                                                    </p>
                                                    <p className="text-[11px] font-bold text-slate-500">
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
                                            </div>

                                            {/* Stepper */}
                                            {isSelected && isAvailable && (
                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => decrementQty(res.id)}
                                                        className="w-8 h-8 rounded-lg bg-white border-2 border-black font-black flex items-center justify-center shadow-[2px_2px_0_#000] hover:bg-slate-100 active:translate-x-[1px] active:translate-y-[1px] transition-all"
                                                    >
                                                        <Minus size={14} strokeWidth={3} />
                                                    </button>
                                                    <span className="w-10 h-8 flex items-center justify-center font-mono font-black text-sm bg-white border-2 border-black rounded-lg">
                                                        {currentQty}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => incrementQty(res.id, res.availableQty)}
                                                        disabled={currentQty >= res.availableQty}
                                                        className="w-8 h-8 rounded-lg bg-yellow-300 border-2 border-black font-black flex items-center justify-center shadow-[2px_2px_0_#000] hover:bg-yellow-400 active:translate-x-[1px] active:translate-y-[1px] transition-all disabled:opacity-40"
                                                    >
                                                        <Plus size={14} strokeWidth={3} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Section 2: Borrower Information */}
                    <div className="bg-white border-2 border-black rounded-3xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
                        <div className="flex items-center gap-2 border-b-2 border-slate-100 pb-3">
                            <span className="w-6 h-6 rounded-lg bg-cyan-300 border-2 border-black font-black text-xs flex items-center justify-center shadow-[1px_1px_0_#000]">
                                2
                            </span>
                            <h2 className="text-sm font-black text-black uppercase tracking-wider">
                                Thông Tin Người Mượn
                            </h2>
                        </div>

                        {user ? (
                            <div className="p-4 bg-violet-50 border-2 border-black rounded-2xl space-y-1 shadow-[2px_2px_0_#000]">
                                <p className="font-black text-xs text-black">
                                    Đang mượn bằng tài khoản: {user.name || user.email}
                                </p>
                                <p className="text-xs font-bold text-violet-700">Email: {user.email}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                                        Họ và tên <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ví dụ: Nguyễn Văn A"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full h-11 px-3.5 text-sm font-bold border-2 border-black rounded-xl bg-white shadow-[3px_3px_0_#000] focus:shadow-[1px_1px_0_#000] focus:translate-x-[1px] focus:translate-y-[1px] focus:outline-none transition-all placeholder:font-normal placeholder:text-slate-400"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                                        Email nhận thông báo <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="email@fpt.edu.vn"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full h-11 px-3.5 text-sm font-bold border-2 border-black rounded-xl bg-white shadow-[3px_3px_0_#000] focus:shadow-[1px_1px_0_#000] focus:translate-x-[1px] focus:translate-y-[1px] focus:outline-none transition-all placeholder:font-normal placeholder:text-slate-400"
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                                Số điện thoại liên hệ <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="tel"
                                required
                                placeholder="0901234567"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full h-11 px-3.5 text-sm font-bold border-2 border-black rounded-xl bg-white shadow-[3px_3px_0_#000] focus:shadow-[1px_1px_0_#000] focus:translate-x-[1px] focus:translate-y-[1px] focus:outline-none transition-all placeholder:font-normal placeholder:text-slate-400"
                            />
                            <p className="text-[11px] font-medium text-slate-400 mt-1">
                                Dùng để liên hệ nhận/trả và tra cứu phiếu mượn qua mã OTP sau này.
                            </p>
                        </div>
                    </div>

                    {/* Section 3: Due Date & Note */}
                    <div className="bg-white border-2 border-black rounded-3xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
                        <div className="flex items-center gap-2 border-b-2 border-slate-100 pb-3">
                            <span className="w-6 h-6 rounded-lg bg-pink-300 border-2 border-black font-black text-xs flex items-center justify-center shadow-[1px_1px_0_#000]">
                                3
                            </span>
                            <h2 className="text-sm font-black text-black uppercase tracking-wider">
                                Thời Gian & Ghi Chú
                            </h2>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                                    Ngày hẹn trả thiết bị <span className="text-rose-500">*</span>
                                </label>
                                <span className="text-[11px] font-bold text-indigo-700">
                                    Chọn nhanh:
                                </span>
                            </div>

                            {/* Quick Date Chips */}
                            <div className="flex items-center gap-2 mb-2.5 overflow-x-auto pb-1 text-xs font-bold no-scrollbar">
                                <button
                                    type="button"
                                    onClick={() => setQuickDueDate(1)}
                                    className={`px-3 py-1 rounded-xl border border-black shadow-[1px_1px_0_#000] ${
                                        dueDate === getOffsetDateString(1)
                                            ? 'bg-yellow-300 text-black font-black'
                                            : 'bg-white hover:bg-slate-50'
                                    }`}
                                >
                                    Ngày mai (+1d)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setQuickDueDate(2)}
                                    className={`px-3 py-1 rounded-xl border border-black shadow-[1px_1px_0_#000] ${
                                        dueDate === getOffsetDateString(2)
                                            ? 'bg-yellow-300 text-black font-black'
                                            : 'bg-white hover:bg-slate-50'
                                    }`}
                                >
                                    2 ngày (+2d)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setQuickDueDate(3)}
                                    className={`px-3 py-1 rounded-xl border border-black shadow-[1px_1px_0_#000] ${
                                        dueDate === getOffsetDateString(3)
                                            ? 'bg-yellow-300 text-black font-black'
                                            : 'bg-white hover:bg-slate-50'
                                    }`}
                                >
                                    3 ngày (+3d)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setQuickDueDate(7)}
                                    className={`px-3 py-1 rounded-xl border border-black shadow-[1px_1px_0_#000] ${
                                        dueDate === getOffsetDateString(7)
                                            ? 'bg-yellow-300 text-black font-black'
                                            : 'bg-white hover:bg-slate-50'
                                    }`}
                                >
                                    1 tuần (+7d)
                                </button>
                            </div>

                            <input
                                type="date"
                                required
                                min={getOffsetDateString(1)}
                                max={getMaxDueDateString()}
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full h-11 px-3.5 text-sm font-bold border-2 border-black rounded-xl bg-white shadow-[3px_3px_0_#000] focus:shadow-[1px_1px_0_#000] focus:translate-x-[1px] focus:translate-y-[1px] focus:outline-none transition-all cursor-pointer"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                                    Mục đích sử dụng / Ghi chú (tuỳ chọn)
                                </label>
                                <span className="text-[10px] font-black bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                                    {note.length}/500
                                </span>
                            </div>
                            <textarea
                                rows="3"
                                maxLength="500"
                                placeholder="Phục vụ sự kiện CLB, bài tập nhóm, hội thảo..."
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="w-full p-3 text-sm font-medium border-2 border-black rounded-xl bg-white shadow-[3px_3px_0_#000] focus:shadow-[1px_1px_0_#000] focus:translate-x-[1px] focus:translate-y-[1px] focus:outline-none transition-all resize-none placeholder:text-slate-400"
                            ></textarea>
                        </div>
                    </div>

                    {/* Sticky Bottom Action Bar */}
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t-2 border-black z-30 shadow-lg">
                        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
                            <div className="hidden sm:block">
                                <p className="text-xs font-bold text-slate-500">Tổng cộng đăng ký:</p>
                                <p className="text-base font-black text-black">
                                    {totalSelectedQty} thiết bị
                                </p>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                disabled={totalSelectedQty === 0 || submitting}
                                className="flex-1 sm:flex-none sm:w-80 py-3.5 px-6 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-sm border-2 border-black rounded-2xl shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Đang gửi phiếu...
                                    </>
                                ) : (
                                    <>
                                        <Send size={16} strokeWidth={2.5} />
                                        HOÀN TẤT ĐĂNG KÝ ({totalSelectedQty} MÓN)
                                    </>
                                )}
                            </motion.button>
                        </div>
                    </div>
                </form>
            </main>
        </div>
    );
}
