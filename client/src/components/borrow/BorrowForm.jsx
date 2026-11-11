import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
    ArrowLeft,
    Mail,
    AlertCircle,
    Send,
    Loader2,
    Plus,
    Minus,
    Check,
    RefreshCw
} from 'lucide-react';
import { borrowApi } from '../../api/borrow';
import { borrowTokenStore } from '../../lib/borrow-token-store';
import {
    getVnOffsetDateStr,
    getVnMaxDueDateStr,
    normalizePhoneInput,
    formatVnDueDate
} from '../../lib/borrow-utils';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../Toast';

export default function BorrowForm() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();
    const shouldReduceMotion = useReducedMotion();

    // Resources from API (loading / error / empty / success separated)
    const [resources, setResources] = useState([]);
    const [loadingResources, setLoadingResources] = useState(true);
    const [resourcesError, setResourcesError] = useState(null);

    // Selected quantities: { [resourceId]: qty }
    const [selectedItems, setSelectedItems] = useState({});
    const [selectedCategory, setSelectedCategory] = useState('all');

    // Form inputs
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [dueDate, setDueDate] = useState(() => getVnOffsetDateStr(1));
    const [note, setNote] = useState('');

    // Validation & submit state
    const [fieldErrors, setFieldErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [createdGuestRequest, setCreatedGuestRequest] = useState(null);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [isResending, setIsResending] = useState(false);

    // Refs for focusing first invalid field on submit
    const itemsFirstButtonRef = useRef(null);
    const nameInputRef = useRef(null);
    const emailInputRef = useRef(null);
    const phoneInputRef = useRef(null);
    const dueDateInputRef = useRef(null);
    const noteInputRef = useRef(null);

    const loadResources = useCallback(async () => {
        setLoadingResources(true);
        setResourcesError(null);
        try {
            const res = await borrowApi.getResources();
            setResources(res.data || []);
        } catch (err) {
            console.error('[BORROW FORM] Error fetching resources:', err);
            const msg = 'Không thể tải danh mục thiết bị. Vui lòng kiểm tra kết nối và thử lại.';
            setResourcesError(msg);
            showError(msg);
        } finally {
            setLoadingResources(false);
        }
    }, [showError]);

    useEffect(() => {
        loadResources();
    }, [loadResources]);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => {
            setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    const totalSelectedQty = useMemo(() => {
        return Object.values(selectedItems).reduce((acc, qty) => acc + (qty > 0 ? qty : 0), 0);
    }, [selectedItems]);

    const categories = useMemo(() => {
        const set = new Set();
        resources.forEach((r) => {
            if (r.category) set.add(r.category);
        });
        return ['all', ...Array.from(set)];
    }, [resources]);

    const filteredResources = useMemo(() => {
        if (selectedCategory === 'all') return resources;
        return resources.filter((r) => r.category === selectedCategory);
    }, [resources, selectedCategory]);

    const clearFieldError = (field) => {
        setFieldErrors((prev) => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const incrementQty = (resourceId, maxQty) => {
        const cur = selectedItems[resourceId] || 0;
        if (cur < maxQty) {
            setSelectedItems((prev) => ({ ...prev, [resourceId]: cur + 1 }));
            clearFieldError('items');
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
        clearFieldError('items');
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

    const setQuickDueDate = (days) => {
        clearFieldError('dueDate');
        setDueDate(getVnOffsetDateStr(days));
    };

    const validateForm = () => {
        const errors = {};
        const itemsPayload = Object.entries(selectedItems)
            .filter(([, qty]) => qty > 0)
            .map(([resourceId, qty]) => ({ resourceId, qty }));

        if (itemsPayload.length === 0) {
            errors.items = 'Vui lòng chọn ít nhất 1 thiết bị để mượn.';
        }

        if (!user) {
            const cleanName = name.trim();
            const cleanEmail = email.trim();
            if (cleanName.length < 2 || cleanName.length > 80) {
                errors.name = 'Họ và tên phải từ 2 đến 80 ký tự.';
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
                errors.email = 'Địa chỉ email không đúng định dạng.';
            }
        }

        const cleanPhone = normalizePhoneInput(phone);
        if (!/^0\d{9}$/.test(cleanPhone)) {
            errors.phone = 'Số điện thoại không hợp lệ (gồm 10 chữ số, bắt đầu bằng số 0).';
        }

        const minDate = getVnOffsetDateStr(1);
        const maxDate = getVnMaxDueDateStr();
        if (!dueDate) {
            errors.dueDate = 'Vui lòng chọn ngày hẹn trả thiết bị.';
        } else if (dueDate < minDate) {
            errors.dueDate = 'Hạn trả phải từ ngày mai trở đi (theo giờ Việt Nam).';
        } else if (dueDate > maxDate) {
            errors.dueDate = 'Hạn trả không được vượt quá 365 ngày.';
        }

        if (note.trim().length > 500) {
            errors.note = 'Ghi chú không được vượt quá 500 ký tự.';
        }

        return { errors, itemsPayload, cleanPhone };
    };

    const focusFirstInvalidField = (errors) => {
        const order = [
            ['items', itemsFirstButtonRef],
            ['name', nameInputRef],
            ['email', emailInputRef],
            ['phone', phoneInputRef],
            ['dueDate', dueDateInputRef],
            ['note', noteInputRef]
        ];
        for (const [key, ref] of order) {
            if (errors[key] && ref.current) {
                ref.current.scrollIntoView?.({
                    behavior: shouldReduceMotion ? 'auto' : 'smooth',
                    block: 'center'
                });
                ref.current.focus?.();
                break;
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError(null);

        const { errors, itemsPayload, cleanPhone } = validateForm();
        setFieldErrors(errors);

        if (Object.keys(errors).length > 0) {
            setSubmitError('Vui lòng kiểm tra lại các thông tin còn thiếu hoặc chưa hợp lệ.');
            focusFirstInvalidField(errors);
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
            const { request } = res.data || {};
            borrowTokenStore.purgeLegacy();

            if (user) {
                showSuccess('Đã tạo phiếu mượn thành công! Đang chờ Quản trị viên duyệt.');
                navigate('/borrow');
            } else {
                setCreatedGuestRequest({
                    request,
                    email: email.trim().toLowerCase()
                });
                setResendCooldown(60);
            }
        } catch (err) {
            console.error('[BORROW FORM] Submission error:', err);
            const resData = err.response?.data || {};
            const serverField = resData.details?.field;

            if (serverField && resData.error) {
                const nextErr = { [serverField]: resData.error };
                setFieldErrors(nextErr);
                focusFirstInvalidField(nextErr);
            }

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

    const handleResend = async () => {
        if (!createdGuestRequest || resendCooldown > 0) return;
        setIsResending(true);
        try {
            await borrowApi.resendVerification(createdGuestRequest.request.id);
            showSuccess('Đã gửi lại email xác nhận thành công!');
            setResendCooldown(60);
        } catch (err) {
            showError(err.response?.data?.error || 'Không thể gửi lại email xác nhận.');
        } finally {
            setIsResending(false);
        }
    };

    const minDateStr = getVnOffsetDateStr(1);
    const maxDateStr = getVnMaxDueDateStr();
    const firstAvailableIndex = filteredResources.findIndex((r) => r.availableQty > 0);

    // Guest Success Screen
    if (createdGuestRequest) {
        return (
            <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
                <div className="relative w-full max-w-md">
                    <div
                        aria-hidden="true"
                        className="hidden sm:block absolute inset-0 rounded-3xl"
                        style={{ background: '#ec4899', transform: 'translate(8px, 8px)' }}
                    />
                    <div
                        aria-hidden="true"
                        className="hidden sm:block absolute inset-0 rounded-3xl"
                        style={{ background: '#8b5cf6', transform: 'translate(4px, 4px)' }}
                    />

                    <div className="relative bg-white border-[3px] border-black rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-[4px_4px_0_#000] sm:shadow-none">
                        <div className="hidden sm:flex absolute top-3.5 left-3.5 gap-1" aria-hidden="true">
                            <span className="w-2.5 h-2.5 rounded-full bg-violet-500 border border-black inline-block" />
                            <span className="w-2.5 h-2.5 rounded-full bg-pink-500 border border-black inline-block" />
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-black inline-block" />
                        </div>

                        <div className="w-16 h-16 bg-yellow-300 text-black border-2 border-black rounded-2xl flex items-center justify-center mx-auto shadow-[3px_3px_0_#000] mt-2">
                            <Mail size={32} strokeWidth={2.5} aria-hidden="true" />
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-xl font-black text-black uppercase tracking-tight">
                                Kiểm Tra Hộp Thư Email
                            </h1>
                            <p className="text-sm text-slate-600 font-medium">
                                Hệ thống vừa gửi liên kết xác nhận đăng ký mượn thiết bị đến:
                            </p>
                            <div className="inline-block px-4 py-2 bg-violet-100 border-2 border-black rounded-xl font-black text-sm text-black shadow-[2px_2px_0_#000]">
                                {createdGuestRequest.email}
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-2 border-slate-300 rounded-2xl text-left text-xs text-slate-700 space-y-1.5 font-medium">
                            <p className="font-black text-black flex items-center gap-1.5">
                                <AlertCircle size={15} className="text-amber-600" aria-hidden="true" />
                                Hướng dẫn hoàn tất:
                            </p>
                            <p>1. Nhấp vào nút <strong>Xác nhận</strong> trong email (hiệu lực 24h).</p>
                            <p>2. Kiểm tra thư mục <strong>Spam / Rác</strong> nếu không thấy ở Hộp thư đến.</p>
                            <p>3. Gửi yêu cầu không đồng nghĩa đã giữ thiết bị — kho chỉ giữ thiết bị sau khi Quản trị viên duyệt.</p>
                        </div>

                        <div className="space-y-3 pt-2">
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={resendCooldown > 0 || isResending}
                                className="w-full min-h-[44px] py-2.5 px-4 bg-white border-2 border-black rounded-xl text-xs font-black shadow-[3px_3px_0_#000] hover:bg-slate-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isResending ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                                        Đang gửi lại...
                                    </>
                                ) : resendCooldown > 0 ? (
                                    `Gửi lại email sau (${resendCooldown}s)`
                                ) : (
                                    <>
                                        <Send size={14} aria-hidden="true" />
                                        Gửi lại email xác nhận
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate('/borrow')}
                                className="w-full min-h-[44px] py-3 px-4 bg-indigo-600 text-white border-2 border-black rounded-xl text-sm font-black shadow-[3px_3px_0_#000] hover:bg-indigo-700 transition-all"
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
            <header className="bg-white border-b-2 border-black sticky top-0 z-30 shadow-sm">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            type="button"
                            onClick={() => navigate('/borrow')}
                            aria-label="Quay lại trang chủ mượn thiết bị"
                            className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center -ml-1 rounded-xl border-2 border-black bg-white hover:bg-slate-100 shadow-[2px_2px_0_#000] transition-all flex-shrink-0"
                        >
                            <ArrowLeft size={18} strokeWidth={2.5} aria-hidden="true" />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-base font-black tracking-tight text-black uppercase truncate">
                                Đăng Ký Mượn Thiết Bị
                            </h1>
                            <p className="text-xs font-bold text-slate-600 truncate">
                                Phòng IT - Floor 2 - Campus HCM
                            </p>
                        </div>
                    </div>

                    <div className="flex-shrink-0">
                        <span className="text-xs font-black bg-yellow-300 text-black px-2.5 py-1.5 rounded-xl border-2 border-black shadow-[2px_2px_0_#000]">
                            {totalSelectedQty} món
                        </span>
                    </div>
                </div>
            </header>

            {/* Form */}
            <main className="max-w-2xl mx-auto px-4 pt-5">
                <form onSubmit={handleSubmit} noValidate className="space-y-6">
                    {/* Top-level Error Banner */}
                    {submitError && (
                        <div
                            role="alert"
                            aria-live="assertive"
                            className="p-4 bg-rose-100 border-2 border-black rounded-2xl shadow-[4px_4px_0_#000] text-rose-950 text-xs font-bold flex items-start gap-3"
                        >
                            <AlertCircle size={18} className="text-rose-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
                            <div className="flex-1">{submitError}</div>
                        </div>
                    )}

                    {/* Section 1: Equipment Selection */}
                    <section
                        aria-labelledby="section-equipment-title"
                        aria-invalid={Boolean(fieldErrors.items)}
                        aria-describedby={fieldErrors.items ? 'borrow-items-error' : undefined}
                        className="bg-white border-2 border-black rounded-3xl p-4 sm:p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4"
                    >
                        <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <span
                                    aria-hidden="true"
                                    className="w-6 h-6 rounded-lg bg-yellow-300 border-2 border-black font-black text-xs flex items-center justify-center shadow-[1px_1px_0_#000]"
                                >
                                    1
                                </span>
                                <h2 id="section-equipment-title" className="text-sm font-black text-black uppercase tracking-wider">
                                    Chọn Thiết Bị Cần Dùng <span className="text-rose-600">*</span>
                                </h2>
                            </div>
                        </div>

                        {/* Category filter pills */}
                        {categories.length > 2 && !loadingResources && !resourcesError && (
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
                                {categories.map((cat) => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setSelectedCategory(cat)}
                                        aria-pressed={selectedCategory === cat}
                                        className={`min-h-[44px] px-3.5 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0_#000] transition-colors whitespace-nowrap ${
                                            selectedCategory === cat
                                                ? 'bg-black text-white font-black'
                                                : 'bg-white text-slate-800 hover:bg-slate-100'
                                        }`}
                                    >
                                        {cat === 'all' ? 'Tất cả' : cat}
                                    </button>
                                ))}
                            </div>
                        )}

                        {loadingResources ? (
                            <div role="status" className="py-10 text-center space-y-2">
                                <Loader2 size={28} className="animate-spin motion-reduce:animate-none text-indigo-600 mx-auto" aria-hidden="true" />
                                <p className="text-xs font-bold text-slate-600">
                                    Đang kiểm tra tồn kho thiết bị...
                                </p>
                            </div>
                        ) : resourcesError ? (
                            <div
                                role="alert"
                                className="p-5 bg-rose-50 border-2 border-black rounded-2xl text-center space-y-3"
                            >
                                <AlertCircle size={28} className="text-rose-700 mx-auto" aria-hidden="true" />
                                <p className="text-sm font-bold text-rose-950">{resourcesError}</p>
                                <button
                                    type="button"
                                    onClick={loadResources}
                                    className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-black rounded-xl text-xs font-black shadow-[2px_2px_0_#000] hover:bg-slate-100"
                                >
                                    <RefreshCw size={14} aria-hidden="true" />
                                    Thử lại
                                </button>
                            </div>
                        ) : filteredResources.length === 0 ? (
                            <div className="p-6 text-center text-xs font-bold text-slate-600">
                                Không có thiết bị nào trong phân loại này.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2.5">
                                {filteredResources.map((res, idx) => {
                                    const isAvailable = res.availableQty > 0;
                                    const isSelected = Boolean(selectedItems[res.id]);
                                    const currentQty = selectedItems[res.id] || 0;
                                    const isFirstTarget =
                                        idx === firstAvailableIndex || (firstAvailableIndex === -1 && idx === 0);

                                    return (
                                        <div
                                            key={res.id}
                                            className={`p-3 rounded-2xl border-2 transition-colors flex items-center justify-between gap-2.5 ${
                                                isSelected
                                                    ? 'bg-violet-50 border-black shadow-[3px_3px_0_#000]'
                                                    : isAvailable
                                                    ? 'bg-white border-slate-300 hover:border-black'
                                                    : 'bg-slate-100 border-slate-300'
                                            }`}
                                        >
                                            <button
                                                ref={isFirstTarget ? itemsFirstButtonRef : undefined}
                                                type="button"
                                                role="checkbox"
                                                aria-checked={isSelected}
                                                disabled={!isAvailable}
                                                onClick={() => handleToggleResource(res.id, res.availableQty)}
                                                className={`min-h-[44px] flex items-center gap-3 flex-1 min-w-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-xl ${
                                                    isAvailable ? 'cursor-pointer' : 'cursor-not-allowed'
                                                }`}
                                            >
                                                <span
                                                    aria-hidden="true"
                                                    className={`w-6 h-6 rounded-lg border-2 border-black flex items-center justify-center flex-shrink-0 transition-colors shadow-[1px_1px_0_#000] ${
                                                        isSelected
                                                            ? 'bg-violet-600 text-white'
                                                            : isAvailable
                                                            ? 'bg-white'
                                                            : 'bg-slate-200 border-slate-500'
                                                    }`}
                                                >
                                                    {isSelected && <Check size={14} strokeWidth={3} />}
                                                </span>

                                                <span className="min-w-0 block flex-1">
                                                    <span className="text-sm font-black text-black truncate flex items-center gap-2">
                                                        <span className="truncate">{res.label}</span>
                                                        {!isAvailable && (
                                                            <span className="flex-shrink-0 inline-block px-2 py-0.5 bg-rose-100 text-rose-900 border border-rose-400 rounded-md text-xs font-black">
                                                                Hết hàng
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-600 block mt-0.5">
                                                        {res.category || 'Thiết bị'} • Còn sẵn:{' '}
                                                        <strong className={isAvailable ? 'text-emerald-800' : 'text-rose-700'}>
                                                            {res.availableQty}
                                                        </strong>
                                                    </span>
                                                </span>
                                            </button>

                                            {/* Sibling Stepper (never nested inside checkbox button) */}
                                            {isSelected && isAvailable && (
                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => decrementQty(res.id)}
                                                        aria-label={`Giảm số lượng ${res.label}`}
                                                        className="w-11 h-11 rounded-xl bg-white border-2 border-black font-black flex items-center justify-center shadow-[2px_2px_0_#000] hover:bg-slate-100 transition-colors"
                                                    >
                                                        <Minus size={16} strokeWidth={3} aria-hidden="true" />
                                                    </button>
                                                    <span
                                                        aria-label={`Số lượng đã chọn cho ${res.label}: ${currentQty}`}
                                                        className="w-10 h-11 flex items-center justify-center font-mono font-black text-sm bg-white border-2 border-black rounded-xl"
                                                    >
                                                        {currentQty}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => incrementQty(res.id, res.availableQty)}
                                                        disabled={currentQty >= res.availableQty}
                                                        aria-label={`Tăng số lượng ${res.label}`}
                                                        className="w-11 h-11 rounded-xl bg-yellow-300 border-2 border-black font-black flex items-center justify-center shadow-[2px_2px_0_#000] hover:bg-yellow-400 transition-colors disabled:opacity-40"
                                                    >
                                                        <Plus size={16} strokeWidth={3} aria-hidden="true" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {fieldErrors.items && (
                            <p id="borrow-items-error" role="alert" className="text-xs font-bold text-rose-700">
                                {fieldErrors.items}
                            </p>
                        )}
                    </section>

                    {/* Section 2: Borrower Information */}
                    <section
                        aria-labelledby="section-borrower-title"
                        className="bg-white border-2 border-black rounded-3xl p-4 sm:p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4"
                    >
                        <div className="flex items-center gap-2 border-b-2 border-slate-100 pb-3">
                            <span
                                aria-hidden="true"
                                className="w-6 h-6 rounded-lg bg-cyan-300 border-2 border-black font-black text-xs flex items-center justify-center shadow-[1px_1px_0_#000]"
                            >
                                2
                            </span>
                            <h2 id="section-borrower-title" className="text-sm font-black text-black uppercase tracking-wider">
                                Thông Tin Người Mượn
                            </h2>
                        </div>

                        {user ? (
                            <div className="space-y-3">
                                <div className="p-4 bg-violet-50 border-2 border-black rounded-2xl space-y-1 shadow-[2px_2px_0_#000]">
                                    <p className="font-black text-xs text-black">
                                        Đang mượn bằng tài khoản: {user.name || user.email}
                                    </p>
                                    <p className="text-xs font-bold text-violet-800">Email: {user.email}</p>
                                </div>
                                {/@fgw-event\.com$/i.test(user.email || '') && (
                                    <div className="p-3.5 bg-amber-100 border-2 border-black rounded-2xl text-xs text-amber-950 font-medium flex items-start gap-2 shadow-[2px_2px_0_#000]">
                                        <AlertCircle size={16} className="text-amber-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
                                        <span>
                                            Tài khoản nội bộ (<strong>{user.email}</strong>) không có hộp thư thật
                                            nên sẽ không nhận được email duyệt phiếu hay mã OTP tra cứu. Nếu muốn
                                            nhận OTP qua email thật, hãy đăng nhập bằng email thật hoặc đăng xuất để
                                            mượn dưới dạng Khách.
                                        </span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label
                                        htmlFor="borrow-name"
                                        className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5"
                                    >
                                        Họ và tên <span className="text-rose-600">*</span>
                                    </label>
                                    <input
                                        ref={nameInputRef}
                                        id="borrow-name"
                                        name="name"
                                        type="text"
                                        autoComplete="name"
                                        required
                                        aria-required="true"
                                        aria-invalid={Boolean(fieldErrors.name)}
                                        aria-describedby={fieldErrors.name ? 'borrow-name-error' : undefined}
                                        placeholder="Ví dụ: Nguyễn Văn A"
                                        value={name}
                                        onChange={(e) => {
                                            setName(e.target.value);
                                            clearFieldError('name');
                                        }}
                                        className={`w-full h-11 px-3.5 text-sm font-bold border-2 rounded-xl bg-white shadow-[3px_3px_0_#000] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 transition-all placeholder:font-normal placeholder:text-slate-500 ${
                                            fieldErrors.name ? 'border-rose-600 bg-rose-50' : 'border-black'
                                        }`}
                                    />
                                    {fieldErrors.name && (
                                        <p id="borrow-name-error" role="alert" className="text-xs font-bold text-rose-700 mt-1.5">
                                            {fieldErrors.name}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label
                                        htmlFor="borrow-email"
                                        className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5"
                                    >
                                        Email nhận thông báo <span className="text-rose-600">*</span>
                                    </label>
                                    <input
                                        ref={emailInputRef}
                                        id="borrow-email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        aria-required="true"
                                        aria-invalid={Boolean(fieldErrors.email)}
                                        aria-describedby={fieldErrors.email ? 'borrow-email-error' : undefined}
                                        placeholder="email@fpt.edu.vn"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            clearFieldError('email');
                                        }}
                                        className={`w-full h-11 px-3.5 text-sm font-bold border-2 rounded-xl bg-white shadow-[3px_3px_0_#000] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 transition-all placeholder:font-normal placeholder:text-slate-500 ${
                                            fieldErrors.email ? 'border-rose-600 bg-rose-50' : 'border-black'
                                        }`}
                                    />
                                    {fieldErrors.email && (
                                        <p id="borrow-email-error" role="alert" className="text-xs font-bold text-rose-700 mt-1.5">
                                            {fieldErrors.email}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        <div>
                            <label
                                htmlFor="borrow-phone"
                                className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5"
                            >
                                Số điện thoại liên hệ <span className="text-rose-600">*</span>
                            </label>
                            <input
                                ref={phoneInputRef}
                                id="borrow-phone"
                                name="phone"
                                type="tel"
                                autoComplete="tel"
                                required
                                aria-required="true"
                                aria-invalid={Boolean(fieldErrors.phone)}
                                aria-describedby={
                                    fieldErrors.phone
                                        ? 'borrow-phone-error borrow-phone-help'
                                        : 'borrow-phone-help'
                                }
                                placeholder="0901234567"
                                value={phone}
                                onChange={(e) => {
                                    setPhone(e.target.value);
                                    clearFieldError('phone');
                                }}
                                className={`w-full h-11 px-3.5 text-sm font-bold border-2 rounded-xl bg-white shadow-[3px_3px_0_#000] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 transition-all placeholder:font-normal placeholder:text-slate-500 ${
                                    fieldErrors.phone ? 'border-rose-600 bg-rose-50' : 'border-black'
                                }`}
                            />
                            {fieldErrors.phone && (
                                <p id="borrow-phone-error" role="alert" className="text-xs font-bold text-rose-700 mt-1.5">
                                    {fieldErrors.phone}
                                </p>
                            )}
                            <p id="borrow-phone-help" className="text-xs font-medium text-slate-600 mt-1.5">
                                Dùng để liên hệ nhận/trả và tra cứu phiếu mượn qua mã OTP sau này.
                            </p>
                        </div>
                    </section>

                    {/* Section 3: Due Date & Note */}
                    <section
                        aria-labelledby="section-schedule-title"
                        className="bg-white border-2 border-black rounded-3xl p-4 sm:p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4"
                    >
                        <div className="flex items-center gap-2 border-b-2 border-slate-100 pb-3">
                            <span
                                aria-hidden="true"
                                className="w-6 h-6 rounded-lg bg-pink-300 border-2 border-black font-black text-xs flex items-center justify-center shadow-[1px_1px_0_#000]"
                            >
                                3
                            </span>
                            <h2 id="section-schedule-title" className="text-sm font-black text-black uppercase tracking-wider">
                                Thời Gian & Ghi Chú
                            </h2>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label
                                    htmlFor="borrow-due-date"
                                    className="text-xs font-black uppercase tracking-wider text-slate-700"
                                >
                                    Ngày hẹn trả thiết bị <span className="text-rose-600">*</span>
                                </label>
                                <span className="text-xs font-bold text-indigo-700">Chọn nhanh:</span>
                            </div>

                            {/* Quick Date Chips (>=44px touch targets) */}
                            <div className="flex items-center gap-2 mb-2.5 overflow-x-auto pb-1 text-xs font-bold">
                                {[
                                    { days: 1, label: 'Ngày mai (+1d)' },
                                    { days: 2, label: '2 ngày (+2d)' },
                                    { days: 3, label: '3 ngày (+3d)' },
                                    { days: 7, label: '1 tuần (+7d)' }
                                ].map((opt) => {
                                    const active = dueDate === getVnOffsetDateStr(opt.days);
                                    return (
                                        <button
                                            key={opt.days}
                                            type="button"
                                            onClick={() => setQuickDueDate(opt.days)}
                                            aria-pressed={active}
                                            className={`min-h-[44px] px-3.5 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0_#000] whitespace-nowrap transition-colors ${
                                                active
                                                    ? 'bg-yellow-300 text-black font-black'
                                                    : 'bg-white text-slate-800 hover:bg-slate-50'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    );
                                })}
                            </div>

                            <input
                                ref={dueDateInputRef}
                                id="borrow-due-date"
                                name="dueDate"
                                type="date"
                                required
                                aria-required="true"
                                aria-invalid={Boolean(fieldErrors.dueDate)}
                                aria-describedby={
                                    fieldErrors.dueDate
                                        ? 'borrow-due-error borrow-due-preview'
                                        : 'borrow-due-preview'
                                }
                                min={minDateStr}
                                max={maxDateStr}
                                value={dueDate}
                                onChange={(e) => {
                                    setDueDate(e.target.value);
                                    clearFieldError('dueDate');
                                }}
                                className={`w-full h-11 px-3.5 text-sm font-bold border-2 rounded-xl bg-white shadow-[3px_3px_0_#000] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 transition-all cursor-pointer ${
                                    fieldErrors.dueDate ? 'border-rose-600 bg-rose-50' : 'border-black'
                                }`}
                            />
                            {fieldErrors.dueDate && (
                                <p id="borrow-due-error" role="alert" className="text-xs font-bold text-rose-700 mt-1.5">
                                    {fieldErrors.dueDate}
                                </p>
                            )}
                            {dueDate && (
                                <p id="borrow-due-preview" className="text-xs font-medium text-slate-600 mt-1.5">
                                    Hạn trả dự kiến: <strong>{formatVnDueDate(dueDate)}</strong>
                                </p>
                            )}
                        </div>

                        <div className="p-3 bg-amber-50 border-2 border-black/25 rounded-2xl text-xs font-medium text-slate-700 flex items-start gap-2">
                            <AlertCircle size={15} className="text-amber-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
                            <span>
                                Gửi yêu cầu không đồng nghĩa đã giữ thiết bị — kho chỉ giữ thiết bị sau khi Quản trị viên duyệt.
                            </span>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label
                                    htmlFor="borrow-note"
                                    className="text-xs font-black uppercase tracking-wider text-slate-700"
                                >
                                    Mục đích sử dụng / Ghi chú (tuỳ chọn)
                                </label>
                                <span className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                                    {note.length}/500
                                </span>
                            </div>
                            <textarea
                                ref={noteInputRef}
                                id="borrow-note"
                                name="note"
                                rows="3"
                                maxLength="500"
                                aria-invalid={Boolean(fieldErrors.note)}
                                aria-describedby={fieldErrors.note ? 'borrow-note-error' : undefined}
                                placeholder="Phục vụ sự kiện CLB, bài tập nhóm, hội thảo..."
                                value={note}
                                onChange={(e) => {
                                    setNote(e.target.value);
                                    clearFieldError('note');
                                }}
                                className="w-full p-3 text-sm font-medium border-2 border-black rounded-xl bg-white shadow-[3px_3px_0_#000] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 transition-all resize-none placeholder:text-slate-500"
                            />
                            {fieldErrors.note && (
                                <p id="borrow-note-error" role="alert" className="text-xs font-bold text-rose-700 mt-1.5">
                                    {fieldErrors.note}
                                </p>
                            )}
                        </div>
                    </section>

                    {/* Sticky Bottom Action Bar */}
                    <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-4 bg-white/95 backdrop-blur-md border-t-2 border-black z-30 shadow-lg">
                        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
                            <div className="hidden sm:block">
                                <p className="text-xs font-bold text-slate-600">Tổng cộng đăng ký:</p>
                                <p className="text-base font-black text-black">{totalSelectedQty} thiết bị</p>
                            </div>

                            <motion.button
                                whileHover={shouldReduceMotion ? undefined : { scale: 1.01 }}
                                whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                                type="submit"
                                disabled={submitting}
                                className="flex-1 sm:flex-none sm:w-80 min-h-[48px] py-3.5 px-6 bg-indigo-600 text-white font-black text-sm border-2 border-black rounded-2xl shadow-[4px_4px_0_#000] hover:bg-indigo-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                                        Đang gửi phiếu...
                                    </>
                                ) : (
                                    <>
                                        <Send size={16} strokeWidth={2.5} aria-hidden="true" />
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
