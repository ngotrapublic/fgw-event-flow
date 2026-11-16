import React, { useState, useMemo } from 'react';
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
    AlertCircle,
    ShieldCheck,
    MapPin,
    Zap,
    Info
} from 'lucide-react';
import { borrowApi } from '../../api/borrow';
import { isRequestOverdue } from '../../lib/borrow-utils';
import { useAuth } from '../../context/AuthContext';
import { useBorrowRequests } from '../../hooks/useBorrowRequests';
import { useToast } from '../Toast';
import BorrowRequestCard from './BorrowRequestCard';
import BorrowStatGrid from './BorrowStatGrid';
import WarehouseInfoDialog from './WarehouseInfoDialog';
import BorrowPortalHeader from './BorrowPortalHeader';

export default function BorrowHome() {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const { showSuccess, showError } = useToast();
    const shouldReduceMotion = useReducedMotion();

    const {
        loading,
        fetchError,
        refetch: fetchMyRequests,
        openRequests,
        closedRequests: historyRequests,
        stats
    } = useBorrowRequests({
        userUid: user?.uid,
        authLoading,
        onError: showError,
        ignore401: true
    });

    const [resendingId, setResendingId] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [showWarehouseModal, setShowWarehouseModal] = useState(false);

    const handleResendVerification = async (request) => {
        setResendingId(request.id);
        try {
            await borrowApi.resendVerification(request.id);
            showSuccess('Đã gửi lại email xác nhận! Vui lòng kiểm tra hộp thư.');
        } catch (err) {
            showError(
                err.response?.data?.error ||
                    'Không thể gửi lại email xác nhận, vui lòng thử lại sau 60 giây.'
            );
        } finally {
            setResendingId(null);
        }
    };

    const filteredOpenRequests = useMemo(() => {
        let list = openRequests;
        if (statusFilter !== 'all') {
            list =
                statusFilter === 'overdue'
                    ? list.filter((r) => isRequestOverdue(r))
                    : list.filter((r) => r.status === statusFilter);
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
            <div aria-hidden="true" className="hidden sm:block absolute top-12 -left-6 w-16 h-16 bg-yellow-400 rounded-full border-2 border-black shadow-[3px_3px_0_#000] opacity-80 pointer-events-none" />
            <div aria-hidden="true" className="hidden sm:block absolute top-64 -right-6 w-14 h-14 bg-cyan-400 rotate-12 border-2 border-black shadow-[3px_3px_0_#000] opacity-80 pointer-events-none" />

            <BorrowPortalHeader
                onRefresh={fetchMyRequests}
                refreshLoading={loading}
            />

            <main className="max-w-2xl mx-auto px-4 pt-5 space-y-6 relative z-10">
                {/* Primary Action CTAs */}
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

                {/* Open Requests List */}
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

                {/* Quick Filter Stats Grid */}
                {!fetchError && openRequests.length > 0 && (
                    <BorrowStatGrid
                        stats={stats}
                        statusFilter={statusFilter}
                        onToggleFilter={(key) =>
                            setStatusFilter((prev) => (prev === key ? 'all' : key))
                        }
                        shouldReduceMotion={shouldReduceMotion}
                    />
                )}

                {/* History */}
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

                {/* Warehouse Location Footer */}
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

            <AnimatePresence>
                {showWarehouseModal && (
                    <WarehouseInfoDialog
                        open={showWarehouseModal}
                        onClose={() => setShowWarehouseModal(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
