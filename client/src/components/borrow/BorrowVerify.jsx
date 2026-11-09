import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, Loader2, Package, ArrowRight, Sparkles } from 'lucide-react';
import { borrowApi } from '../../api/borrow';
import { borrowTokenStore } from '../../lib/borrow-token-store';

export default function BorrowVerify() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const token = searchParams.get('token');

    const [status, setStatus] = useState('verifying');
    const [errorMessage, setErrorMessage] = useState('');
    const [requestData, setRequestData] = useState(null);

    useEffect(() => {
        let isMounted = true;

        if (!token || !token.trim()) {
            setStatus('error');
            setErrorMessage('Liên kết xác nhận không có mã token hợp lệ.');
            return;
        }

        async function verifyToken() {
            try {
                const res = await borrowApi.verify(token.trim());
                if (!isMounted) return;

                const { request, accessToken } = res.data || {};
                if (accessToken) {
                    borrowTokenStore.add(accessToken);
                }

                setRequestData(request);
                setStatus('success');
            } catch (err) {
                if (!isMounted) return;
                console.error('[BORROW VERIFY] Verification error:', err);
                const statusCode = err.response?.status;
                const errText = err.response?.data?.error;

                if (statusCode === 404 || statusCode === 410) {
                    setErrorMessage(
                        errText ||
                            'Liên kết xác nhận không hợp lệ hoặc đã hết hạn (24 giờ). Vui lòng gửi lại yêu cầu mượn mới.'
                    );
                } else {
                    setErrorMessage(
                        errText || 'Không thể xác nhận yêu cầu mượn lúc này. Vui lòng thử lại sau.'
                    );
                }
                setStatus('error');
            }
        }

        verifyToken();

        return () => {
            isMounted = false;
        };
    }, [token]);

    return (
        <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
            {/* Multi-layer Neo shadow container */}
            <div className="relative w-full max-w-md">
                <div
                    className="absolute inset-0 rounded-2xl"
                    style={{ background: '#ec4899', transform: 'translate(8px, 8px)' }}
                />
                <div
                    className="absolute inset-0 rounded-2xl"
                    style={{ background: '#8b5cf6', transform: 'translate(4px, 4px)' }}
                />

                {/* Main card */}
                <div className="relative bg-white border-[3px] border-black rounded-2xl p-6 sm:p-8 text-center space-y-5">
                    {/* Decorative dots */}
                    <div className="absolute top-3.5 left-3.5 flex gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-violet-500 border border-black inline-block"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-pink-500 border border-black inline-block"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-black inline-block"></span>
                    </div>

                    {status === 'verifying' && (
                        <div className="py-6 space-y-4">
                            <Loader2 size={40} className="animate-spin text-indigo-600 mx-auto" />
                            <div>
                                <h2 className="text-base font-black text-black uppercase tracking-tight">
                                    Đang xác nhận mã email...
                                </h2>
                                <p className="text-xs font-medium text-slate-500 mt-1">
                                    Hệ thống đang kiểm tra tính hợp lệ của phiếu mượn.
                                </p>
                            </div>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="space-y-4 pt-2">
                            <div className="w-16 h-16 bg-emerald-300 text-black border-2 border-black rounded-2xl flex items-center justify-center mx-auto shadow-[3px_3px_0_#000] rotate-3">
                                <CheckCircle2 size={36} strokeWidth={2.5} />
                            </div>

                            <div className="space-y-1.5">
                                <span className="inline-block px-2.5 py-0.5 bg-emerald-100 text-emerald-900 border border-black rounded-md text-[10px] font-black uppercase tracking-widest shadow-[1px_1px_0_#000]">
                                    Hoàn Tất
                                </span>
                                <h2 className="text-xl font-black text-black uppercase tracking-tight">
                                    Xác Nhận Thành Công!
                                </h2>
                                <p className="text-xs font-medium text-slate-600">
                                    Yêu cầu mượn thiết bị{' '}
                                    {requestData?.id && (
                                        <strong className="font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                                            #{requestData.id}
                                        </strong>
                                    )}{' '}
                                    đã được chuyển tới Quản trị viên để phê duyệt.
                                </p>
                            </div>

                            <div className="p-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-left text-xs font-medium text-slate-700 space-y-1">
                                <p className="font-black text-black">Bước tiếp theo:</p>
                                <p>
                                    Khi quản trị viên duyệt đơn, bạn sẽ nhận được thông báo qua email và có thể
                                    đến nhận thiết bị tại <strong>Kho A102 (Tòa Gamma)</strong>.
                                </p>
                            </div>

                            <button
                                onClick={() => navigate('/borrow')}
                                className="w-full py-3.5 px-4 bg-indigo-600 text-white border-2 border-black rounded-xl text-sm font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                            >
                                Xem Phiếu Mượn Của Bạn
                                <ArrowRight size={16} strokeWidth={2.5} />
                            </button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="space-y-4 pt-2">
                            <div className="w-16 h-16 bg-rose-300 text-black border-2 border-black rounded-2xl flex items-center justify-center mx-auto shadow-[3px_3px_0_#000] -rotate-3">
                                <AlertTriangle size={36} strokeWidth={2.5} />
                            </div>

                            <div className="space-y-1.5">
                                <h2 className="text-lg font-black text-black uppercase tracking-tight">
                                    Xác Nhận Không Thành Công
                                </h2>
                                <p className="text-xs font-medium text-slate-600">{errorMessage}</p>
                            </div>

                            <div className="space-y-2.5 pt-2">
                                <button
                                    onClick={() => navigate('/borrow/new')}
                                    className="w-full py-3 px-4 bg-indigo-600 text-white border-2 border-black rounded-xl text-xs font-black shadow-[3px_3px_0_#000] hover:bg-indigo-700 transition-all"
                                >
                                    Tạo Yêu Cầu Mượn Mới
                                </button>

                                <button
                                    onClick={() => navigate('/borrow')}
                                    className="w-full py-2.5 px-4 bg-white border-2 border-black rounded-xl text-xs font-black shadow-[2px_2px_0_#000] hover:bg-slate-100 transition-all"
                                >
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
