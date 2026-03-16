
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { useEvents } from '../hooks/useEvents';
import { useToast } from './Toast';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, Layers, Zap, Box, Activity, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
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

const DnDCalendar = withDragAndDrop(Calendar);

// Department Colors & Gradients
const DEPT_STYLES = {
    'Đào tạo': { from: 'from-blue-500', to: 'to-indigo-600', shadow: 'shadow-blue-500/40', bg: 'bg-blue-500' },
    'CTSV': { from: 'from-emerald-400', to: 'to-teal-600', shadow: 'shadow-emerald-500/40', bg: 'bg-emerald-500' },
    'Tuyển sinh': { from: 'from-amber-400', to: 'to-orange-600', shadow: 'shadow-amber-500/40', bg: 'bg-amber-500' },
    'PDP': { from: 'from-violet-500', to: 'to-purple-600', shadow: 'shadow-violet-500/40', bg: 'bg-violet-500' },
    'QHDN': { from: 'from-pink-500', to: 'to-rose-600', shadow: 'shadow-pink-500/40', bg: 'bg-pink-500' },
    'Hành chính': { from: 'from-slate-500', to: 'to-slate-700', shadow: 'shadow-slate-500/40', bg: 'bg-slate-500' },
    'default': { from: 'from-indigo-500', to: 'to-blue-600', shadow: 'shadow-indigo-500/40', bg: 'bg-indigo-500' }
};

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, colorClass, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.5 }}
        className="bg-white/60 backdrop-blur-md border border-white/50 p-3 rounded-2xl shadow-sm flex items-center gap-3 min-w-[140px]"
    >
        <div className={cn("p-2 rounded-xl text-white shadow-lg", colorClass)}>
            <Icon size={18} />
        </div>
        <div>
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</div>
            <div className="text-lg font-black text-slate-800 leading-none mt-0.5">{value}</div>
        </div>
    </motion.div>
);

// Custom Toolbar
const CustomToolbar = ({ date, onNavigate, onView, view, stats }) => {
    const goToBack = () => onNavigate('PREV');
    const goToNext = () => onNavigate('NEXT');
    const goToToday = () => onNavigate('TODAY');

    return (
        <div className="flex flex-col gap-6 mb-6">
            {/* Top Row: Clean Professional Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 text-white">
                        <Layers size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                            Logistics Timeline
                        </h2>
                        <p className="text-xs text-slate-500 font-medium">
                            Real-time Venue & Resource Management
                        </p>
                    </div>
                </div>

                <div className="flex gap-4">
                    {/* Simplified stats (Text only, no big cards) */}
                    <div className="px-4 py-2 bg-slate-50 rounded-lg border border-slate-100 flex flex-col items-center min-w-[100px]">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Events</span>
                        <span className="text-lg font-black text-slate-800">{stats.total}</span>
                    </div>
                    <div className="px-4 py-2 bg-slate-50 rounded-lg border border-slate-100 flex flex-col items-center min-w-[100px]">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Venues</span>
                        <span className="text-lg font-black text-slate-800">{stats.venues}</span>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Navigation & View Switcher */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/40 backdrop-blur-sm p-2 rounded-3xl border border-white/60 shadow-sm">
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                    <div className="flex items-center bg-white rounded-2xl shadow-sm border border-slate-100 p-1">
                        <button onClick={goToBack} className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-indigo-600">
                            <ChevronLeft size={20} />
                        </button>
                        <span className="text-sm font-bold text-slate-700 min-w-[140px] text-center">
                            {format(date, 'MMMM yyyy')}
                        </span>
                        <button onClick={goToNext} className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-indigo-600">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                    <button onClick={goToToday} className="px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors border border-indigo-100">
                        Today
                    </button>
                </div>

                <div className="flex bg-slate-100/50 p-1 rounded-2xl w-full sm:w-auto">
                    {['day', 'week'].map((v) => (
                        <button
                            key={v}
                            onClick={() => onView(v)}
                            className={cn(
                                "flex-1 sm:flex-none px-6 py-2 text-xs font-bold rounded-xl transition-all capitalize relative overflow-hidden",
                                view === v
                                    ? "bg-white text-indigo-600 shadow-md shadow-indigo-500/10 ring-1 ring-black/5"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                            )}
                        >
                            {view === v && (
                                <motion.div
                                    layoutId="activeView"
                                    className="absolute inset-0 bg-white rounded-xl z-[-1]"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            {v === 'day' ? 'Day View' : 'Week View'}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Custom Resource Header
const ResourceHeader = ({ label }) => {
    return (
        <div className="h-full flex items-center justify-center py-3 bg-white/50 backdrop-blur-sm relative group transition-all duration-300 hover:bg-white/90">
            <span className="relative z-10 text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] group-hover:text-indigo-600 transition-colors duration-300 text-center">
                {label}
            </span>

            {/* Hover Bottom Bar */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-indigo-500 group-hover:w-1/3 transition-all duration-300 ease-out opacity-0 group-hover:opacity-100"></div>
        </div>
    );
};

const CustomEvent = ({ event }) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-full w-full flex flex-col justify-center px-3 overflow-hidden relative group"
        >
            {/* Glass Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

            {/* Left Accent Bar */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-white/30 backdrop-blur-md pointer-events-none"></div>

            <div className="font-bold text-xs truncate leading-tight text-white drop-shadow-md relative z-10 pl-1 pointer-events-none">{event.title}</div>
            <div className="text-[10px] font-medium opacity-90 truncate text-white/90 relative z-10 pl-1 flex items-center gap-1 pointer-events-none">
                <span className="w-1 h-1 rounded-full bg-white/80"></span>
                {event.department}
            </div>
        </motion.div>
    );
};



const LogisticsTimeline = ({ locations = [], events: propEvents }) => {
    const { events: hookEvents, updateEvent } = useEvents();
    const { showSuccess, showError } = useToast();
    const [myEvents, setMyEvents] = useState([]);
    const [view, setView] = useState(Views.DAY);
    const [date, setDate] = useState(new Date());
    const [previewEvent, setPreviewEvent] = useState(null); // Added State

    // Use passed events if available, otherwise use hook events
    const displayEvents = propEvents || hookEvents;

    // Stats Calculation
    const stats = useMemo(() => {
        const total = myEvents.length;
        const venues = new Set(myEvents.map(e => e.resourceId)).size;
        // Simple conflict count (just an example, real logic would be more complex)
        const conflicts = 0;
        return { total, venues, conflicts };
    }, [myEvents]);

    // Prepare Resources (Venues)
    const resources = useMemo(() => {
        return locations.map(loc => ({
            id: loc.name,
            title: loc.name
        }));
    }, [locations]);

    useEffect(() => {
        const formattedEvents = displayEvents.map(event => {
            let start = new Date(event.startDate || event.sessionTime?.start || new Date());
            let end = new Date(event.endDate || event.sessionTime?.end || new Date());

            // SAFETY: If dates are invalid, fallback to now
            if (isNaN(start.getTime())) start = new Date();
            if (isNaN(end.getTime())) end = new Date();

            // SAFETY: Ensure minimum 1 hour duration if start >= end
            if (end <= start) {
                end = new Date(start.getTime() + 60 * 60 * 1000); // Add 1 hour
            }

            return {
                id: event.id,
                title: event.eventName,
                start: start,
                end: end,
                resourceId: event.location,
                department: event.department,
                style: DEPT_STYLES[event.department] || DEPT_STYLES.default,
                allDay: false,
                ...event
            };
        });
        setMyEvents(formattedEvents);
    }, [displayEvents]);

    const moveEvent = useCallback(
        async ({ event, start, end, resourceId }) => {
            const hasConflict = checkConflict(
                { ...event, start, end, resourceId },
                myEvents.filter(e => e.id !== event.id)
            );

            if (hasConflict) {
                showError("Conflict detected! This slot is already booked.");
                return;
            }

            try {
                setMyEvents((prev) => {
                    const filtered = prev.filter((ev) => ev.id !== event.id);
                    return [...filtered, { ...event, start, end, resourceId }];
                });

                await updateEvent(event.id, {
                    startDate: start.toISOString(),
                    endDate: end.toISOString(),
                    location: resourceId,
                    sessionTime: { start: start.toISOString(), end: end.toISOString() }
                });

                showSuccess("Event rescheduled successfully!");
            } catch (error) {
                console.error("Failed to move event", error);
                showError("Failed to update event.");
            }
        },
        [myEvents, updateEvent, showError, showSuccess]
    );

    const resizeEvent = useCallback(
        async ({ event, start, end }) => {
            const hasConflict = checkConflict(
                { ...event, start, end, resourceId: event.resourceId },
                myEvents.filter(e => e.id !== event.id)
            );

            if (hasConflict) {
                showError("Conflict detected! Cannot extend.");
                return;
            }

            try {
                setMyEvents((prev) => {
                    const filtered = prev.filter((ev) => ev.id !== event.id);
                    return [...filtered, { ...event, start, end }];
                });

                await updateEvent(event.id, {
                    startDate: start.toISOString(),
                    endDate: end.toISOString(),
                    sessionTime: { start: start.toISOString(), end: end.toISOString() }
                });
                showSuccess("Event duration updated!");
            } catch (error) {
                console.error("Failed to resize event", error);
                showError("Failed to update duration.");
            }
        },
        [myEvents, updateEvent, showError, showSuccess]
    );

    const eventStyleGetter = (event, start, end, isSelected) => {
        const style = event.style || DEPT_STYLES.default;

        return {
            className: cn(
                "rounded-xl border-0 opacity-90 hover:opacity-100 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] text-xs font-medium p-0.5 overflow-hidden bg-gradient-to-br text-white z-10",
                style.from,
                style.to,
                style.shadow
            ),
            style: {
                backgroundColor: 'transparent',
                color: 'white',
                border: 'none'
            }
        };
    };

    return (
        <div className="bg-white rounded-[24px] shadow-xl shadow-slate-200 border border-slate-100 relative overflow-hidden flex flex-col h-[calc(100vh-120px)]">
            <div className="p-6 pb-0">

                <style>{`
                .rbc-time-view { border: none; }
                .rbc-time-header { border-bottom: 1px solid #e2e8f0; }
                .rbc-time-header-content { border-left: 1px solid #e2e8f0; }
                .rbc-day-slot { background-color: #f8fafc; } /* Light gray bg */
                .rbc-time-slot { border-top: 1px solid #f1f5f9; }
                .rbc-timeslot-group { border-bottom: 1px solid #e2e8f0; min-height: 60px !important; } /* FORCE HEIGHT */
                .rbc-header { padding: 12px 0; font-size: 11px; font-weight: 700; color: #64748b; border-bottom: none; text-transform: uppercase; }
                .rbc-today { background-color: #ffffff; }
                .rbc-time-gutter .rbc-timeslot-group { border-bottom: 1px solid #e2e8f0; background-color: #fff; }
                .rbc-label { font-size: 11px; font-weight: 600; color: #94a3b8; }
                .rbc-current-time-indicator { background-color: #ef4444; height: 2px; }
                .rbc-event { 
                    padding: 2px !important; 
                    background-color: transparent !important; 
                    border: none !important;
                    min-height: auto !important; /* Allow event to stretch */
                } 
            `}</style>

                <DnDCalendar
                    localizer={localizer}
                    events={myEvents}
                    defaultView={Views.DAY}
                    views={['day', 'week']}
                    view={view}
                    onView={setView}
                    date={date}
                    onNavigate={setDate}
                    resources={view === 'day' ? resources : null}
                    resourceIdAccessor="id"
                    resourceTitleAccessor="title"
                    onEventDrop={moveEvent}
                    onEventResize={resizeEvent}
                    onSelectEvent={(event) => setPreviewEvent(event)} // Added Handler
                    resizable
                    step={30}
                    timeslots={2}
                    min={new Date(0, 0, 0, 7, 0, 0)}
                    max={new Date(0, 0, 0, 22, 0, 0)}
                    components={{
                        toolbar: (props) => <CustomToolbar {...props} stats={stats} />,
                        resourceHeader: ResourceHeader,
                        event: CustomEvent
                    }}
                    eventPropGetter={eventStyleGetter}
                    dayLayoutAlgorithm="no-overlap"
                    className="font-sans relative z-10"
                    style={{ height: 850 }}
                />

                {/* EVENT PREVIEW MODAL */}
                <EventPreviewModal
                    isOpen={!!previewEvent}
                    event={previewEvent}
                    onClose={() => setPreviewEvent(null)}
                />
            </div>
        </div>
    );
};

function checkConflict(newEvent, existingEvents) {
    return existingEvents.some(existing => {
        if (existing.resourceId !== newEvent.resourceId) return false;
        const startOverlap = newEvent.start >= existing.start && newEvent.start < existing.end;
        const endOverlap = newEvent.end > existing.start && newEvent.end <= existing.end;
        const encompass = newEvent.start <= existing.start && newEvent.end >= existing.end;
        return startOverlap || endOverlap || encompass;
    });
}

export default LogisticsTimeline;
