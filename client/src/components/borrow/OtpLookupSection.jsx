import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, Check, Loader2, Mail, Search } from 'lucide-react';
import PhoneField from './PhoneField';
import OtpInput from './OtpInput';

export default function OtpLookupSection({
    hasOpenRequests,
    showLookupBox,
    onToggleLookupBox,
    lookupError,
    onClearError,
    otpSent,
    phone,
    onChangePhone,
    otpCode,
    onChangeOtpCode,
    otpCooldown,
    sendingOtp,
    verifyingOtp,
    onRequestOtp,
    onVerifyOtp,
    onResetPhoneStep
}) {
    const shouldReduceMotion = useReducedMotion();
    const isExpanded = showLookupBox || !hasOpenRequests;

    return (
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
                {hasOpenRequests && (
                    <button
                        type="button"
                        onClick={onToggleLookupBox}
                        aria-expanded={showLookupBox}
                        className="min-h-[44px] px-2 text-xs font-black text-indigo-700 hover:underline"
                    >
                        {showLookupBox ? 'Thu gọn ▲' : 'Mở rộng ▼'}
                    </button>
                )}
            </div>

            {isExpanded && (
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
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                onRequestOtp();
                            }}
                            noValidate
                            className="space-y-3.5"
                        >
                            <PhoneField
                                id="return-lookup-phone"
                                label="Số điện thoại người mượn"
                                placeholder="Ví dụ: 0901234567"
                                value={phone}
                                onChange={(e) => {
                                    onChangePhone(e.target.value);
                                    onClearError();
                                }}
                                describedByExtra={lookupError ? 'return-lookup-error' : undefined}
                            />

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
                        <form onSubmit={onVerifyOtp} noValidate className="space-y-4">
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
                                    onChangeOtpCode(next);
                                    onClearError();
                                }}
                                hasError={Boolean(lookupError)}
                            />

                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                <button
                                    type="button"
                                    onClick={onResetPhoneStep}
                                    className="min-h-[44px] px-2 font-black text-slate-700 hover:text-black underline"
                                >
                                    ← Đổi số điện thoại khác
                                </button>

                                <button
                                    type="button"
                                    onClick={onRequestOtp}
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
    );
}

