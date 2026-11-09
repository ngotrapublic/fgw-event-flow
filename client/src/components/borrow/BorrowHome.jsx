import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
    History,
    Clock,
    Mail,
    AlertTriangle,
    Sparkles,
    ShieldCheck,
    MapPin
} from 'lucide-react';
import { borrowApi } from '../../api/borrow';
import { borrowTokenStore } from '../../lib/borrow-token-store';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../Toast';
import BorrowRequestCard from './BorrowRequestCard';

const CLOSED_STATUSES = ['returned', 'returned_with_issue', 'rejected', 'cancelled', 'expired'];

// Stat Card component identical in design to EventDashboard
const StatBox = ({ title, value, icon: Icon, color, labelColor, onClick, active = false }) => (
    <div
        onClick={onClick}
        className={`border-2 border-black rounded-2xl p-4 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[1px] active:translate-y-[1px] transition-all duration-150 cursor-pointer flex items-center justify-between group ${
            active ? 'ring-2 ring-black bg-slate-50' : ''
        }`}
    >
        <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                {title}
            </p>
            <h3 className="text-3xl font-black text-black leading-none">{value}</h3>
        </div>
        <div
            className={`p-2.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:rotate-6 transition-transform ${color} ${labelColor}`}
        >
            <Icon size={20} strokeWidth={2.5} />
        </div>
    </div>
);

export default function BorrowHome() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [resendingId, setResendingId] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchMyRequests = useCallback(async () => {
        setLoading(true);
        try {
            const tokens = borrowTokenStore.load();
            const res = await borrowApi.getMy(tokens);
            const data = res.data || {};

            if (data.invalidTokens && data.invalidTokens.length > 0) {
                borrowTokenStore.remove(data.invalidTokens);
            }

            setRequests(data.requests || []);
        } catch (err) {
            console.error('[BORROW HOME] Error loading requests:', err);
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

    const openRequests = useMemo(
        () => requests.filter((r) => !CLOSED_STATUSES.includes(r.status)),
        [requests]
    );

    const historyRequests = useMemo(
        () => requests.filter((r) => CLOSED_STATUSES.includes(r.status)),
        [requests]
    );

    // Dynamic stats
    const stats = useMemo(() => {
        const now = Date.now();
        const handedOver = openRequests.filter((r) => r.status === 'handed_over').length;
        const pending = openRequests.filter((r) => r.status === 'pending').length;
        const unverified = openRequests.filter((r) => r.status === 'unverified').length;
        const overdue = openRequests.filter(
            (r) =>
                r.isOverdue ||
                (['handed_over', 'return_pending'].includes(r.status) &&
                    r.dueAt &&
                    new Date(r.dueAt).getTime() < now)
        ).length;
        return { handedOver, pending, unverified, overdue };
    }, [openRequests]);

    // Filtered open requests based on active chip
    const filteredOpenRequests = useMemo(() => {
        if (statusFilter === 'all') return openRequests;
        if (statusFilter === 'overdue') {
            const now = Date.now();
            return openRequests.filter(
                (r) =>
                    r.isOverdue ||
                    (['handed_over', 'return_pending'].includes(r.status) &&
                        r.dueAt &&
                        new Date(r.dueAt).getTime() < now)
            );
        }
        return openRequests.filter((r) => r.status === statusFilter);
    }, [openRequests, statusFilter]);

    return (
        <div className="min-h-screen bg-[#fafafa] text-slate-900 pb-16 relative overflow-x-hidden">
            {/* Playful Neo-Brutalist decorative background elements */}
            <div className="absolute top-10 -left-6 w-14 h-14 bg-yellow-400 rounded-full border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] opacity-70 pointer-events-none -z-0"></div>
            <div className="absolute top-48 -right-6 w-12 h-12 bg-cyan-400 rotate-12 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] opacity-70 pointer-events-none -z-0"></div>
            <div className="absolute top-96 -left-4 w-10 h-10 bg-pink-400 rotate-45 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] opacity-60 pointer-events-none -z-0"></div>

            {/* Header / Brand Top Bar */}
            <header className="bg-white border-b-2 border-black sticky top-0 z-30 shadow-sm">
                <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 border-2 border-black flex items-center justify-center text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <Package size={22} strokeWidth={2.5} />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <h1 className="text-base font-black tracking-tight text-black uppercase">
                                    Mượn Trả Thiết Bị
                                </h1>
                                <span className="bg-amber-300 text-black text-[9px] font-black px-1.5 py-0.5 rounded border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                                    PRO
                                </span>
                            </div>
                            <p className="text-[11px] font-bold text-slate-500">FPT University Quy Nhon</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {user ? (
                            <div className="flex items-center gap-1.5 bg-violet-100 text-slate-900 text-xs px-3 py-1 rounded-full font-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                <UserCheck size={14} className="text-violet-700" />
                                <span className="max-w-[110px] truncate">{user.name || user.email}</span>
                            </div>
                        ) : (
                            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-300">
                                Khách vãng lai
                            </span>
                        )}

                        <button
                            onClick={fetchMyRequests}
                            disabled={loading}
                            title="Làm mới dữ liệu"
                            className="p-2 text-slate-700 hover:text-black bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] active:bg-slate-100 transition-all"
                        >
                            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-2xl mx-auto px-4 pt-6 space-y-6 relative z-10">
                {/* Neo-Brutalism Quick Stats Overview */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatBox
                        title="Đang Mượn"
                        value={stats.handedOver}
                        icon={Package}
                        color="bg-violet-100"
                        labelColor="text-violet-700"
                        active={statusFilter === 'handed_over'}
                        onClick={() =>
                            setStatusFilter((prev) => (prev === 'handed_over' ? 'all' : 'handed_over'))
                        }
                    />
                    <StatBox
                        title="Chờ Duyệt"
                        value={stats.pending}
                        icon={Clock}
                        color="bg-sky-100"
                        labelColor="text-sky-700"
                        active={statusFilter === 'pending'}
                        onClick={() =>
                            setStatusFilter((prev) => (prev === 'pending' ? 'all' : 'pending'))
                        }
                    />
                    <StatBox
                        title="Chờ Xác Nhận"
                        value={stats.unverified}
                        icon={Mail}
                        color="bg-amber-100"
                        labelColor="text-amber-700"
                        active={statusFilter === 'unverified'}
                        onClick={() =>
                            setStatusFilter((prev) => (prev === 'unverified' ? 'all' : 'unverified'))
                        }
                    />
                    <StatBox
                        title="Quá Hạn"
                        value={stats.overdue}
                        icon={AlertTriangle}
                        color="bg-rose-100"
                        labelColor="text-rose-700"
                        active={statusFilter === 'overdue'}
                        onClick={() =>
                            setStatusFilter((prev) => (prev === 'overdue' ? 'all' : 'overdue'))
                        }
                    />
                </div>

                {/* Massive 2 Action CTA Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {/* Button 1: Mượn thiết bị */}
                    <button
                        onClick={() => navigate('/borrow/new')}
                        className="group relative flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-2 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] transition-all duration-150 overflow-hidden text-left"
                    >
                        <div className="space-y-1 z-10">
                            <span className="inline-block text-[10px] font-black uppercase tracking-widest bg-yellow-300 text-black px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                                Bước 1
                            </span>
                            <h3 className="text-xl font-black tracking-tight leading-tight">
                                Mượn Thiết Bị
                            </h3>
                            <p className="text-xs text-violet-100 font-medium">Tạo phiếu đăng ký mới</p>
                        </div>
                        <div className="w-13 h-13 rounded-2xl bg-white text-black border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] group-hover:rotate-12 transition-transform flex-shrink-0 z-10 p-3">
                            <PlusCircle size={28} strokeWidth={2.5} className="text-indigo-600" />
                        </div>
                    </button>

                    {/* Button 2: Trả thiết bị */}
                    <button
                        onClick={() => navigate('/borrow/return')}
                        className="group relative flex items-center justify-between p-5 rounded-2xl bg-white text-slate-900 border-2 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] transition-all duration-150 overflow-hidden text-left"
                    >
                        <div className="space-y-1 z-10">
                            <span className="inline-block text-[10px] font-black uppercase tracking-widest bg-emerald-300 text-black px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                                Bước 2
                            </span>
                            <h3 className="text-xl font-black tracking-tight leading-tight">
                                Trả Thiết Bị
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">Báo trả & tra cứu phiếu</p>
                        </div>
                        <div className="w-13 h-13 rounded-2xl bg-emerald-100 text-black border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] group-hover:-rotate-12 transition-transform flex-shrink-0 z-10 p-3">
                            <RotateCcw size={26} strokeWidth={2.5} className="text-emerald-700" />
                        </div>
                    </button>
                </div>

                {/* Active Borrow Requests Section */}
                <section className="space-y-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                <Package size={18} className="text-indigo-600" />
                                Phiếu Mượn Hiện Tại
                            </h2>
                            {openRequests.length > 0 && (
                                <span className="bg-yellow-300 text-black border-2 border-black text-xs px-2.5 py-0.5 rounded-full font-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                                    {openRequests.length}
                                </span>
                            )}
                        </div>

                        {/* Filter Tabs if multiple requests */}
                        {openRequests.length > 1 && (
                            <div className="flex items-center gap-1 bg-white border border-black rounded-lg p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-[11px] font-bold">
                                <button
                                    onClick={() => setStatusFilter('all')}
                                    className={`px-2 py-0.5 rounded ${
                                        statusFilter === 'all'
                                            ? 'bg-black text-white'
                                            : 'text-slate-600 hover:text-black'
                                    }`}
                                >
                                    Tất cả ({openRequests.length})
                                </button>
                                {stats.handedOver > 0 && (
                                    <button
                                        onClick={() => setStatusFilter('handed_over')}
                                        className={`px-2 py-0.5 rounded ${
                                            statusFilter === 'handed_over'
                                                ? 'bg-black text-white'
                                                : 'text-slate-600 hover:text-black'
                                        }`}
                                    >
                                        Đang mượn ({stats.handedOver})
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {loading ? (
                        <div className="p-10 text-center bg-white rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-3">
                            <RefreshCw size={28} className="animate-spin text-indigo-600 mx-auto" />
                            <p className="text-sm font-bold text-slate-600">
                                Đang kiểm tra phiếu mượn của bạn...
                            </p>
                        </div>
                    ) : filteredOpenRequests.length > 0 ? (
                        <div className="space-y-4">
                            {filteredOpenRequests.map((req) => (
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
                        <div className="text-center p-8 bg-white rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-3">
                            <div className="w-14 h-14 bg-amber-100 text-black border-2 border-black rounded-2xl flex items-center justify-center mx-auto shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rotate-3">
                                <Package size={28} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-base font-black text-slate-900">
                                Bạn chưa có phiếu mượn nào đang mở
                            </h3>
                            <p className="text-xs text-slate-600 max-w-sm mx-auto font-medium">
                                Hãy bấm <strong>Mượn Thiết Bị</strong> phía trên để tạo phiếu mới, hoặc tra
                                cứu bằng số điện thoại nếu bạn đang dùng trình duyệt mới.
                            </p>
                            <div className="pt-2">
                                <button
                                    onClick={() => navigate('/borrow/return')}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border-2 border-black rounded-xl text-xs font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                                >
                                    <Search size={14} />
                                    Tra cứu phiếu bằng Số Điện Thoại
                                </button>
                            </div>
                        </div>
                    )}
                </section>

                {/* History Section (Collapsible Neo-style) */}
                {historyRequests.length > 0 && (
                    <section className="space-y-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setShowHistory((prev) => !prev)}
                            className="w-full flex items-center justify-between p-3.5 bg-white rounded-2xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] text-slate-900 font-bold transition-all text-sm"
                        >
                            <div className="flex items-center gap-2">
                                <History size={17} className="text-slate-600" />
                                <span>Lịch sử mượn trả đã hoàn tất ({historyRequests.length})</span>
                            </div>
                            {showHistory ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>

                        {showHistory && (
                            <div className="space-y-4 pt-1">
                                {historyRequests.map((req) => (
                                    <BorrowRequestCard key={req.id} request={req} />
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {/* Location & Guide Banner - Neo-Brutalist Sticker Style */}
                <div className="relative p-5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-2">
                    <div className="flex items-center justify-between border-b border-black/10 pb-2">
                        <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-black">
                            <MapPin size={16} className="text-orange-600" />
                            Địa điểm nhận & trả thiết bị
                        </div>
                        <span className="bg-orange-400 text-black text-[9px] font-black px-2 py-0.5 rounded border border-black shadow-[1px_1px_0_#000]">
                            KHO A102
                        </span>
                    </div>

                    <p className="text-xs font-bold text-slate-800">
                        📍 Phòng A102 — Tòa nhà Gamma, Trường ĐH FPT Quy Nhơn
                    </p>

                    <div className="pt-1 text-[11px] font-medium text-slate-600 space-y-1">
                        <p>• Giờ làm việc: <strong>08:00 - 17:30</strong> (Thứ 2 đến Thứ 7 hàng tuần).</p>
                        <p>• Vui lòng xuất trình email xác nhận hoặc mã phiếu mượn khi đến nhận thiết bị.</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
