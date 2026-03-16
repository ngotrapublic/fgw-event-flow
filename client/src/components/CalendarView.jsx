import React, { useMemo, useState, useCallback, memo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import EventPreviewModal from './EventPreviewModal';

const locales = {
    'vi': vi,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 1 }), // Start week on Monday
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
                    <h2 className="text-4xl font-black text-black tracking-tighter leading-none" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                        {format(date, 'MMMM', { locale: vi })}
                        <span className="block text-lg font-bold text-slate-400 tracking-normal mt-1">{format(date, 'yyyy')}</span>
                    </h2>
                    <div className="absolute -top-4 -left-4 text-indigo-500/10 rotate-12 -z-10">
                        <Sparkles size={64} />
                    </div>
                </div>

                <div className="flex items-center bg-white border-2 border-black rounded-2xl p-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:scale-[1.02]">
                    <button onClick={() => onNavigate('PREV')} aria-label="Tháng trước" className="p-2.5 hover:bg-slate-50 rounded-xl transition-all text-black hover:text-indigo-600">
                        <ChevronLeft size={22} strokeWidth={3} />
                    </button>
                    <button onClick={() => onNavigate('TODAY')} aria-label="Hôm nay" className="px-6 py-2 text-xs font-black text-black hover:bg-indigo-50 hover:text-indigo-700 transition-all uppercase tracking-widest rounded-xl" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                        Hôm nay
                    </button>
                    <button onClick={() => onNavigate('NEXT')} aria-label="Tháng sau" className="p-2.5 hover:bg-slate-50 rounded-xl transition-all text-black hover:text-indigo-600">
                        <ChevronRight size={22} strokeWidth={3} />
                    </button>
                </div>
            </div>

            <div className="bg-slate-100/80 backdrop-blur-sm p-1.5 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center relative gap-1">
                {[{ key: 'month', label: 'Tháng' }, { key: 'week', label: 'Tuần' }, { key: 'day', label: 'Ngày' }, { key: 'agenda', label: 'Lịch trình' }].map((v) => (
                    <button
                        key={v.key}
                        onClick={() => onView(v.key)}
                        className={cn(
                            "relative px-5 py-2 text-xs font-black rounded-xl transition-all z-10",
                            view === v.key ? "text-white" : "text-slate-500 hover:text-black"
                        )}
                        style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}
                    >
                        {view === v.key && (
                            <motion.div
                                layoutId="calendarViewTab"
                                className="absolute inset-0 bg-black rounded-lg shadow-lg z-[-1]"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        {v.label}
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

    return (
        <div
            className={cn(
                "relative h-full w-full flex items-center px-2 py-1 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer",
                deptInfo.bg
            )}
            title="Click để xem chi tiết"
        >
            <div className="flex items-center gap-2 w-full">
                <div className="w-1.5 h-1.5 rounded-full bg-white/60 shrink-0"></div>
                <span className="text-[10px] font-black text-white whitespace-nowrap opacity-90 leading-none" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                    {event.start ? format(event.start, 'HH:mm') : '00:00'}
                </span>
                <span className="text-[11px] font-black text-white truncate leading-none tracking-tight" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                    {event.title}
                </span>
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
                .rbc-calendar { font-family: 'Be Vietnam Pro', system-ui, sans-serif; font-weight: 700; height: 100%; }
                .rbc-header { padding: 12px 8px; font-size: 10px; font-weight: 900; text-transform: uppercase; color: #1e293b; letter-spacing: 2px; border-bottom: 2px solid #e2e8f0 !important; background: #f8fafc; font-family: 'Be Vietnam Pro', sans-serif; }
                
                /* === WEEKEND STYLING === */
                .rbc-header:first-child { background: #f8fafc !important; } /* Monday */
                .rbc-header:nth-child(6) { background: #fef2f2 !important; color: #dc2626 !important; } /* Saturday */
                .rbc-header:nth-child(7) { background: #fef2f2 !important; color: #dc2626 !important; } /* Sunday */
                .rbc-day-bg:nth-child(6), .rbc-day-bg:nth-child(7) { background: rgba(254, 226, 226, 0.3) !important; }
                
                /* === MONTH VIEW === */
                .rbc-month-view { border: 2px solid #000 !important; border-radius: 28px; overflow: hidden; background: white; }
                .rbc-day-bg { border-left: 1px solid #f1f5f9 !important; transition: background 0.2s; }
                .rbc-day-bg:hover { background-color: #f8fafc; }
                .rbc-month-row + .rbc-month-row { border-top: 1px solid #f1f5f9 !important; }
                .rbc-date-cell { padding: 8px 12px; font-size: 13px; font-weight: 800; color: #334155; text-align: right; font-family: 'Be Vietnam Pro', sans-serif; position: relative; z-index: 1; }
                .rbc-off-range-bg { background-color: #fafafa; }
                .rbc-off-range { color: #cbd5e1 !important; }
                
                /* === TODAY HIGHLIGHT === */
                .rbc-day-bg.rbc-today { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%) !important; position: relative; }
                .rbc-day-bg.rbc-today::before { content: 'HÔM NAY'; position: absolute; top: 8px; left: 8px; font-size: 8px; font-weight: 900; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 3px 8px; border-radius: 4px; letter-spacing: 1px; font-family: 'Be Vietnam Pro', sans-serif; z-index: 10; }
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
                style={{ height: 700 }}
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
