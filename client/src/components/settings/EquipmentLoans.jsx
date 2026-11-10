import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Package,
    QrCode,
    RefreshCw,
    Search,
    Clock,
    CheckCircle2,
    Truck,
    RotateCcw,
    AlertTriangle,
    Layers,
    Loader2,
    Inbox,
    ChevronDown,
    X
} from 'lucide-react';
import { borrowAdminApi } from '../../api/borrow-admin';
import { useToast } from '../Toast';
import AdminBorrowCard from './AdminBorrowCard';
import BorrowDetailModal from './BorrowDetailModal';
import { isRequestOverdue } from './borrowAdminConstants';

const TABS = [
    {
        id: 'pending',
        label: 'Chờ duyệt',
        icon: Clock,
        countKey: 'pending',
        activeBg: 'bg-sky-300',
        badgeBg: 'bg-sky-500 text-white'
    },
    {
        id: 'approved',
        label: 'Đã duyệt',
        icon: CheckCircle2,
        countKey: 'approved',
        activeBg: 'bg-emerald-300',
        badgeBg: 'bg-emerald-600 text-white'
    },
    {
        id: 'handed_over',
        label: 'Đang mượn',
        icon: Truck,
        countKey: 'handed_over',
        activeBg: 'bg-violet-300',
        badgeBg: 'bg-violet-600 text-white'
    },
    {
        id: 'return_pending',
        label: 'Chờ kiểm',
        icon: RotateCcw,
        countKey: 'return_pending',
        activeBg: 'bg-teal-300',
        badgeBg: 'bg-teal-600 text-white'
    },
    {
        id: 'overdue',
        label: 'Quá hạn',
        icon: AlertTriangle,
        countKey: 'overdue',
        activeBg: 'bg-rose-300',
        badgeBg: 'bg-rose-600 text-white'
    },
    {
        id: 'all',
        label: 'Tất cả',
        icon: Layers,
        countKey: null,
        activeBg: 'bg-amber-300',
        badgeBg: 'bg-slate-800 text-white'
    }
];

export default function EquipmentLoans() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { showError } = useToast();

    const [activeTab, setActiveTab] = useState('pending');
    const [counts, setCounts] = useState({
        pending: 0,
        approved: 0,
        handed_over: 0,
        return_pending: 0,
        overdue: 0
    });
    const [requests, setRequests] = useState([]);
    const [nextCursor, setNextCursor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');

    // Selected request & initial action for BorrowDetailModal
    const [modalState, setModalState] = useState({ request: null, action: null });

    const fetchCounts = useCallback(async () => {
        try {
            const res = await borrowAdminApi.counts();
            setCounts({
                pending: res.data?.pending || 0,
                approved: res.data?.approved || 0,
                handed_over: res.data?.handed_over || 0,
                return_pending: res.data?.return_pending || 0,
                overdue: res.data?.overdue || 0
            });
        } catch (err) {
            console.error('[EQUIPMENT LOANS] Error fetching counts:', err);
        }
    }, []);

    const buildQueryParams = useCallback((tabId, cursor = null) => {
        const params = { limit: 50 };
        if (tabId === 'overdue') {
            params.overdue = true;
        } else if (tabId !== 'all') {
            params.status = tabId;
        }
        if (cursor) {
            params.cursor = cursor;
        }
        return params;
    }, []);

    const fetchRequests = useCallback(
        async (tabId, cursor = null) => {
            if (cursor) {
                setLoadingMore(true);
            } else {
                setLoading(true);
            }

            try {
                const res = await borrowAdminApi.list(buildQueryParams(tabId, cursor));
                const list = res.data?.requests || [];
                const next = res.data?.nextCursor || null;

                if (cursor) {
                    setRequests((prev) => {
                        const existingIds = new Set(prev.map((r) => r.id));
                        return [...prev, ...list.filter((r) => !existingIds.has(r.id))];
                    });
                } else {
                    setRequests(list);
                }
                setNextCursor(next);
            } catch (err) {
                console.error('[EQUIPMENT LOANS] Error listing requests:', err);
                showError(err.response?.data?.error || 'Không thể tải danh sách phiếu mượn.');
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [buildQueryParams, showError]
    );

    const refreshAll = useCallback(() => {
        fetchCounts();
        fetchRequests(activeTab);
    }, [activeTab, fetchCounts, fetchRequests]);

    useEffect(() => {
        fetchCounts();
    }, [fetchCounts]);

    useEffect(() => {
        fetchRequests(activeTab);
    }, [activeTab, fetchRequests]);

    // Deep-link from NotificationDropdown (?requestId=...)
    const deepLinkRequestId = searchParams.get('requestId');
    useEffect(() => {
        if (!deepLinkRequestId) return;
        let cancelled = false;
        async function openDeepLinkedRequest() {
            try {
                const res = await borrowAdminApi.get(deepLinkRequestId);
                if (!cancelled && res.data) {
                    const reqData = res.data;
                    if (isRequestOverdue(reqData)) {
                        setActiveTab('overdue');
                    } else if (
                        ['pending', 'approved', 'handed_over', 'return_pending'].includes(
                            reqData.status
                        )
                    ) {
                        setActiveTab(reqData.status);
                    } else {
                        setActiveTab('all');
                    }
                    setModalState({ request: reqData, action: null });
                }
            } catch (err) {
                if (!cancelled) {
                    showError(
                        err.response?.data?.error || 'Không tìm thấy phiếu mượn từ thông báo.'
                    );
                }
            } finally {
                if (!cancelled) {
                    const nextParams = new URLSearchParams(searchParams);
                    nextParams.delete('requestId');
                    setSearchParams(nextParams, { replace: true });
                }
            }
        }
        openDeepLinkedRequest();
        return () => {
            cancelled = true;
        };
    }, [deepLinkRequestId, searchParams, setSearchParams, showError]);

    const filteredRequests = useMemo(() => {
        const kw = searchKeyword.trim().toLowerCase();
        if (!kw) return requests;
        return requests.filter((req) => {
            const idMatch = (req.id || '').toLowerCase().includes(kw);
            const nameMatch = (req.borrower?.name || '').toLowerCase().includes(kw);
            const emailMatch = (req.borrower?.email || '').toLowerCase().includes(kw);
            const phoneMatch = (req.borrower?.phone || '').toLowerCase().includes(kw);
            const itemMatch = (req.items || []).some((it) =>
                (it.label || it.resourceId || '').toLowerCase().includes(kw)
            );
            return idMatch || nameMatch || emailMatch || phoneMatch || itemMatch;
        });
    }, [requests, searchKeyword]);

    return (
        <div className="space-y-6 pb-10">
            {/* Page Header */}
            <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-[4px_4px_0_#000] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-300 border-2 border-black shadow-[3px_3px_0_#000] flex items-center justify-center flex-shrink-0">
                        <Package size={24} strokeWidth={2.5} className="text-black" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight">
                            Quản Lý Mượn Trả Thiết Bị
                        </h1>
                        <p className="text-xs font-bold text-slate-500 mt-0.5">
                            Xét duyệt yêu cầu, xác nhận bàn giao & kiểm kê hoàn trả kho thiết bị
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        type="button"
                        onClick={refreshAll}
                        className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-black font-black text-xs border-2 border-black rounded-xl shadow-[3px_3px_0_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#000] transition-all flex items-center gap-1.5"
                    >
                        <RefreshCw size={15} strokeWidth={2.5} className={loading ? 'animate-spin' : ''} />
                        Làm mới
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/equipment-loans/qr')}
                        className="px-4 py-2.5 bg-amber-300 hover:bg-amber-400 text-black font-black text-xs border-2 border-black rounded-xl shadow-[3px_3px_0_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#000] transition-all flex items-center gap-1.5"
                    >
                        <QrCode size={16} strokeWidth={2.5} />
                        In Mã QR Trạm Mượn
                    </button>
                </div>
            </div>

            {/* Filter Tabs + Search Row */}
            <div className="space-y-3.5">
                <div className="flex flex-wrap gap-2">
                    {TABS.map((tab) => {
                        const TabIcon = tab.icon;
                        const isActive = activeTab === tab.id;
                        const countVal = tab.countKey ? counts[tab.countKey] : null;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-3.5 py-2 rounded-xl border-2 border-black font-black text-xs transition-all flex items-center gap-2 ${
                                    isActive
                                        ? `${tab.activeBg} text-black shadow-[3px_3px_0_#000] -translate-x-[1px] -translate-y-[1px]`
                                        : 'bg-white text-slate-700 hover:bg-slate-50 shadow-[2px_2px_0_#000]'
                                }`}
                            >
                                <TabIcon size={14} strokeWidth={2.5} />
                                <span>{tab.label}</span>
                                {countVal !== null && (
                                    <span
                                        className={`px-2 py-0.5 rounded-full text-[11px] font-black leading-none border border-black ${
                                            countVal > 0
                                                ? tab.badgeBg
                                                : 'bg-slate-100 text-slate-500'
                                        }`}
                                    >
                                        {countVal}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Search Input */}
                <div className="relative max-w-md">
                    <Search
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        type="text"
                        placeholder="Tìm theo tên, email, SĐT, mã phiếu hoặc tên thiết bị..."
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        className="w-full h-10 pl-10 pr-9 text-xs font-bold bg-white border-2 border-black rounded-xl shadow-[3px_3px_0_#000] focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:font-medium"
                    />
                    {searchKeyword && (
                        <button
                            type="button"
                            onClick={() => setSearchKeyword('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-slate-100 text-slate-500"
                            aria-label="Xoá tìm kiếm"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Request Cards Grid */}
            {loading ? (
                <div className="p-14 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0_#000] text-center space-y-3">
                    <Loader2 size={34} className="animate-spin text-indigo-600 mx-auto" />
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                        Đang tải danh sách phiếu mượn...
                    </p>
                </div>
            ) : filteredRequests.length === 0 ? (
                <div className="p-12 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0_#000] text-center space-y-2.5">
                    <div className="w-14 h-14 bg-slate-100 border-2 border-black rounded-2xl flex items-center justify-center mx-auto shadow-[2px_2px_0_#000]">
                        <Inbox size={26} strokeWidth={2.5} className="text-slate-500" />
                    </div>
                    <h3 className="text-sm font-black text-black">
                        {searchKeyword
                            ? 'Không tìm thấy phiếu mượn phù hợp với từ khoá'
                            : 'Không có phiếu mượn nào ở mục này'}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                        {searchKeyword
                            ? 'Thử đổi từ khoá tìm kiếm hoặc xoá bộ lọc.'
                            : 'Các phiếu mới hoặc chuyển trạng thái sẽ xuất hiện tại đây.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredRequests.map((req) => (
                            <AdminBorrowCard
                                key={req.id}
                                request={req}
                                onSelect={(r) => setModalState({ request: r, action: null })}
                                onQuickAction={(r, action) =>
                                    setModalState({ request: r, action })
                                }
                            />
                        ))}
                    </div>

                    {nextCursor && !searchKeyword && (
                        <div className="flex justify-center pt-2">
                            <button
                                type="button"
                                onClick={() => fetchRequests(activeTab, nextCursor)}
                                disabled={loadingMore}
                                className="px-6 py-2.5 bg-white hover:bg-slate-50 text-black font-black text-xs border-2 border-black rounded-xl shadow-[3px_3px_0_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {loadingMore ? (
                                    <>
                                        <Loader2 size={15} className="animate-spin" /> Đang tải thêm...
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown size={15} strokeWidth={3} /> Tải thêm phiếu cũ hơn
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Detail & Action Modal */}
            {modalState.request && (
                <BorrowDetailModal
                    request={modalState.request}
                    initialAction={modalState.action}
                    onClose={() => setModalState({ request: null, action: null })}
                    onSuccess={refreshAll}
                />
            )}
        </div>
    );
}
