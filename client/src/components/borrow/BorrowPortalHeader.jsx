import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
    Package,
    ArrowLeft,
    LayoutDashboard,
    LogIn,
    UserCheck,
    RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function BorrowPortalHeader({
    title = 'Mượn Trả Thiết Bị',
    subtitle = 'Phòng IT • Campus HCM',
    badge = 'GEAR PASS',
    backTo = null,
    backLabel = 'Quay lại',
    onRefresh = null,
    refreshLoading = false
}) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const shouldReduceMotion = useReducedMotion();

    return (
        <header className="bg-white border-b-2 border-black sticky top-0 z-30 shadow-sm">
            <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
                {/* Left: Back button or Logo + Title */}
                <div className="flex items-center gap-3 min-w-0">
                    {backTo ? (
                        <button
                            type="button"
                            onClick={() => navigate(backTo)}
                            aria-label={backLabel}
                            className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center -ml-1 rounded-xl border-2 border-black bg-white hover:bg-slate-100 shadow-[2px_2px_0_#000] transition-colors flex-shrink-0"
                        >
                            <ArrowLeft size={18} strokeWidth={2.5} aria-hidden="true" />
                        </button>
                    ) : (
                        <div
                            aria-hidden="true"
                            className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 border-2 border-black flex items-center justify-center text-white shadow-[2px_2px_0_#000] flex-shrink-0"
                        >
                            <Package size={22} strokeWidth={2.5} />
                        </div>
                    )}

                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <h1 className="text-base font-black tracking-tight text-black uppercase truncate">
                                {title}
                            </h1>
                            {badge && (
                                <span className="bg-amber-300 text-black text-xs font-black px-1.5 py-0.5 rounded border border-black flex-shrink-0">
                                    {badge}
                                </span>
                            )}
                        </div>
                        {subtitle && (
                            <p className="text-xs font-bold text-slate-600 truncate">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>

                {/* Right: Dashboard link / Guest login + Badges + Refresh */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {user ? (
                        <>
                            <div className="hidden md:flex items-center gap-1.5 bg-violet-100 text-slate-900 text-xs px-2.5 py-1.5 rounded-full font-black border border-black">
                                <UserCheck size={13} className="text-violet-700" aria-hidden="true" />
                                <span className="max-w-[110px] truncate">{user.name || user.email}</span>
                            </div>

                            <Link
                                to="/"
                                aria-label="Về Dashboard EventFlow"
                                className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-black text-black bg-white hover:bg-violet-50 border-2 border-black rounded-xl shadow-[2px_2px_0_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all"
                            >
                                <LayoutDashboard size={15} strokeWidth={2.5} className="text-violet-700" aria-hidden="true" />
                                <span className="hidden sm:inline">Về Dashboard</span>
                            </Link>
                        </>
                    ) : (
                        <>
                            <span className="hidden sm:inline-block text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1.5 rounded-full border border-slate-300">
                                Khách — không cần tài khoản
                            </span>

                            <Link
                                to="/login"
                                title="Đăng nhập để tự điền thông tin và xem lịch sử"
                                aria-label="Đăng nhập để tự điền thông tin và xem lịch sử"
                                className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-black text-slate-700 hover:text-black bg-white hover:bg-slate-50 border-2 border-slate-300 hover:border-black rounded-xl transition-all shadow-[1px_1px_0_#000] active:translate-x-[1px] active:translate-y-[1px]"
                            >
                                <LogIn size={14} strokeWidth={2.5} aria-hidden="true" />
                                <span className="hidden sm:inline">Đăng nhập</span>
                            </Link>
                        </>
                    )}

                    {onRefresh && (
                        <motion.button
                            whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
                            type="button"
                            onClick={onRefresh}
                            disabled={refreshLoading}
                            aria-label="Làm mới danh sách phiếu"
                            className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-slate-800 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0_#000] hover:bg-slate-100 transition-colors disabled:opacity-60 cursor-pointer"
                        >
                            <RefreshCw
                                size={16}
                                aria-hidden="true"
                                className={refreshLoading ? 'animate-spin motion-reduce:animate-none' : ''}
                            />
                        </motion.button>
                    )}
                </div>
            </div>
        </header>
    );
}
