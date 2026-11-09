import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, Loader2, Package, ArrowRight } from 'lucide-react';
import { borrowApi } from '../../api/borrow';
import { borrowTokenStore } from '../../lib/borrow-token-store';
import { Button } from '../ui/Button';

export default function BorrowVerify() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const token = searchParams.get('token');

    const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
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
                const status = err.response?.status;
                const errText = err.response?.data?.error;

                if (status === 404 || status === 410) {
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
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
            <header className="bg-white border-b border-slate-200">
                <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center gap-2">
                    <Package size={20} className="text-indigo-600" />
                    <h1 className="text-base font-bold text-slate-900">Mượn Trả Thiết Bị</h1>
                </div>
            </header>

            <main className="max-w-md mx-auto px-4 pt-12 text-center space-y-6">
                {status === 'verifying' && (
                    <div className="p-8 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <Loader2 size={36} className="animate-spin text-indigo-600 mx-auto" />
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Đang xác nhận email...</h2>
                            <p className="text-xs text-slate-500 mt-1">
                                Vui lòng đợi trong giây lát, hệ thống đang xử lý mã xác nhận của bạn.
                            </p>
                        </div>
                    </div>
                )}

                {status === 'success' && (
                    <div className="p-8 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-5 text-center">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                            <CheckCircle2 size={36} />
                        </div>

                        <div className="space-y-1.5">
                            <h2 className="text-xl font-bold text-slate-900">Xác Nhận Thành Công!</h2>
                            <p className="text-sm text-slate-600">
                                Yêu cầu mượn thiết bị{' '}
                                {requestData?.id && (
                                    <strong className="text-indigo-600">#{requestData.id}</strong>
                                )}{' '}
                                đã được xác thực và chuyển đến Quản trị viên để xét duyệt.
                            </p>
                        </div>

                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-800 text-left">
                            <p className="font-semibold mb-1">Bước tiếp theo:</p>
                            <p>
                                Khi đơn được duyệt, bạn sẽ nhận được thông báo qua email và có thể đến kho
                                để nhận thiết bị mượn.
                            </p>
                        </div>

                        <Button
                            variant="primary"
                            onClick={() => navigate('/borrow')}
                            className="w-full font-bold bg-indigo-600 hover:bg-indigo-700"
                        >
                            Xem Phiếu Mượn Của Bạn
                            <ArrowRight size={16} className="ml-1.5" />
                        </Button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="p-8 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-5 text-center">
                        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                            <AlertTriangle size={36} />
                        </div>

                        <div className="space-y-1.5">
                            <h2 className="text-xl font-bold text-slate-900">Xác Nhận Không Thành Công</h2>
                            <p className="text-sm text-slate-600">{errorMessage}</p>
                        </div>

                        <div className="space-y-2 pt-2">
                            <Button
                                variant="primary"
                                onClick={() => navigate('/borrow/new')}
                                className="w-full font-bold bg-indigo-600 hover:bg-indigo-700"
                            >
                                Tạo Yêu Cầu Mượn Mới
                            </Button>

                            <Button
                                variant="secondary"
                                onClick={() => navigate('/borrow')}
                                className="w-full text-xs font-semibold"
                            >
                                Về Trang Chủ Mượn Thiết Bị
                            </Button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

