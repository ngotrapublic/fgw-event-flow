import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
    MapPin,
    Zap,
    ExternalLink,
    HelpCircle,
    PhoneCall,
    Info
} from 'lucide-react';
import { borrowApi } from '../../api/borrow';
import { borrowTokenStore } from '../../lib/borrow-token-store';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../Toast';
import BorrowRequestCard from './BorrowRequestCard';

const CLOSED_STATUSES = ['returned', 'returned_with_issue', 'rejected', 'cancelled', 'expired'];

// Stat Card with Neo-Brutalism & Framer Motion
const StatBox = ({ title, value, icon: Icon, color, labelColor, onClick, active = false, badge = null }) => (
    <motion.div
        whileHover={{ y: -3, scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
        onClick={onClick}
        className={`border-2 border-black rounded-2xl p-4 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 cursor-pointer flex items-center justify-between group relative overflow-hidden ${
            active ? 'ring-2 ring-black bg-slate-50' : ''
        }`}
    >
        {badge && (
            <span className="absolute top-1 right-1 text-[9px] font-black px-1.5 py-0.2 bg-rose-500 text-white rounded border border-black shadow-[1px_1px_0_#000]">
                {badge}
            </span>
        )}
        <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                {title}
            </p>
            <h3 className="text-3xl font-black text-black leading-none">{value}</h3>
        </div>
        <div
            className={`p-2.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:rotate-12 transition-transform ${color} ${labelColor}`}
        >
            <Icon size={20} strokeWidth={2.5} />
        </div>
    </motion.div>
);

export default function BorrowHome() {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const { showSuccess, showError } = useToast();

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [resendingId, setResendingId] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [showWarehouseModal, setShowWarehouseModal] = useState(false);

    const fetchMyRequests = useCallback(async () => {
        if (authLoading) return;
        setLoading(true);
        try {
            borrowTokenStore.purgeLegacy();
            const res = await borrowApi.getMy();
            const data = res.data || {};
            setRequests(data.requests || []);
        } catch (err) {
            console.error('[BORROW HOME] Error loading requests:', err);
            if (err.response?.status !== 401) {
                showError('Không thể tải danh sách phiếu mượn, vui lòng thử lại.');
            }
        } finally {
            setLoading(false);
        }
    }, [authLoading, showError]);

    useEffect(() => {
        if (!authLoading) {
            setRequests([]);
            fetchMyRequests();
        }
    }, [user?.uid, authLoading, fetchMyRequests]);

    const handleResendVerification = async (request) => {
        setResendingId(request.id);
        try {
            await borrowApi.resendVerification(request.id);
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

    // Compute dynamic stats
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

    // Filtered requests with status & search
    const filteredOpenRequests = useMemo(() => {
        let list = openRequests;
        if (statusFilter !== 'all') {
            if (statusFilter === 'overdue') {
                const now = Date.now();
                list = list.filter(
                    (r) =>
                        r.isOverdue ||
                        (['handed_over', 'return_pending'].includes(r.status) &&
                            r.dueAt &&
                            new Date(r.dueAt).getTime() < now)
                );
            } else {
                list = list.filter((r) => r.status === statusFilter);
            }
        }
        if (searchKeyword.trim()) {
            const kw = searchKeyword.trim().toLowerCase();
            list = list.filter(
                (r) =>
                    r.id.toLowerCase().includes(kw) ||
                    (r.items || []).some((it) =>
                        (it.label || it.resourceId || '').toLowerCase().includes(kw)
                    )
            );
        }
        return list;
    }, [openRequests, statusFilter, searchKeyword]);

    return (
        <div className="min-h-screen bg-[#fafafa] text-slate-900 pb-20 relative overflow-x-hidden selection:bg-yellow-300 selection:text-black">
            {/* Playful Floating Geometric Stickers in Background */}
            <div className="absolute top-12 -left-6 w-16 h-16 bg-yellow-400 rounded-full border-2 border-black shadow-[3px_3px_0_#000] opacity-80 pointer-events-none -z-0"></div>
            <div className="absolute top-64 -right-6 w-14 h-14 bg-cyan-400 rotate-12 border-2 border-black shadow-[3px_3px_0_#000] opacity-80 pointer-events-none -z-0"></div>
            <div className="absolute top-[520px] -left-5 w-12 h-12 bg-pink-400 rotate-45 border-2 border-black shadow-[2px_2px_0_#000] opacity-70 pointer-events-none -z-0"></div>

            {/* Header / Brand Top Bar */}
            <header className="bg-white border-b-2 border-black sticky top-0 z-30 shadow-sm backdrop-blur-md bg-white/95">
                <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <motion.div
                            whileHover={{ rotate: 10, scale: 1.05 }}
                            className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 border-2 border-black flex items-center justify-center text-white shadow-[2px_2px_0_#000]"
                        >
                            <Package size={22} strokeWidth={2.5} />
                        </motion.div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <h1 className="text-base font-black tracking-tight text-black uppercase">
                                    Mượn Trả Thiết Bị
                                </h1>
                                <span className="bg-amber-300 text-black text-[9px] font-black px-1.5 py-0.5 rounded border border-black shadow-[1px_1px_0_#000]">
                                    GEAR PASS
                                </span>
                            </div>
                            <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                                <span>Greenwich Vietnam • Campus HCM</span>
                                <span>•</span>
                                <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Phòng IT mở cửa
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {user ? (
                            <div className="flex items-center gap-1.5 bg-violet-100 text-slate-900 text-xs px-3 py-1 rounded-full font-black border-2 border-black shadow-[2px_2px_0_#000]">
                                <UserCheck size={14} className="text-violet-700" />
                                <span className="max-w-[110px] truncate">{user.name || user.email}</span>
                            </div>
                        ) : (
                            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-300">
                                Khách vãng lai
                            </span>
                        )}

                        <motion.button
                            whileTap={{ rotate: 180 }}
                            onClick={fetchMyRequests}
                            disabled={loading}
                            title="Làm mới dữ liệu"
                            className="p-2 text-slate-700 hover:text-black bg-white border-2 border-black rounded-xl shadow-[2px_2px_0_#000] hover:shadow-[1px_1px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] active:bg-slate-100 transition-all"
                        >
                            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                        </motion.button>
                    </div>
                </div>
            </header>

            {/* Main Container */}
            <main className="max-w-2xl mx-auto px-4 pt-6 space-y-6 relative z-10">
                {/* Visual Marquee Badges */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-[11px] font-black">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-300 border-2 border-black shadow-[2px_2px_0_#000] whitespace-nowrap">
                        <Zap size={13} className="text-amber-800" /> MƯỢN TRONG 1 PHÚT
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-200 border-2 border-black shadow-[2px_2px_0_#000] whitespace-nowrap">
                        <ShieldCheck size={13} className="text-cyan-800" /> 100% MIỄN PHÍ HỌC TẬP
                    </span>
                    <button
                        onClick={() => setShowWarehouseModal(true)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border-2 border-black shadow-[2px_2px_0_#000] hover:bg-slate-100 whitespace-nowrap text-slate-800"
                    >
                        <MapPin size={13} className="text-rose-600" /> Phòng IT - Floor 2 - Campus HCM
                        <Info size={12} className="text-slate-400" />
                    </button>
                </div>

                {/* Neo Quick Stats Overview */}
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
                        badge={stats.overdue > 0 ? 'ALERT' : null}
                        active={statusFilter === 'overdue'}
                        onClick={() =>
                            setStatusFilter((prev) => (prev === 'overdue' ? 'all' : 'overdue'))
                        }
                    />
                </div>

                {/* 2 Massive Action CTA Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Card 1: Mượn Thiết Bị */}
                    <motion.button
                        whileHover={{ y: -3, scale: 1.01 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => navigate('/borrow/new')}
                        className="group relative flex items-center justify-between p-5 rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 text-white border-2 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)] transition-all overflow-hidden text-left"
                    >
                        <div className="space-y-1 z-10">
                            <span className="inline-block text-[10px] font-black uppercase tracking-widest bg-yellow-300 text-black px-2 py-0.5 rounded border border-black shadow-[1px_1px_0_#000]">
                                Đăng Ký Mới
                            </span>
                            <h3 className="text-xl font-black tracking-tight leading-tight">
                                MƯỢN THIẾT BỊ
                            </h3>
                            <p className="text-xs text-violet-100 font-medium">
                                Chọn loa, mic, máy chiếu & linh kiện
                            </p>
                        </div>
                        <div className="w-13 h-13 rounded-2xl bg-white text-black border-2 border-black flex items-center justify-center shadow-[3px_3px_0_#000] group-hover:rotate-12 transition-transform flex-shrink-0 z-10 p-3">
                            <PlusCircle size={28} strokeWidth={2.5} className="text-indigo-600" />
                        </div>
                    </motion.button>

                    {/* Card 2: Trả Thiết Bị */}
                    <motion.button
                        whileHover={{ y: -3, scale: 1.01 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => navigate('/borrow/return')}
                        className="group relative flex items-center justify-between p-5 rounded-3xl bg-white text-slate-900 border-2 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)] transition-all overflow-hidden text-left"
                    >
                        <div className="space-y-1 z-10">
                            <span className="inline-block text-[10px] font-black uppercase tracking-widest bg-emerald-300 text-black px-2 py-0.5 rounded border border-black shadow-[1px_1px_0_#000]">
                                Hoàn Trả Kho
                            </span>
                            <h3 className="text-xl font-black tracking-tight leading-tight">
                                TRẢ THIẾT BỊ
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                                Báo trả đồ & tra cứu bằng SĐT
                            </p>
                        </div>
                        <div className="w-13 h-13 rounded-2xl bg-emerald-100 text-black border-2 border-black flex items-center justify-center shadow-[3px_3px_0_#000] group-hover:-rotate-12 transition-transform flex-shrink-0 z-10 p-3">
                            <RotateCcw size={26} strokeWidth={2.5} className="text-emerald-700" />
                        </div>
                    </motion.button>
                </div>

                {/* Active Requests List Section */}
                <section className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 rounded-full bg-violet-600 border border-black inline-block"></span>
                            <h2 className="text-sm font-black text-black uppercase tracking-wider">
                                Phiếu Mượn Của Bạn
                            </h2>
                            {openRequests.length > 0 && (
                                <span className="bg-yellow-300 text-black border-2 border-black text-xs px-2.5 py-0.5 rounded-full font-black shadow-[1px_1px_0_#000]">
                                    {openRequests.length}
                                </span>
                            )}
                        </div>

                        {/* Search or Quick Filter */}
                        {openRequests.length > 2 && (
                            <div className="relative w-44">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm mã hoặc món..."
                                    value={searchKeyword}
                                    onChange={(e) => setSearchKeyword(e.target.value)}
                                    className="w-full pl-8 pr-2 py-1.5 text-xs font-bold border-2 border-black rounded-xl bg-white shadow-[2px_2px_0_#000] focus:outline-none"
                                />
                            </div>
                        )}
                    </div>

                    {/* Filter Chips Bar */}
                    {openRequests.length > 1 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold">
                            <button
                                onClick={() => setStatusFilter('all')}
                                className={`px-3 py-1 rounded-xl border border-black shadow-[1px_1px_0_#000] transition-colors ${
                                    statusFilter === 'all'
                                        ? 'bg-black text-white font-black'
                                        : 'bg-white text-slate-700 hover:bg-slate-100'
                                }`}
                            >
                                Tất cả ({openRequests.length})
                            </button>
                            {stats.handedOver > 0 && (
                                <button
                                    onClick={() => setStatusFilter('handed_over')}
                                    className={`px-3 py-1 rounded-xl border border-black shadow-[1px_1px_0_#000] transition-colors ${
                                        statusFilter === 'handed_over'
                                            ? 'bg-violet-600 text-white font-black'
                                            : 'bg-white text-slate-700 hover:bg-slate-100'
                                    }`}
                                >
                                    Đang mượn ({stats.handedOver})
                                </button>
                            )}
                            {stats.pending > 0 && (
                                <button
                                    onClick={() => setStatusFilter('pending')}
                                    className={`px-3 py-1 rounded-xl border border-black shadow-[1px_1px_0_#000] transition-colors ${
                                        statusFilter === 'pending'
                                            ? 'bg-sky-600 text-white font-black'
                                            : 'bg-white text-slate-700 hover:bg-slate-100'
                                    }`}
                                >
                                    Chờ duyệt ({stats.pending})
                                </button>
                            )}
                        </div>
                    )}

                    {loading ? (
                        <div className="p-12 text-center bg-white rounded-3xl border-2 border-black shadow-[4px_4px_0_#000] space-y-3">
                            <RefreshCw size={32} className="animate-spin text-indigo-600 mx-auto" />
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
                        <motion.div
                            initial={{ scale: 0.98, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-center p-8 bg-white rounded-3xl border-2 border-black shadow-[4px_4px_0_#000] space-y-3.5"
                        >
                            <div className="w-16 h-16 bg-amber-100 text-black border-2 border-black rounded-2xl flex items-center justify-center mx-auto shadow-[3px_3px_0_#000] rotate-3">
                                <Package size={32} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-base font-black text-black">
                                Bạn chưa có phiếu mượn nào đang mở
                            </h3>
                            <p className="text-xs text-slate-600 max-w-sm mx-auto font-medium leading-relaxed">
                                Hãy bấm <strong>Mượn Thiết Bị</strong> phía trên để đăng ký mượn mới, hoặc dùng
                                chức năng tra cứu bằng số điện thoại nếu bạn đang dùng máy mới.
                            </p>
                            <div className="pt-1">
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => navigate('/borrow/return')}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-black rounded-xl text-xs font-black shadow-[3px_3px_0_#000] hover:shadow-[1px_1px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                                >
                                    <Search size={14} strokeWidth={2.5} />
                                    Tra cứu phiếu bằng Số Điện Thoại
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </section>

                {/* History Section (Collapsible) */}
                {historyRequests.length > 0 && (
                    <section className="space-y-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setShowHistory((prev) => !prev)}
                            className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-black shadow-[3px_3px_0_#000] hover:shadow-[4px_4px_0_#000] text-slate-900 font-black transition-all text-sm"
                        >
                            <div className="flex items-center gap-2">
                                <History size={18} className="text-slate-600" />
                                <span>Lịch sử mượn trả đã hoàn tất ({historyRequests.length})</span>
                            </div>
                            {showHistory ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>

                        <AnimatePresence>
                            {showHistory && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="space-y-4 pt-1"
                                >
                                    {historyRequests.map((req) => (
                                        <BorrowRequestCard key={req.id} request={req} />
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </section>
                )}

                {/* Warehouse Location Info Banner */}
                <div className="relative p-5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-3xl border-2 border-black shadow-[4px_4px_0_#000] space-y-2">
                    <div className="flex items-center justify-between border-b border-black/10 pb-2">
                        <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-black">
                            <MapPin size={16} className="text-orange-600" />
                            Địa điểm nhận & hoàn trả thiết bị
                        </div>
                        <span className="bg-orange-400 text-black text-[9px] font-black px-2 py-0.5 rounded border border-black shadow-[1px_1px_0_#000]">
                            PHÒNG IT • FLOOR 2
                        </span>
                    </div>

                    <p className="text-xs font-bold text-slate-800">
                        📍 Phòng IT — Floor 2 — Campus HCM
                    </p>

                    <div className="pt-1 text-[11px] font-medium text-slate-600 space-y-1">
                        <p>• Giờ làm việc: <strong>08:00 - 17:30</strong> (Thứ 2 đến Thứ 7 hàng tuần).</p>
                        <p>• Xuất trình email xác nhận hoặc mã phiếu mượn khi đến nhận thiết bị.</p>
                    </div>
                </div>
            </main>

            {/* Warehouse Quick Info Modal */}
            <AnimatePresence>
                {showWarehouseModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white border-[3px] border-black rounded-3xl p-6 shadow-2xl max-w-sm w-full space-y-4"
                        >
                            <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
                                <h3 className="text-base font-black text-black uppercase tracking-tight flex items-center gap-2">
                                    <MapPin size={18} className="text-rose-600" />
                                    Thông Tin Kho Thiết Bị
                                </h3>
                                <button
                                    onClick={() => setShowWarehouseModal(false)}
                                    className="p-1 rounded-lg border border-black hover:bg-slate-100"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-3 text-xs font-medium text-slate-700">
                                <div className="p-3 bg-slate-50 border border-black/10 rounded-xl space-y-1">
                                    <p className="font-bold text-black">Vị trí kho thiết bị:</p>
                                    <p>Phòng IT - Floor 2 - Campus HCM</p>
                                    <p className="text-slate-500">Greenwich Việt Nam — Cơ sở TP. Hồ Chí Minh</p>
                                </div>

                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                                    <p className="font-bold text-emerald-950">Thời gian mở cửa đón tiếp:</p>
                                    <p className="text-emerald-900">Sáng: 08:00 - 11:30</p>
                                    <p className="text-emerald-900">Chiều: 13:30 - 17:30</p>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowWarehouseModal(false)}
                                className="w-full py-2.5 bg-black text-white font-black text-xs rounded-xl shadow-[2px_2px_0_#000]"
                            >
                                Đã Hiểu
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
