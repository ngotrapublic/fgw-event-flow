import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
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
    AlertCircle,
    ShieldCheck,
    MapPin,
    Zap,
    Info
} from 'lucide-react';
import { borrowApi } from '../../api/borrow';
import { borrowTokenStore } from '../../lib/borrow-token-store';
import { CLOSED_STATUSES } from '../../lib/borrow-utils';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../Toast';
import BorrowRequestCard from './BorrowRequestCard';
import AccessibleDialog from './AccessibleDialog';

// Accessible Stat Filter Button (WCAG keyboard focusable)
const StatBox = ({
    title,
    value,
    icon: Icon,
    color,
    labelColor,
    onClick,
    active = false,
    badge = null,
    shouldReduceMotion = false
}) => (
    <motion.button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        whileHover={shouldReduceMotion ? undefined : { y: -2 }}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
        className={`w-full min-h-[72px] text-left border-2 border-black rounded-2xl p-3.5 sm:p-4 bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 cursor-pointer flex items-center justify-between group relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
            active ? 'ring-2 ring-indigo-600 bg-slate-50' : 'hover:bg-slate-50'
        }`}
    >
        {badge && (
            <span className="absolute top-1.5 right-1.5 text-xs font-black px-1.5 py-0.5 bg-rose-600 text-white rounded border border-black">
                {badge}
            </span>
        )}
        <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
                {title}
            </p>
            <p className="text-2xl sm:text-3xl font-black text-black leading-none">{value}</p>
        </div>
        <div
            aria-hidden="true"
            className={`p-2.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${color} ${labelColor}`}
        >
            <Icon size={20} strokeWidth={2.5} />
        </div>
    </motion.button>
);

export default function BorrowHome() {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const { showSuccess, showError } = useToast();
    const shouldReduceMotion = useReducedMotion();

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [resendingId, setResendingId] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [showWarehouseModal, setShowWarehouseModal] = useState(false);

    const fetchMyRequests = useCallback(async () => {
        if (authLoading) return;
        setLoading(true);
        setFetchError(null);
        try {
            borrowTokenStore.purgeLegacy();
            const res = await borrowApi.getMy();
            const data = res.data || {};
            setRequests(data.requests || []);
        } catch (err) {
            console.error('[BORROW HOME] Error loading requests:', err);
            if (err.response?.status !== 401) {
                const msg = 'Không thể tải danh sách phiếu mượn. Vui lòng kiểm tra kết nối và thử lại.';
                setFetchError(msg);
                showError(msg);
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

    const stats = useMemo(() => {
        const now = Date.now();
        const handedOver = openRequests.filter((r) => r.status === 'handed_over').length;
        const pending = openRequests.filter((r) => r.status === 'pending').length;
        const unverified = openRequests.filter((r) => r.status === 'unverified').length;
        const approved = openRequests.filter((r) => r.status === 'approved').length;
        const overdue = openRequests.filter(
            (r) =>
                r.isOverdue ||
                (['handed_over', 'return_pending'].includes(r.status) &&
                    r.dueAt &&
                    new Date(r.dueAt).getTime() < now)
        ).length;
        return { handedOver, pending, unverified, approved, overdue };
    }, [openRequests]);

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

    const actionableCount = stats.unverified + stats.approved + stats.overdue;

    return (
        <div className="min-h-screen bg-[#fafafa] text-slate-900 pb-20 relative overflow-x-hidden selection:bg-yellow-300 selection:text-black">
            {/* Decorative floating shapes desktop-only to avoid cluttering mobile */}
            <div aria-hidden="true" className="hidden sm:block absolute top-12 -left-6 w-16 h-16 bg-yellow-400 rounded-full border-2 border-black shadow-[3px_3px_0_#000] opacity-80 pointer-events-none" />
            <div aria-hidden="true" className="hidden sm:block absolute top-64 -right-6 w-14 h-14 bg-cyan-400 rotate-12 border-2 border-black shadow-[3px_3px_0_#000] opacity-80 pointer-events-none" />

            {/* Brand Top Bar */}
            <header className="bg-white border-b-2 border-black sticky top-0 z-30 shadow-sm">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            aria-hidden="true"
                            className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 border-2 border-black flex items-center justify-center text-white shadow-[2px_2px_0_#000] flex-shrink-0"
                        >
                            <Package size={22} strokeWidth={2.5} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <h1 className="text-base font-black tracking-tight text-black uppercase">
                                    Mượn Trả Thiết Bị
                                </h1>
                                <span className="bg-amber-300 text-black text-xs font-black px-1.5 py-0.5 rounded border border-black">
                                    GEAR PASS
                                </span>
                            </div>
                            <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5 truncate">
                                <span>Phòng IT • Campus HCM</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        {user ? (
                            <div className="hidden xs:flex sm:flex items-center gap-1.5 bg-violet-100 text-slate-900 text-xs px-3 py-1.5 rounded-full font-black border-2 border-black">
                                <UserCheck size={14} className="text-violet-700" aria-hidden="true" />
                                <span className="max-w-[110px] truncate">{user.name || user.email}</span>
                            </div>
                        ) : (
                            <span className="hidden sm:inline-block text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1.5 rounded-full border border-slate-300">
                                Khách vãng lai
                            </span>
                        )}

                        <motion.button
                            whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
                            type="button"
                            onClick={fetchMyRequests}
                            disabled={loading}
                            aria-label="Làm mới danh sách phiếu"
                            className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-slate-800 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0_#000] hover:bg-slate-100 transition-colors disabled:opacity-60"
                        >
                            <RefreshCw
                                size={16}
                                aria-hidden="true"
                                className={loading ? 'animate-spin motion-reduce:animate-none' : ''}
                            />
                        </motion.button>
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 pt-5 space-y-6 relative z-10">
                {/* 1. Primary Action CTAs FIRST (above the fold on 360x640 mobile) */}
                <section aria-label="Tác vụ chính" className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <motion.button
                        type="button"
                        whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                        whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                        onClick={() => navigate('/borrow/new')}
                        className="group relative min-h-[96px] flex items-center justify-between p-5 rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 text-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
                    >
                        <div className="space-y-1">
                            <span className="inline-block text-xs font-black uppercase tracking-wider bg-yellow-300 text-black px-2 py-0.5 rounded border border-black">
                                Đăng Ký Mới
                            </span>
                            <h2 className="text-xl font-black tracking-tight leading-tight text-white">
                                MƯỢN THIẾT BỊ
                            </h2>
                            <p className="text-xs text-violet-100 font-medium">
                                Chọn loa, mic, máy chiếu & ngày trả
                            </p>
                        </div>
                        <div
                            aria-hidden="true"
                            className="w-12 h-12 rounded-2xl bg-white text-black border-2 border-black flex items-center justify-center shadow-[2px_2px_0_#000] flex-shrink-0"
                        >
                            <PlusCircle size={26} strokeWidth={2.5} className="text-indigo-700" />
                        </div>
                    </motion.button>

                    <motion.button
                        type="button"
                        whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                        whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                        onClick={() => navigate('/borrow/return')}
                        className="group relative min-h-[96px] flex items-center justify-between p-5 rounded-3xl bg-white text-slate-900 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-50 transition-all text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                    >
                        <div className="space-y-1">
                            <span className="inline-block text-xs font-black uppercase tracking-wider bg-emerald-300 text-black px-2 py-0.5 rounded border border-black">
                                Tra Cứu & Hoàn Trả
                            </span>
                            <h2 className="text-xl font-black tracking-tight leading-tight">
                                TRA CỨU / BÁO TRẢ
                            </h2>
                            <p className="text-xs text-slate-600 font-medium">
                                Dùng SĐT & mã OTP hoặc báo trả đồ
                            </p>
                        </div>
                        <div
                            aria-hidden="true"
                            className="w-12 h-12 rounded-2xl bg-emerald-100 text-black border-2 border-black flex items-center justify-center shadow-[2px_2px_0_#000] flex-shrink-0"
                        >
                            <RotateCcw size={24} strokeWidth={2.5} className="text-emerald-800" />
                        </div>
                    </motion.button>
                </section>

                {/* 2. Actionable / Active Borrow Requests */}
                <section aria-labelledby="section-my-requests-title" className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2">
                            <span aria-hidden="true" className="w-3.5 h-3.5 rounded-full bg-violet-600 border border-black inline-block" />
                            <h2 id="section-my-requests-title" className="text-sm font-black text-black uppercase tracking-wider">
                                {actionableCount > 0 ? 'Việc Bạn Cần Làm & Phiếu Mở' : 'Phiếu Mượn Của Bạn'}
                            </h2>
                            {openRequests.length > 0 && (
                                <span className="bg-yellow-300 text-black border-2 border-black text-xs px-2.5 py-0.5 rounded-full font-black">
                                    {openRequests.length}
                                </span>
                            )}
                        </div>

                        {openRequests.length > 2 && (
                            <div className="relative w-full sm:w-52">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" aria-hidden="true" />
                                <input
                                    id="borrow-home-search"
                                    type="text"
                                    aria-label="Tìm theo mã phiếu hoặc tên thiết bị"
                                    placeholder="Tìm mã hoặc món..."
                                    value={searchKeyword}
                                    onChange={(e) => setSearchKeyword(e.target.value)}
                                    className="w-full min-h-[44px] pl-9 pr-3 py-2 text-xs font-bold border-2 border-black rounded-xl bg-white shadow-[2px_2px_0_#000] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                                />
                            </div>
                        )}
                    </div>

                    {/* Filter Chips Bar (>=44px touch targets) */}
                    {openRequests.length > 1 && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
                            <button
                                type="button"
                                onClick={() => setStatusFilter('all')}
                                aria-pressed={statusFilter === 'all'}
                                className={`min-h-[44px] px-3.5 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0_#000] whitespace-nowrap transition-colors ${
                                    statusFilter === 'all'
                                        ? 'bg-black text-white font-black'
                                        : 'bg-white text-slate-800 hover:bg-slate-100'
                                }`}
                            >
                                Tất cả ({openRequests.length})
                            </button>
                            {stats.handedOver > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('handed_over')}
                                    aria-pressed={statusFilter === 'handed_over'}
                                    className={`min-h-[44px] px-3.5 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0_#000] whitespace-nowrap transition-colors ${
                                        statusFilter === 'handed_over'
                                            ? 'bg-violet-600 text-white font-black'
                                            : 'bg-white text-slate-800 hover:bg-slate-100'
                                    }`}
                                >
                                    Đang mượn ({stats.handedOver})
                                </button>
                            )}
                            {stats.pending > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('pending')}
                                    aria-pressed={statusFilter === 'pending'}
                                    className={`min-h-[44px] px-3.5 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0_#000] whitespace-nowrap transition-colors ${
                                        statusFilter === 'pending'
                                            ? 'bg-sky-700 text-white font-black'
                                            : 'bg-white text-slate-800 hover:bg-slate-100'
                                    }`}
                                >
                                    Chờ duyệt ({stats.pending})
                                </button>
                            )}
                        </div>
                    )}

                    {/* Strictly separate Loading -> Error -> Empty -> Success */}
                    {loading ? (
                        <div role="status" className="p-10 text-center bg-white rounded-3xl border-2 border-black shadow-[4px_4px_0_#000] space-y-3">
                            <RefreshCw size={28} className="animate-spin motion-reduce:animate-none text-indigo-600 mx-auto" aria-hidden="true" />
                            <p className="text-sm font-bold text-slate-600">
                                Đang kiểm tra phiếu mượn của bạn...
                            </p>
                        </div>
                    ) : fetchError ? (
                        <div
                            role="alert"
                            className="text-center p-6 bg-rose-50 rounded-3xl border-2 border-black shadow-[4px_4px_0_#000] space-y-3"
                        >
                            <AlertCircle size={28} className="text-rose-700 mx-auto" aria-hidden="true" />
                            <p className="text-sm font-bold text-rose-950">{fetchError}</p>
                            <button
                                type="button"
                                onClick={fetchMyRequests}
                                className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2 bg-white border-2 border-black rounded-xl text-xs font-black shadow-[2px_2px_0_#000] hover:bg-slate-100"
                            >
                                <RefreshCw size={14} aria-hidden="true" />
                                Thử lại
                            </button>
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
                        <div className="text-center p-7 bg-white rounded-3xl border-2 border-black shadow-[4px_4px_0_#000] space-y-3.5">
                            <div
                                aria-hidden="true"
                                className="w-14 h-14 bg-amber-100 text-black border-2 border-black rounded-2xl flex items-center justify-center mx-auto shadow-[3px_3px_0_#000]"
                            >
                                <Package size={28} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-base font-black text-black">
                                Bạn chưa có phiếu mượn nào đang mở
                            </h3>
                            <p className="text-xs text-slate-600 max-w-sm mx-auto font-medium leading-relaxed">
                                Chọn <strong>MƯỢN THIẾT BỊ</strong> phía trên để đăng ký mới, hoặc tra cứu bằng số điện thoại nếu bạn đã tạo phiếu trên máy khác.
                            </p>
                            <div>
                                <button
                                    type="button"
                                    onClick={() => navigate('/borrow/return')}
                                    className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-black rounded-xl text-xs font-black shadow-[2px_2px_0_#000] hover:bg-slate-100 transition-colors"
                                >
                                    <Search size={14} strokeWidth={2.5} aria-hidden="true" />
                                    Tra cứu phiếu bằng Số Điện Thoại
                                </button>
                            </div>
                        </div>
                    )}
                </section>

                {/* 3. Quick Filter Stats Grid (Moved below active tasks for mobile hierarchy) */}
                {!fetchError && openRequests.length > 0 && (
                    <section aria-label="Lọc nhanh theo trạng thái">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <StatBox
                                title="Đang Mượn"
                                value={stats.handedOver}
                                icon={Package}
                                color="bg-violet-100"
                                labelColor="text-violet-700"
                                active={statusFilter === 'handed_over'}
                                shouldReduceMotion={shouldReduceMotion}
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
                                shouldReduceMotion={shouldReduceMotion}
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
                                shouldReduceMotion={shouldReduceMotion}
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
                                badge={stats.overdue > 0 ? 'KHẨN' : null}
                                active={statusFilter === 'overdue'}
                                shouldReduceMotion={shouldReduceMotion}
                                onClick={() =>
                                    setStatusFilter((prev) => (prev === 'overdue' ? 'all' : 'overdue'))
                                }
                            />
                        </div>
                    </section>
                )}

                {/* 4. History Section (Collapsible) */}
                {historyRequests.length > 0 && (
                    <section aria-label="Lịch sử mượn trả" className="space-y-3">
                        <button
                            type="button"
                            onClick={() => setShowHistory((prev) => !prev)}
                            aria-expanded={showHistory}
                            className="w-full min-h-[48px] flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-black shadow-[3px_3px_0_#000] hover:bg-slate-50 text-slate-900 font-black transition-all text-sm"
                        >
                            <div className="flex items-center gap-2">
                                <History size={18} className="text-slate-700" aria-hidden="true" />
                                <span>Lịch sử mượn trả đã hoàn tất ({historyRequests.length})</span>
                            </div>
                            {showHistory ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
                        </button>

                        <AnimatePresence>
                            {showHistory && (
                                <motion.div
                                    initial={shouldReduceMotion ? false : { height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={shouldReduceMotion ? undefined : { height: 0, opacity: 0 }}
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

                {/* 5. Warehouse Location & Quick Info Footer */}
                <section aria-label="Thông tin kho thiết bị" className="space-y-3">
                    <div className="hidden sm:flex items-center gap-2 overflow-x-auto pb-1 text-xs font-black">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-300 border-2 border-black whitespace-nowrap">
                            <Zap size={13} className="text-amber-900" aria-hidden="true" /> MƯỢN TRONG 1 PHÚT
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-200 border-2 border-black whitespace-nowrap">
                            <ShieldCheck size={13} className="text-cyan-900" aria-hidden="true" /> MIỄN PHÍ HỌC TẬP
                        </span>
                    </div>

                    <div className="relative p-4 sm:p-5 bg-amber-50 rounded-3xl border-2 border-black shadow-[4px_4px_0_#000] space-y-2">
                        <div className="flex items-center justify-between gap-2 border-b border-black/15 pb-2">
                            <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-black">
                                <MapPin size={16} className="text-orange-700" aria-hidden="true" />
                                Địa điểm nhận & hoàn trả thiết bị
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowWarehouseModal(true)}
                                className="min-h-[44px] inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border-2 border-black text-xs font-black hover:bg-slate-100"
                            >
                                <Info size={14} aria-hidden="true" />
                                Giờ mở cửa
                            </button>
                        </div>

                        <p className="text-sm font-bold text-slate-900">
                            Phòng IT — Floor 2 — Campus HCM
                        </p>

                        <div className="text-xs font-medium text-slate-700 space-y-1">
                            <p>• Giờ làm việc: <strong>08:00 - 17:30</strong> (Thứ 2 đến Thứ 7 hàng tuần).</p>
                            <p>• Xuất trình email xác nhận hoặc mã phiếu mượn khi đến nhận thiết bị.</p>
                        </div>
                    </div>
                </section>
            </main>

            {/* Accessible Warehouse Quick Info Modal */}
            <AnimatePresence>
                {showWarehouseModal && (
                    <AccessibleDialog
                        open={showWarehouseModal}
                        onClose={() => setShowWarehouseModal(false)}
                        titleId="warehouse-modal-title"
                    >
                        <div className="border-b-2 border-slate-100 pb-3 pr-12">
                            <h2
                                id="warehouse-modal-title"
                                className="text-base font-black text-black uppercase tracking-tight flex items-center gap-2"
                            >
                                <MapPin size={18} className="text-rose-600" aria-hidden="true" />
                                Thông Tin Kho Thiết Bị
                            </h2>
                        </div>

                        <div className="space-y-3 text-xs font-medium text-slate-700">
                            <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl space-y-1">
                                <p className="font-bold text-black">Vị trí kho thiết bị:</p>
                                <p className="text-slate-900 font-bold">Phòng IT - Floor 2 - Campus HCM</p>
                                <p className="text-slate-600">Greenwich Việt Nam — Cơ sở TP. Hồ Chí Minh</p>
                            </div>

                            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl space-y-1">
                                <p className="font-bold text-emerald-950">Thời gian mở cửa đón tiếp:</p>
                                <p className="text-emerald-900">Sáng: 08:00 - 11:30</p>
                                <p className="text-emerald-900">Chiều: 13:30 - 17:30</p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowWarehouseModal(false)}
                            className="w-full min-h-[44px] py-2.5 bg-black text-white font-black text-xs rounded-xl shadow-[2px_2px_0_#000] hover:bg-slate-800"
                        >
                            Đã Hiểu
                        </button>
                    </AccessibleDialog>
                )}
            </AnimatePresence>
        </div>
    );
}
