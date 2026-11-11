import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Loader2, AlertTriangle, Package, Search } from 'lucide-react';
import { borrowApi } from '../../api/borrow';
import { borrowTokenStore } from '../../lib/borrow-token-store';

function extractFragmentCode() {
    if (typeof window === 'undefined') return '';
    const hash = window.location.hash || '';
    if (hash.startsWith('#')) {
        const params = new URLSearchParams(hash.slice(1));
        const code = params.get('code');
        if (code && code.trim()) return code.trim();
    }
    return '';
}

export default function BorrowManage() {
    const navigate = useNavigate();

    const [code, setCode] = useState('');
    const [status, setStatus] = useState('checking'); // 'checking' | 'confirm' | 'exchanging' | 'error'
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        borrowTokenStore.purgeLegacy();
        const extracted = extractFragmentCode();

        // Remove fragment or any legacy query string immediately from address bar
        if (typeof window !== 'undefined' && (window.location.hash || window.location.search)) {
            window.history.replaceState(null, '', '/borrow/manage');
        }

        if (!extracted) {
            setStatus('error');
            setErrorMessage(
                'Liên kết quản lý không hợp lệ, đã được sử dụng hoặc thiếu mã xác thực. Bạn vẫn có thể tra cứu phiếu bằng số điện thoại và mã OTP.'
            );
            return;
        }

        setCode(extracted);
        setStatus('confirm');
    }, []);

    const handleContinue = async () => {
        if (!code || status === 'exchanging') return;
        setStatus('exchanging');
        setErrorMessage('');

        try {
            await borrowApi.exchangeLink(code);
            navigate('/borrow', { replace: true });
        } catch (err) {
            console.error('[BORROW MANAGE] Link exchange error:', err);
            const serverMsg = err.response?.data?.error;
            setErrorMessage(
                serverMsg ||
                    'Liên kết đã hết hạn hoặc đã được sử dụng. Vui lòng dùng tra cứu bằng SĐT và mã OTP.'
            );
            setStatus('error');
        }
    };

    return (
        <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
            <div className="relative w-full max-w-md">
                <div className="bg-white border-[3px] border-black rounded-2xl p-6 sm:p-8 text-center space-y-5 shadow-[6px_6px_0_#000]">
                    {status === 'checking' && (
                        <div className="py-6 space-y-3">
                            <Loader2 size={32} className="animate-spin text-indigo-600 mx-auto" />
                            <p className="text-xs font-black text-black uppercase tracking-wider">
                                Đang kiểm tra liên kết...
                            </p>
                        </div>
                    )}

                    {(status === 'confirm' || status === 'exchanging') && (
                        <div className="space-y-4">
                            <div className="w-16 h-16 bg-emerald-200 text-black border-2 border-black rounded-2xl flex items-center justify-center mx-auto shadow-[3px_3px_0_#000]">
                                <ShieldCheck size={34} strokeWidth={2.5} />
                            </div>

                            <div className="space-y-1.5">
                                <span className="inline-block px-2.5 py-0.5 bg-indigo-100 text-indigo-900 border border-black rounded-md text-xs font-black uppercase tracking-wider">
                                    Liên kết dùng một lần
                                </span>
                                <h1 className="text-xl font-black text-black uppercase tracking-tight">
                                    Mở Phiên Quản Lý Phiếu
                                </h1>
                                <p className="text-sm font-medium text-slate-600 leading-relaxed">
                                    Nhấn nút bên dưới để xác nhận bạn là người mở liên kết này và truy cập phiếu mượn thiết bị.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleContinue}
                                disabled={status === 'exchanging'}
                                className="w-full min-h-[48px] py-3 px-4 bg-indigo-600 text-white border-2 border-black rounded-xl text-sm font-black shadow-[3px_3px_0_#000] hover:bg-indigo-700 active:translate-x-[1px] active:translate-y-[1px] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {status === 'exchanging' ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Đang mở phiên an toàn...
                                    </>
                                ) : (
                                    <>
                                        Tiếp tục quản lý phiếu
                                        <ArrowRight size={16} strokeWidth={2.5} />
                                    </>
                                )}
                            </button>

                            <p className="text-xs font-medium text-slate-600">
                                Liên kết sẽ hết hiệu lực ngay sau khi mở để bảo vệ thông tin phiếu mượn.
                            </p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="space-y-4">
                            <div className="w-16 h-16 bg-amber-200 text-black border-2 border-black rounded-2xl flex items-center justify-center mx-auto shadow-[3px_3px_0_#000]">
                                <AlertTriangle size={34} strokeWidth={2.5} />
                            </div>

                            <div className="space-y-1.5">
                                <h1 className="text-lg font-black text-black uppercase tracking-tight">
                                    Không Thể Mở Liên Kết
                                </h1>
                                <p className="text-sm font-medium text-slate-600 leading-relaxed">
                                    {errorMessage}
                                </p>
                            </div>

                            <div className="space-y-2.5 pt-2">
                                <button
                                    type="button"
                                    onClick={() => navigate('/borrow/return')}
                                    className="w-full min-h-[44px] py-2.5 px-4 bg-indigo-600 text-white border-2 border-black rounded-xl text-xs font-black shadow-[3px_3px_0_#000] hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                                >
                                    <Search size={15} />
                                    Tra cứu phiếu bằng SĐT & OTP
                                </button>

                                <button
                                    type="button"
                                    onClick={() => navigate('/borrow')}
                                    className="w-full min-h-[44px] py-2.5 px-4 bg-white border-2 border-black rounded-xl text-xs font-black shadow-[2px_2px_0_#000] hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                                >
                                    <Package size={15} />
                                    Về Trang Chủ Mượn Thiết Bị
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
