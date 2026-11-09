import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Package,
    RotateCcw,
    PlusCircle,
    Search,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    UserCheck,
    History
} from 'lucide-react';
import { borrowApi } from '../../api/borrow';
import { borrowTokenStore } from '../../lib/borrow-token-store';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../Toast';
import { Button } from '../ui/Button';
import BorrowRequestCard from './BorrowRequestCard';

const CLOSED_STATUSES = ['returned', 'returned_with_issue', 'rejected', 'cancelled', 'expired'];

export default function BorrowHome() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showSuccess, showError, showInfo } = useToast();

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [resendingId, setResendingId] = useState(null);
    const [showHistory, setShowHistory] = useState(false);

    const fetchMyRequests = useCallback(async () => {
        setLoading(true);
        try {
            const tokens = borrowTokenStore.load();
            const res = await borrowApi.getMy(tokens);
            const data = res.data || {};

            // Remove expired/revoked tokens
            if (data.invalidTokens && data.invalidTokens.length > 0) {
                borrowTokenStore.remove(data.invalidTokens);
            }

            setRequests(data.requests || []);
        } catch (err) {
            console.error('[BORROW HOME] Error loading requests:', err);
            // Don't show toast for initial guest load if network is fine
            if (err.response?.status !== 401) {
                showError('Không thể tải danh sách phiếu mượn, vui lòng thử lại.');
            }
        } finally {
            setLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        fetchMyRequests();
    }, [fetchMyRequests]);

    const handleResendVerification = async (request) => {
        setResendingId(request.id);
        try {
            const tokens = borrowTokenStore.load();
            // Try with stored token if available
            await borrowApi.resendVerification(request.id, tokens[0] || '');
            showSuccess('Đã gửi lại email xác nhận! Vui lòng kiểm tra hộp thư.');
        } catch (err) {
            const msg =
                err.response?.data?.error ||
                'Không thể gửi lại email xác nhận, vui lòng thử lại sau 60 giây.';
            showError(msg);
        } finally {
            setResendingId(null);
        }
    };

    const openRequests = requests.filter((r) => !CLOSED_STATUSES.includes(r.status));
    const historyRequests = requests.filter((r) => CLOSED_STATUSES.includes(r.status));

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
            {/* Minimal App Bar / Brand Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
                <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-sm shadow-indigo-200">
                            <Package size={20} />
                        </div>
                        <div>
                            <h1 className="text-base font-bold leading-tight text-slate-900">
                                Mượn Trả Thiết Bị
                            </h1>
                            <p className="text-xs text-slate-500">FPT University Quy Nhon</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {user ? (
                            <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full font-medium border border-indigo-100">
                                <UserCheck size={13} />
                                <span className="max-w-[120px] truncate">{user.name || user.email}</span>
                            </div>
                        ) : (
                            <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                                Khách vãng lai
                            </span>
                        )}
                        <button
                            onClick={fetchMyRequests}
                            disabled={loading}
                            title="Làm mới"
                            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
                {/* Primary Action CTA Buttons */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <button
                        onClick={() => navigate('/borrow/new')}
                        className="group flex flex-col items-center justify-center p-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                    >
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                            <PlusCircle size={26} />
                        </div>
                        <span className="text-base font-bold">Mượn Thiết Bị</span>
                        <span className="text-xs text-indigo-100 mt-0.5">Tạo phiếu đăng ký mới</span>
                    </button>

                    <button
                        onClick={() => navigate('/borrow/return')}
                        className="group flex flex-col items-center justify-center p-5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 hover:border-slate-300 shadow-sm hover:shadow transition-all active:scale-[0.98]"
                    >
                        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                            <RotateCcw size={24} />
                        </div>
                        <span className="text-base font-bold">Trả Thiết Bị</span>
                        <span className="text-xs text-slate-500 mt-0.5">Báo trả & tra cứu phiếu</span>
                    </button>
                </div>

                {/* Active Borrow Requests Section */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Package size={16} className="text-indigo-600" />
                            Phiếu Mượn Hiện Tại
                            {openRequests.length > 0 && (
                                <span className="ml-1 bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-bold">
                                    {openRequests.length}
                                </span>
                            )}
                        </h2>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
                            <RefreshCw size={24} className="animate-spin text-indigo-600 mx-auto mb-2" />
                            <p className="text-sm text-slate-500">Đang kiểm tra phiếu mượn của bạn...</p>
                        </div>
                    ) : openRequests.length > 0 ? (
                        <div className="space-y-3">
                            {openRequests.map((req) => (
                                <BorrowRequestCard
                                    key={req.id}
                                    request={req}
                                    onResendEmail={handleResendVerification}
                                    isResending={resendingId === req.id}
                                    showReturnButton={req.status === 'handed_over'}
                                    onReturn={() => navigate('/borrow/return')}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center p-8 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
                            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-2">
                                <Package size={24} />
                            </div>
                            <p className="text-sm font-semibold text-slate-700">
                                Bạn chưa có phiếu mượn nào đang mở
                            </p>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto">
                                Nhấn vào nút <strong>Mượn Thiết Bị</strong> phía trên để đăng ký mượn mới,
                                hoặc dùng chức năng tra cứu nếu bạn đổi trình duyệt.
                            </p>
                            <div className="pt-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => navigate('/borrow/return')}
                                    className="text-xs"
                                >
                                    <Search size={14} className="mr-1.5" />
                                    Tra cứu phiếu bằng Số Điện Thoại
                                </Button>
                            </div>
                        </div>
                    )}
                </section>

                {/* History Section (Collapsible) */}
                {historyRequests.length > 0 && (
                    <section className="space-y-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setShowHistory((prev) => !prev)}
                            className="w-full flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                            <div className="flex items-center gap-2 text-sm font-semibold">
                                <History size={16} className="text-slate-400" />
                                <span>Lịch sử mượn trả đã hoàn tất ({historyRequests.length})</span>
                            </div>
                            {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>

                        {showHistory && (
                            <div className="space-y-3">
                                {historyRequests.map((req) => (
                                    <BorrowRequestCard key={req.id} request={req} />
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {/* Info Card / Rules */}
                <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-900 space-y-1.5">
                    <p className="font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block"></span>
                        Quy định mượn trả thiết bị:
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-indigo-800/90 pl-1">
                        <li>Mỗi người mượn tối đa 3 phiếu cùng lúc.</li>
                        <li>Khách vãng lai cần xác nhận qua email trong vòng 24 giờ.</li>
                        <li>Sau khi được duyệt, vui lòng nhận thiết bị trong vòng 3 ngày.</li>
                        <li>Khi mang trả, hãy bấm "Báo trả" và bàn giao trực tiếp tại kho.</li>
                    </ul>
                </div>
            </main>
        </div>
    );
}

