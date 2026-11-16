import React, { forwardRef, useState } from 'react';

const OtpInput = forwardRef(function OtpInput({ code, setCode, hasError = false }, ref) {
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
                    ref={ref}
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
});

export default OtpInput;

