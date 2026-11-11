import React, { forwardRef } from 'react';

const PhoneField = forwardRef(function PhoneField(
    {
        id = 'borrow-phone',
        name = 'phone',
        label = 'Số điện thoại liên hệ',
        placeholder = '0901234567',
        value,
        onChange,
        error,
        describedByExtra,
        helpText
    },
    ref
) {
    const errorId = `${id}-error`;
    const helpId = `${id}-help`;

    const describedByParts = [];
    if (error) describedByParts.push(errorId);
    if (describedByExtra) describedByParts.push(describedByExtra);
    if (helpText) describedByParts.push(helpId);

    return (
        <div>
            <label
                htmlFor={id}
                className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5"
            >
                {label} <span className="text-rose-600">*</span>
            </label>
            <input
                ref={ref}
                id={id}
                name={name}
                type="tel"
                autoComplete="tel"
                required
                aria-required="true"
                aria-invalid={Boolean(error)}
                aria-describedby={describedByParts.length > 0 ? describedByParts.join(' ') : undefined}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                className={`w-full h-11 px-3.5 text-sm font-bold border-2 rounded-xl bg-white shadow-[3px_3px_0_#000] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 transition-all placeholder:font-normal placeholder:text-slate-500 ${
                    error ? 'border-rose-600 bg-rose-50' : 'border-black'
                }`}
            />
            {error && (
                <p id={errorId} role="alert" className="text-xs font-bold text-rose-700 mt-1.5">
                    {error}
                </p>
            )}
            {helpText && (
                <p id={helpId} className="text-xs font-medium text-slate-600 mt-1.5">
                    {helpText}
                </p>
            )}
        </div>
    );
});

export default PhoneField;

