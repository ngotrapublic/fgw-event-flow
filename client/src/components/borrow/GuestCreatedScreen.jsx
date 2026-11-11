import React from 'react';
import { AlertCircle, Loader2, Mail, Send } from 'lucide-react';

export default function GuestCreatedScreen({
    email,
    sessionIssued = true,
    resendCooldown,
    isResending,
    onResend,
    onGoHome
}) {
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
                            {email}
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
                        {sessionIssued ? (
                            <button
                                type="button"
                                onClick={onResend}
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
                        ) : (
                            <p className="text-xs font-medium text-slate-600 bg-amber-50 border border-amber-300 rounded-xl p-2.5">
                                Phiếu đã được ghi nhận và email đã gửi. Nếu không dùng được phiên trình duyệt, bạn vẫn có thể mở liên kết trong email hoặc tra cứu bằng SĐT & OTP.
                            </p>
                        )}

                        <button
                            type="button"
                            onClick={onGoHome}
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

