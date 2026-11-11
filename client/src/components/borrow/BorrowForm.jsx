import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, AlertCircle, Send, Loader2 } from 'lucide-react';
import { borrowApi } from '../../api/borrow';
import { borrowTokenStore } from '../../lib/borrow-token-store';
import {
    getVnOffsetDateStr,
    getVnMaxDueDateStr,
    normalizePhoneInput,
    isValidVnPhone
} from '../../lib/borrow-utils';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../Toast';
import EquipmentSelector from './EquipmentSelector';
import BorrowerInfoSection from './BorrowerInfoSection';
import DueDatePicker from './DueDatePicker';
import GuestCreatedScreen from './GuestCreatedScreen';

export default function BorrowForm() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();
    const shouldReduceMotion = useReducedMotion();

    const [resources, setResources] = useState([]);
    const [loadingResources, setLoadingResources] = useState(true);
    const [resourcesError, setResourcesError] = useState(null);

    const [selectedItems, setSelectedItems] = useState({});
    const [selectedCategory, setSelectedCategory] = useState('all');

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [dueDate, setDueDate] = useState(() => getVnOffsetDateStr(1));
    const [note, setNote] = useState('');

    const [fieldErrors, setFieldErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [createdGuestRequest, setCreatedGuestRequest] = useState(null);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [isResending, setIsResending] = useState(false);

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

    const totalSelectedQty = useMemo(
        () => Object.values(selectedItems).reduce((acc, qty) => acc + (qty > 0 ? qty : 0), 0),
        [selectedItems]
    );

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
        if (!isValidVnPhone(phone)) {
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
                    .map((s) => `"${s.label || s.resourceId}" (còn ${s.available}, yêu cầu ${s.requested})`)
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

    if (createdGuestRequest) {
        return (
            <GuestCreatedScreen
                email={createdGuestRequest.email}
                resendCooldown={resendCooldown}
                isResending={isResending}
                onResend={handleResend}
                onGoHome={() => navigate('/borrow')}
            />
        );
    }

    return (
        <div className="min-h-screen bg-[#fafafa] text-slate-900 pb-28">
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

                    <span className="flex-shrink-0 text-xs font-black bg-yellow-300 text-black px-2.5 py-1.5 rounded-xl border-2 border-black shadow-[2px_2px_0_#000]">
                        {totalSelectedQty} món
                    </span>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 pt-5">
                <form onSubmit={handleSubmit} noValidate className="space-y-6">
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

                    <EquipmentSelector
                        categories={categories}
                        selectedCategory={selectedCategory}
                        onSelectCategory={setSelectedCategory}
                        loadingResources={loadingResources}
                        resourcesError={resourcesError}
                        onRetry={loadResources}
                        filteredResources={filteredResources}
                        selectedItems={selectedItems}
                        onToggleResource={handleToggleResource}
                        onIncrementQty={incrementQty}
                        onDecrementQty={decrementQty}
                        itemsError={fieldErrors.items}
                        firstButtonRef={itemsFirstButtonRef}
                    />

                    <BorrowerInfoSection
                        user={user}
                        name={name}
                        email={email}
                        phone={phone}
                        fieldErrors={fieldErrors}
                        onChangeName={(val) => {
                            setName(val);
                            clearFieldError('name');
                        }}
                        onChangeEmail={(val) => {
                            setEmail(val);
                            clearFieldError('email');
                        }}
                        onChangePhone={(val) => {
                            setPhone(val);
                            clearFieldError('phone');
                        }}
                        nameInputRef={nameInputRef}
                        emailInputRef={emailInputRef}
                        phoneInputRef={phoneInputRef}
                    />

                    {/* Section 3: Schedule & Note */}
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

                        <DueDatePicker
                            ref={dueDateInputRef}
                            dueDate={dueDate}
                            minDate={getVnOffsetDateStr(1)}
                            maxDate={getVnMaxDueDateStr()}
                            error={fieldErrors.dueDate}
                            onChangeDueDate={(next) => {
                                setDueDate(next);
                                clearFieldError('dueDate');
                            }}
                            onQuickSelect={(days) => {
                                setDueDate(getVnOffsetDateStr(days));
                                clearFieldError('dueDate');
                            }}
                        />

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
