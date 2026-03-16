import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { format, subHours } from 'date-fns';
import { Clock, MapPin, User, AlertCircle, CheckCircle2, Package, Truck, ArrowRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import api from '../services/api';

const DEPT_COLORS = {
    'tuyển sinh': { bg: 'bg-blue-600', text: 'text-white', light: 'bg-blue-50/50' },
    'đào tạo': { bg: 'bg-violet-600', text: 'text-white', light: 'bg-violet-50/50' },
    'công tác sinh viên': { bg: 'bg-emerald-600', text: 'text-white', light: 'bg-emerald-50/50' },
    'quan hệ doanh nghiệp': { bg: 'bg-amber-500', text: 'text-white', light: 'bg-amber-50/50' },
    'hành chính': { bg: 'bg-rose-600', text: 'text-white', light: 'bg-rose-50/50' },
    'thư viện': { bg: 'bg-cyan-600', text: 'text-white', light: 'bg-cyan-50/50' },
    'default': { bg: 'bg-slate-600', text: 'text-white', light: 'bg-slate-50/50' },
};

const resolveDeptColor = (deptName) => {
    if (!deptName) return DEPT_COLORS.default;
    const name = deptName.toLowerCase();
    for (const key of Object.keys(DEPT_COLORS)) {
        if (key !== 'default' && name.includes(key)) {
            return DEPT_COLORS[key];
        }
    }
    return DEPT_COLORS.default;
};

const COLUMNS = [
    { id: 'upcoming', title: 'Upcoming', subtitle: '5 Next Items', bg: 'bg-blue-50/40', icon: Package, limit: 5 },
    { id: 'setup', title: 'Setup', subtitle: 'Preparation', bg: 'bg-amber-50/40', icon: Truck },
    { id: 'live', title: 'Live', subtitle: 'In Progress', bg: 'bg-emerald-50/40', icon: CheckCircle2, isLive: true },
    { id: 'cleanup', title: 'Cleanup', subtitle: 'Wrapping up', bg: 'bg-rose-50/40', icon: AlertCircle },
];

const LogisticsKanban = () => {
    const [operationalEvents, setOperationalEvents] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isLoading, setIsLoading] = useState(true);

    const fetchLogistics = useCallback(async () => {
        try {
            const response = await api.get('/events/logistics');
            setOperationalEvents(response.data);
            setIsLoading(false);
        } catch (error) {
            console.error('[Kanban] Fetch error:', error);
            // Non-blocking error
        }
    }, []);

    useEffect(() => {
        fetchLogistics();
        const timer = setInterval(() => {
            setCurrentTime(new Date());
            fetchLogistics();
        }, 30000);
        return () => clearInterval(timer);
    }, []);

    const boardData = useMemo(() => {
        const columns = { upcoming: [], setup: [], live: [], cleanup: [] };
        const now = currentTime.getTime();
        const startOfDay = new Date(currentTime); startOfDay.setHours(0, 0, 0, 0);

        operationalEvents.forEach(event => {
            let start, end;
            if (event.eventDate && event.startTime) {
                const [h, m] = event.startTime.split(':');
                start = new Date(event.eventDate); start.setHours(parseInt(h), parseInt(m), 0, 0);
            } else {
                start = new Date(event.startDate || event.sessionTime?.start || new Date());
            }
            if (event.eventDate && event.endTime) {
                const [h, m] = event.endTime.split(':');
                end = new Date(event.eventDate); end.setHours(parseInt(h), parseInt(m), 0, 0);
            } else {
                end = new Date(event.endDate || event.sessionTime?.end || start.getTime() + 7200000);
            }

            if (!start || isNaN(start.getTime())) return;
            const startTime = start.getTime();
            const endTime = end.getTime();
            let setupStart = subHours(start, 2);
            if (endTime <= now) {
                if (endTime >= startOfDay.getTime()) columns.cleanup.push(event);
            } else if (startTime <= now && endTime > now) {
                columns.live.push(event);
            } else if (setupStart.getTime() <= now && startTime > now) {
                columns.setup.push(event);
            } else {
                columns.upcoming.push(event);
            }
        });

        Object.keys(columns).forEach(key => {
            columns[key].sort((a, b) => {
                const getTime = (e) => new Date(e.eventDate + 'T' + (e.startTime || '00:00')).getTime();
                return getTime(a) - getTime(b);
            });
            const colDef = COLUMNS.find(c => c.id === key);
            if (colDef?.limit) columns[key] = columns[key].slice(0, colDef.limit);
        });

        return columns;
    }, [operationalEvents, currentTime]);

    return (
        <div className="h-auto bg-slate-50/20 backdrop-blur-3xl rounded-[32px] border-2 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] p-6 relative flex flex-col transition-all duration-500 mb-8 overflow-hidden group/board">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Package size={200} className="text-black rotate-12" />
            </div>

            <div className="flex items-center justify-between mb-6 px-1 shrink-0 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="bg-black text-white p-2.5 rounded-xl shadow-[4px_4px_0px_0px_rgba(79,70,229,0.3)]">
                        <Package size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-black tracking-tight leading-none uppercase">Logistics Hub</h2>
                        <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-[0.2em]">Operational Window: ±24h • {isLoading ? 'Syncing...' : 'Real-time'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-white border-2 border-black rounded-xl px-4 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] font-black text-slate-400 leading-none mb-0.5 uppercase">Current Time</span>
                        <span className="text-base font-black text-black tabular-nums leading-none tracking-tight">
                            {format(currentTime, 'HH:mm')}
                        </span>
                    </div>
                    <div className="w-px h-6 bg-slate-200" />
                    <Clock size={16} className="text-indigo-500 animate-[spin_8s_linear_infinite]" />
                </div>
            </div>

            <div className="overflow-x-auto overflow-y-visible">
                <div className="flex gap-4 h-auto min-w-[1000px] items-start pb-4">
                    {COLUMNS.map(col => (
                        <div key={col.id} className={cn(
                            "flex-1 flex flex-col h-auto rounded-[28px] border-2 border-black/5 p-3 min-w-0 transition-all duration-300 relative",
                            col.bg
                        )}>
                            <div className="flex items-center gap-3 px-3 py-3 rounded-xl border-2 border-black mb-4 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-10 sticky top-0">
                                <col.icon size={14} strokeWidth={3} className="text-black" />
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-black text-xs text-black uppercase tracking-tight truncate">{col.title}</h3>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{col.subtitle}</p>
                                </div>
                                <span className="px-2 py-0.5 bg-black text-white rounded-lg text-[10px] font-black tabular-nums">
                                    {boardData[col.id]?.length || 0}
                                </span>
                                {col.isLive && (
                                    <div className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white shadow-sm"></span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3 px-1 h-auto">
                                <AnimatePresence mode="popLayout">
                                    {boardData[col.id]?.map((event) => (
                                        <KanbanCard key={event.id} event={event} />
                                    ))}
                                </AnimatePresence>
                                {boardData[col.id]?.length === 0 && (
                                    <div className="py-12 border-2 border-dashed border-black/5 rounded-[24px] flex flex-col items-center justify-center opacity-40 gap-2">
                                        <Sparkles size={24} className="text-slate-300" />
                                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Available</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

/**
 * KanbanCard - Memoized for Phase 3 Step 3A
 * Why: Prevents re-render when parent's `currentTime` updates every 30s.
 * Cards only re-render when their specific `event` object changes.
 */
const KanbanCard = memo(({ event }) => {
    let start, end;
    if (event.eventDate && event.startTime) {
        const [h, m] = event.startTime.split(':');
        start = new Date(event.eventDate); start.setHours(parseInt(h), parseInt(m), 0, 0);
    } else {
        start = new Date(event.startDate || event.sessionTime?.start || new Date());
    }
    if (event.eventDate && event.endTime) {
        const [h, m] = event.endTime.split(':');
        end = new Date(event.eventDate); end.setHours(parseInt(h), parseInt(m), 0, 0);
    } else {
        end = new Date(event.endDate || event.sessionTime?.end || start.getTime() + 7200000);
    }

    const deptInfo = resolveDeptColor(event.department);
    const deptInitial = event.department ? event.department.split(' ').map(w => w[0]).join('') : 'EV';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="group relative bg-white rounded-xl p-3.5 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer hover:translate-x-[-1.5px] hover:translate-y-[-1.5px]"
        >
            <div className="flex items-center justify-between mb-3">
                <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rotate-[-4deg] group-hover:rotate-0 transition-all",
                    deptInfo.bg
                )}>
                    {deptInitial}
                </div>
                <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[9px] font-black uppercase tracking-widest border border-indigo-100">
                        <Sparkles size={8} fill="currentColor" />
                        {format(start, 'dd/MM/yyyy')}
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-black text-white rounded-lg text-[10px] font-black tabular-nums tracking-tighter shadow-sm">
                        <Clock size={10} strokeWidth={3} />
                        {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                    </div>
                </div>
            </div>

            <h4 className="font-black text-black text-[12px] leading-snug mb-3 uppercase tracking-tight line-clamp-2 min-h-[1.2rem] group-hover:text-indigo-600 transition-colors">
                {event.eventName}
            </h4>

            <div className="pt-3 border-t-2 border-slate-50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                    <div className="p-1 bg-rose-50 rounded-md border border-rose-100 shrink-0">
                        <MapPin size={9} className="text-rose-500" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 truncate uppercase tracking-tighter">
                        {event.location || 'Hub'}
                    </span>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight size={14} strokeWidth={4} className="text-black" />
                </div>
            </div>
        </motion.div>
    );
});

KanbanCard.displayName = 'KanbanCard';

export default LogisticsKanban;
