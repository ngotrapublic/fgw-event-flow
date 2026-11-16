import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock, Mail, Package } from 'lucide-react';

function StatBox({
    title,
    value,
    icon: Icon,
    color,
    labelColor,
    onClick,
    active = false,
    badge = null,
    shouldReduceMotion = false
}) {
    return (
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
}

export default function BorrowStatGrid({
    stats,
    statusFilter,
    onToggleFilter,
    shouldReduceMotion = false
}) {
    return (
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
                    onClick={() => onToggleFilter('handed_over')}
                />
                <StatBox
                    title="Chờ Duyệt"
                    value={stats.pending}
                    icon={Clock}
                    color="bg-sky-100"
                    labelColor="text-sky-700"
                    active={statusFilter === 'pending'}
                    shouldReduceMotion={shouldReduceMotion}
                    onClick={() => onToggleFilter('pending')}
                />
                <StatBox
                    title="Chờ Xác Nhận"
                    value={stats.unverified}
                    icon={Mail}
                    color="bg-amber-100"
                    labelColor="text-amber-700"
                    active={statusFilter === 'unverified'}
                    shouldReduceMotion={shouldReduceMotion}
                    onClick={() => onToggleFilter('unverified')}
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
                    onClick={() => onToggleFilter('overdue')}
                />
            </div>
        </section>
    );
}

