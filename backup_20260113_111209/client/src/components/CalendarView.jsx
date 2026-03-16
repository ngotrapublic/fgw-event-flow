import React, { useMemo, useState, useCallback, memo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, MapPin, Clock, User, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import EventPreviewModal from './EventPreviewModal';

const locales = {
    'en-US': enUS,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

const DEPT_COLORS = {
    'tuyển sinh': { bg: 'bg-blue-600', light: 'bg-blue-50', text: 'text-white', hex: '#2563eb' },
    'đào tạo': { bg: 'bg-violet-600', light: 'bg-violet-50', text: 'text-white', hex: '#7c3aed' },
    'công tác sinh viên': { bg: 'bg-emerald-600', light: 'bg-emerald-50', text: 'text-white', hex: '#059669' },
    'quan hệ doanh nghiệp': { bg: 'bg-amber-500', light: 'bg-amber-50', text: 'text-white', hex: '#f59e0b' },
    'hành chính': { bg: 'bg-rose-600', light: 'bg-rose-50', text: 'text-white', hex: '#e11d48' },
    'thư viện': { bg: 'bg-cyan-600', light: 'bg-cyan-50', text: 'text-white', hex: '#0891b2' },
    'default': { bg: 'bg-indigo-600', light: 'bg-indigo-50', text: 'text-white', hex: '#4f46e5' },
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

/**
 * CustomToolbar - Memoized for Phase 3 Step 3A
 * Why: The toolbar only needs to re-render when `date` or `view` changes.
 */
const CustomToolbar = memo(({ date, onNavigate, onView, view }) => {
    return (
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6 p-1">
            <div className="flex items-center gap-6">
                <div className="relative">
                    <h2 className="text-4xl font-black text-black tracking-tighter leading-none">
                        {format(date, 'MMMM')}
                        <span className="block text-lg font-bold text-slate-400 tracking-normal mt-1">{format(date, 'yyyy')}</span>
                    </h2>
                    <div className="absolute -top-4 -left-4 text-indigo-500/10 rotate-12 -z-10">
                        <Sparkles size={64} />
                    </div>
                </div>

                <div className="flex items-center bg-white border-2 border-black rounded-2xl p-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:scale-[1.02]">
                    <button onClick={() => onNavigate('PREV')} className="p-2.5 hover:bg-slate-50 rounded-xl transition-all text-black hover:text-indigo-600">
                        <ChevronLeft size={22} strokeWidth={3} />
                    </button>
                    <button onClick={() => onNavigate('TODAY')} className="px-6 py-2 text-xs font-black text-black hover:bg-indigo-50 hover:text-indigo-700 transition-all uppercase tracking-widest rounded-xl">
                        Today
                    </button>
                    <button onClick={() => onNavigate('NEXT')} className="p-2.5 hover:bg-slate-50 rounded-xl transition-all text-black hover:text-indigo-600">
                        <ChevronRight size={22} strokeWidth={3} />
                    </button>
                </div>
            </div>

            <div className="bg-slate-100/80 backdrop-blur-sm p-1.5 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center relative gap-1">
                {['month', 'week', 'day', 'agenda'].map((v) => (
                    <button
                        key={v}
                        onClick={() => onView(v)}
                        className={cn(
                            "relative px-5 py-2 text-xs font-black rounded-xl transition-all capitalize z-10",
                            view === v ? "text-white" : "text-slate-500 hover:text-black"
                        )}
                    >
                        {view === v && (
                            <motion.div
                                layoutId="calendarViewTab"
                                className="absolute inset-0 bg-black rounded-lg shadow-lg z-[-1]"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        {v}
                    </button>
                ))}
            </div>
        </div>
    );
});

CustomToolbar.displayName = 'CustomToolbar';

/**
 * CustomEvent - Memoized for Phase 3 Step 3A
 * Why: Prevents re-render of all event pills when calendar navigates or view changes.
 * Events only re-render when their specific data changes.
 */
const CustomEvent = memo(({ event }) => {
    const deptInfo = resolveDeptColor(event.resource.department);
    const deptInitial = event.resource.department ? event.resource.department.split(' ').map(w => w[0]).join('') : 'EV';

    return (
        <div
            className={cn(
                "relative group/evt h-full w-full flex items-center px-2 py-1 overflow-visible rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 hover:scale-[1.05] hover:z-50 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                deptInfo.bg
            )}
        >
            <div className="flex items-center gap-2 w-full">
                <div className="w-1.5 h-1.5 rounded-full bg-white/60 shrink-0"></div>
                <span className="text-[10px] font-black text-white whitespace-nowrap opacity-90 leading-none">
                    {event.start ? format(event.start, 'HH:mm') : '00:00'}
                </span>
                <span className="text-[11px] font-black text-white truncate leading-none tracking-tight">
                    {event.title}
                </span>
            </div>

            {/* HOVER TOOLTIP */}
            <div className="hidden md:block absolute left-1/2 -translate-x-1/2 bottom-[120%] w-80 bg-white/98 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border-2 border-black p-5 z-[500] opacity-0 group-hover/evt:opacity-100 group-hover/evt:block transition-all duration-300 pointer-events-none group-hover/evt:pointer-events-auto origin-bottom scale-90 group-hover/evt:scale-100">
                <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-white rotate-45 border-b-2 border-r-2 border-black z-[-1]"></div>
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 pr-4">
                        <h4 className="font-black text-black text-base leading-tight mb-2 uppercase tracking-tight line-clamp-2">{event.title}</h4>
                        <div className="inline-flex items-center gap-2 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                            <Clock size={14} className="text-indigo-600" />
                            <span className="text-xs font-black text-indigo-700">
                                {event.start && format(event.start, 'HH:mm')} — {event.end && format(event.end, 'HH:mm')}
                            </span>
                        </div>
                    </div>
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-xs font-black text-white border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] shrink-0", deptInfo.bg)}>
                        {deptInitial}
                    </div>
                </div>
                <div className="space-y-3">
                    {event.resource.location && (
                        <div className="flex items-start gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100">
                            <MapPin size={16} className="text-rose-500 mt-0.5 shrink-0" />
                            <span className="text-[13px] font-bold text-slate-700 leading-tight">
                                {Array.isArray(event.resource.location) ? event.resource.location.join(', ') : event.resource.location}
                            </span>
                        </div>
                    )}
                    <div className="flex items-center gap-2.5 p-2 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                        <User size={16} className="text-indigo-500 shrink-0" />
                        <span className="text-[13px] font-black text-indigo-900 tracking-tight">
                            {event.resource.department || 'General Event'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
});

CustomEvent.displayName = 'CustomEvent';

/**
 * WeekEvent - Professional Calendar Style (Google/Apple inspired)
 * Design: Minimal, clean, readable
 */
const WeekEvent = memo(({ event }) => {
    const deptInfo = resolveDeptColor(event.resource.department);
    const duration = event.end && event.start
        ? Math.round((event.end - event.start) / (1000 * 60))
        : 60;

    // Adaptive layout based on duration
    const isVeryShort = duration <= 30;
    const isShort = duration <= 60;

    return (
        <div
            className={cn(
                "h-full w-full overflow-hidden rounded-md cursor-pointer",
                "border-l-[3px] bg-white",
                "shadow-[0_1px_3px_rgba(0,0,0,0.08)]",
                "hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)]",
                "transition-shadow duration-200"
            )}
            style={{
                borderLeftColor: deptInfo.hex,
                backgroundColor: `${deptInfo.hex}08`
            }}
        >
            <div className={cn(
                "h-full flex flex-col justify-center px-2",
                isVeryShort ? "py-0" : "py-1"
            )}>
                {!isVeryShort && event.start && event.end && (
                    <div className="flex items-center gap-1 mb-0.5">
                        <div
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: deptInfo.hex }}
                        />
                        <span className="text-[9px] font-semibold text-slate-400">
                            {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                        </span>
                    </div>
                )}

                <span className={cn(
                    "font-semibold text-slate-800 leading-tight",
                    isVeryShort ? "text-[9px] truncate" : isShort ? "text-[10px] truncate" : "text-[11px] line-clamp-2"
                )}>
                    {event.title}
                </span>

                {!isShort && (
                    <span
                        className="text-[9px] font-medium mt-0.5 truncate"
                        style={{ color: deptInfo.hex }}
                    >
                        {event.resource.department}
                    </span>
                )}
            </div>
        </div>
    );
});

WeekEvent.displayName = 'WeekEvent';


const CalendarView = ({ events }) => {
    const [previewEvent, setPreviewEvent] = useState(null);
    const [view, setView] = useState('month');

    const calendarEvents = useMemo(() => {
        return (events || []).map(event => ({
            id: event.id,
            title: event.eventName,
            start: new Date(`${event.eventDate}T${event.startTime || '00:00'}`),
            end: new Date(`${event.eventDate}T${event.endTime || '23:59'}`),
            resource: event
        }));
    }, [events]);

    const handleSelectEvent = useCallback((event) => setPreviewEvent(event.resource), []);

    const eventStyleGetter = useCallback(() => ({
        className: "p-0 bg-transparent border-none overflow-visible",
        style: { backgroundColor: 'transparent', border: 'none', padding: 0 }
    }), []);

    return (
        <div className="bg-white/40 backdrop-blur-2xl p-8 rounded-[48px] shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] border-2 border-black relative overflow-hidden transition-all duration-500">
            <style>{`
                /* === BASE STYLES === */
                .rbc-calendar { font-family: inherit; font-weight: 700; height: 100%; }
                .rbc-header { padding: 16px 8px; font-size: 10px; font-weight: 900; text-transform: uppercase; color: #1e293b; letter-spacing: 2px; border-bottom: 2px solid #e2e8f0 !important; background: #f8fafc; }
                
                /* === MONTH VIEW === */
                .rbc-month-view { border: 2px solid #000 !important; border-radius: 28px; overflow: hidden; background: white; }
                .rbc-day-bg { border-left: 1px solid #f1f5f9 !important; transition: background 0.2s; }
                .rbc-day-bg:hover { background-color: #f8fafc; }
                .rbc-month-row + .rbc-month-row { border-top: 1px solid #f1f5f9 !important; }
                .rbc-date-cell { padding: 12px 16px; font-size: 14px; font-weight: 800; color: #334155; text-align: right; }
                .rbc-off-range-bg { background-color: #fafafa; }
                .rbc-off-range { color: #cbd5e1 !important; }
                
                /* === TODAY HIGHLIGHT === */
                .rbc-today { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%) !important; }
                .rbc-month-view .rbc-today::before { content: 'TODAY'; position: absolute; top: 8px; left: 8px; font-size: 8px; font-weight: 900; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 3px 8px; border-radius: 4px; letter-spacing: 1px; }
                .rbc-today .rbc-date-cell { color: #2563eb; font-weight: 900; }
                
                /* === MONTH EVENTS === */
                .rbc-month-view .rbc-event { background: none !important; border: none !important; padding: 0 !important; margin-bottom: 3px !important; }
                .rbc-event-content { pointer-events: auto; }
                .rbc-row-segment { padding: 1px 4px !important; }
                .rbc-show-more { font-size: 9px; font-weight: 800; color: #6366f1; background: #eef2ff; padding: 4px 10px; border-radius: 6px; margin-top: 4px; border: 1px solid #c7d2fe; cursor: pointer; }
                .rbc-show-more:hover { background: #e0e7ff; }
                
                /* === WEEK/DAY VIEW === */
                .rbc-time-view { border: 2px solid #e2e8f0 !important; border-radius: 20px; overflow: hidden; background: white; }
                .rbc-time-header { border-bottom: none !important; }
                .rbc-time-header-content { border-left: 1px solid #f1f5f9 !important; min-height: 60px; }
                .rbc-time-header .rbc-header { border-bottom: none !important; background: linear-gradient(to bottom, #f8fafc, #ffffff); }
                .rbc-time-header .rbc-today { background: linear-gradient(to bottom, #eff6ff, #dbeafe) !important; }
                .rbc-allday-cell { display: none; }
                .rbc-time-header-gutter { background: #f8fafc; border-right: 1px solid #e2e8f0 !important; }
                
                /* Time Gutter */
                .rbc-time-gutter { background: #fafafa; width: 70px !important; min-width: 70px !important; }
                .rbc-time-gutter .rbc-timeslot-group { border-bottom: none !important; }
                .rbc-label { font-size: 10px !important; font-weight: 700 !important; color: #94a3b8 !important; padding: 0 12px !important; }
                
                /* Time Slots */
                .rbc-timeslot-group { min-height: 48px !important; border-bottom: 1px solid #f1f5f9 !important; }
                .rbc-time-slot { border-top: none !important; }
                .rbc-time-content { border-top: 1px solid #e2e8f0 !important; }
                .rbc-time-content > * + * > * { border-left: 1px solid #f1f5f9 !important; }
                
                /* Day columns */
                .rbc-day-slot { background: white; }
                .rbc-day-slot .rbc-time-slot { border-top: 1px dashed #f1f5f9 !important; }
                .rbc-day-slot.rbc-today { background: linear-gradient(to bottom, rgba(239,246,255,0.5), rgba(219,234,254,0.3)) !important; }
                
                /* Current time indicator */
                .rbc-current-time-indicator { height: 2px !important; background: linear-gradient(to right, #ef4444, #f97316) !important; z-index: 100; }
                .rbc-current-time-indicator::before { content: ''; position: absolute; left: -4px; top: -3px; width: 8px; height: 8px; background: #ef4444; border-radius: 50%; }
                
                /* Week/Day Events - Overlapping Fix */
                .rbc-time-view .rbc-event { 
                    background: transparent !important; 
                    border: none !important; 
                    padding: 0 !important;
                    margin: 0 2px !important;
                }
                .rbc-time-view .rbc-event-label { display: none; }
                .rbc-events-container { 
                    margin-right: 8px !important; 
                }
                
                /* Overlapping events - add gap between them */
                .rbc-day-slot .rbc-events-container {
                    display: flex;
                    gap: 2px;
                }
                .rbc-day-slot .rbc-event {
                    flex: 1;
                    min-width: 0;
                    position: relative !important;
                    left: auto !important;
                    right: auto !important;
                    width: auto !important;
                }
                
                /* Event hover z-index */
                .rbc-event:hover {
                    z-index: 999 !important;
                }
                .rbc-event.rbc-selected { outline: 2px solid #3b82f6 !important; outline-offset: 1px; }
                
                /* Agenda View */
                .rbc-agenda-view { border: 2px solid #e2e8f0 !important; border-radius: 20px; overflow: hidden; }
                .rbc-agenda-table { border: none !important; }
                .rbc-agenda-date-cell, .rbc-agenda-time-cell { font-size: 12px; font-weight: 700; color: #475569; padding: 12px !important; }
                .rbc-agenda-event-cell { font-size: 13px; font-weight: 600; }
            `}</style>

            <Calendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 950 }}
                onSelectEvent={handleSelectEvent}
                eventPropGetter={eventStyleGetter}
                components={{
                    toolbar: CustomToolbar,
                    event: (view === 'week' || view === 'day') ? WeekEvent : CustomEvent
                }}
                views={['month', 'week', 'day', 'agenda']}
                view={view}
                onView={setView}
                popup
                className="font-sans"
            />
            <EventPreviewModal isOpen={!!previewEvent} event={previewEvent} onClose={() => setPreviewEvent(null)} />
        </div>
    );
};

export default CalendarView;
