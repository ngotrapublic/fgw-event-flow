import React from 'react';
import { AlertCircle } from 'lucide-react';
import PhoneField from './PhoneField';

export default function BorrowerInfoSection({
    user,
    name,
    email,
    phone,
    fieldErrors,
    onChangeName,
    onChangeEmail,
    onChangePhone,
    nameInputRef,
    emailInputRef,
    phoneInputRef
}) {
    return (
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
                            onChange={(e) => onChangeName(e.target.value)}
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
                            onChange={(e) => onChangeEmail(e.target.value)}
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

            <PhoneField
                ref={phoneInputRef}
                id="borrow-phone"
                value={phone}
                onChange={(e) => onChangePhone(e.target.value)}
                error={fieldErrors.phone}
                helpText="Dùng để liên hệ nhận/trả và tra cứu phiếu mượn qua mã OTP sau này."
            />
        </section>
    );
}

