import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Clock, Calendar, Box, Loader2 } from 'lucide-react';
import api from '../services/api';
import EventPreviewModal from './EventPreviewModal';

const TYPE_TITLES = {
    today: 'Sự kiện Hôm nay',
    tomorrow: 'Sự kiện Ngày mai',
    week: 'Sự kiện 7 ngày tới',
    now: 'Sự kiện Đang diễn ra'
};

const TYPE_COLORS = {
    today: { bg: 'bg-blue-500', shadow: 'shadow-[4px_4px_0_#1e3a8a]', border: 'border-blue-900', text: 'text-blue-900', lightBg: 'bg-blue-50' },
    tomorrow: { bg: 'bg-emerald-500', shadow: 'shadow-[4px_4px_0_#064e3b]', border: 'border-emerald-900', text: 'text-emerald-900', lightBg: 'bg-emerald-50' },
    week: { bg: 'bg-purple-500', shadow: 'shadow-[4px_4px_0_#4c1d95]', border: 'border-purple-900', text: 'text-purple-900', lightBg: 'bg-purple-50' },
    now: { bg: 'bg-pink-500', shadow: 'shadow-[4px_4px_0_#831843]', border: 'border-pink-900', text: 'text-pink-900', lightBg: 'bg-pink-50' }
};

const DEPT_COLORS = {
    'tuyển sinh': 'bg-blue-500 text-white',
    'đào tạo': 'bg-violet-500 text-white',
    'công tác sinh viên': 'bg-emerald-500 text-white',
    'quan hệ doanh nghiệp': 'bg-amber-500 text-white',
    'hành chính': 'bg-rose-500 text-white',
    'thư viện': 'bg-cyan-500 text-white',
    'default': 'bg-slate-700 text-white'
};

const getDeptColor = (deptName) => {
    if (!deptName) return DEPT_COLORS.default;
    const name = deptName.toLowerCase();
    for (const key of Object.keys(DEPT_COLORS)) {
        if (key !== 'default' && name.includes(key)) return DEPT_COLORS[key];
    }
    return DEPT_COLORS.default;
};

const formatDate = (isoDate) => {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}` : isoDate;
};

const StatDrilldownModal = ({ isOpen, onClose, type, department }) => {
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState(null);

    useEffect(() => {
        let isMounted = true;
        const fetchDetails = async () => {
            if (!isOpen || !type) return;
            setIsLoading(true);
            try {
                const params = { type };
                if (department) params.department = department;
                const res = await api.get('/events/stat-details', { params });
                if (isMounted) setEvents(res.data || []);
            } catch (error) {
                console.error("Failed to fetch stat details:", error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchDetails();
        return () => { isMounted = false; };
    }, [isOpen, type, department]);

    if (!isOpen) return null;

    const theme = TYPE_COLORS[type] || TYPE_COLORS.today;
    const title = TYPE_TITLES[type] || 'Chi tiết sự kiện';

    return createPortal(
        <AnimatePresence>
            {/* Modal Overlay (z-50) */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[50] flex items-center justify-center p-4"
                style={{ fontFamily: "'Be Vietnam Pro', system-ui, sans-serif" }}
            >
                {/* Modal Container */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-3xl max-h-[85vh] flex flex-col"
                >
                    {/* Shadow elements */}
                    <div className={`absolute inset-0 bg-slate-900 translate-x-3 translate-y-3 ${theme.shadow.replace('shadow-', '')}`} />
                    
                    {/* Main Card */}
                    <div className="relative bg-white border-[3px] border-slate-900 flex flex-col max-h-[85vh]">
                        {/* Header */}
                        <div className={`${theme.bg} px-5 py-4 border-b-[3px] border-slate-900 flex items-center justify-between shrink-0`}>
                            <h2 className="text-xl font-black text-white uppercase tracking-wider drop-shadow-md flex items-center gap-2">
                                <Calendar size={20} />
                                {title}
                                <span className="bg-white/20 px-2 py-0.5 rounded text-sm ml-2">
                                    {events.length}
                                </span>
                            </h2>
                            <button
                                onClick={onClose}
                                className="w-9 h-9 bg-white border-2 border-slate-900 text-slate-900 flex items-center justify-center hover:bg-red-500 hover:text-white hover:rotate-90 transition-all duration-200 shadow-[3px_3px_0_#0f172a] hover:shadow-[1px_1px_0_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px]"
                            >
                                <X size={18} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Body - Event List */}
                        <div className={`overflow-y-auto custom-scrollbar p-5 flex-1 ${theme.lightBg}`}>
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <Loader2 className="w-10 h-10 animate-spin text-slate-400 mb-4" />
                                    <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Đang tải dữ liệu...</p>
                                </div>
                            ) : events.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                    <div className="w-20 h-20 border-[3px] border-dashed border-slate-300 flex items-center justify-center rounded-full mb-4 bg-white shadow-sm">
                                        <Box size={32} />
                                    </div>
                                    <p className="text-sm font-black uppercase tracking-widest text-slate-500">Không có sự kiện nào</p>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {events.map((event, idx) => {
                                        const deptClass = getDeptColor(event.department);
                                        const isMultiDay = event.eventEndDate && event.eventEndDate !== event.eventDate;
                                        return (
                                            <div 
                                                key={event.id || idx}
                                                onClick={() => setSelectedEvent(event)}
                                                className="group bg-white border-[3px] border-slate-900 p-4 shadow-[4px_4px_0_rgba(15,23,42,1)] hover:shadow-[2px_2px_0_rgba(15,23,42,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer flex flex-col sm:flex-row gap-4 sm:items-center relative"
                                            >
                                                {/* Hover indication */}
                                                <div className="absolute top-0 right-0 w-0 h-0 border-t-[16px] border-r-[16px] border-t-transparent border-r-slate-900 opacity-0 group-hover:opacity-100 transition-opacity" />

                                                {/* Left Column: Time & Date */}
                                                <div className="flex flex-row sm:flex-col items-center sm:items-start gap-3 sm:gap-1 shrink-0 min-w-[120px] sm:pr-4 sm:border-r-2 sm:border-dashed sm:border-slate-200">
                                                    <div className="flex items-center gap-1.5 text-slate-900 font-black text-lg tracking-tighter">
                                                        <Clock size={16} className={theme.text} />
                                                        {event.startTime || '--:--'}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                                                        <Calendar size={12} />
                                                        {formatDate(event.eventDate)}
                                                        {isMultiDay && ` - ${formatDate(event.eventEndDate)}`}
                                                    </div>
                                                </div>

                                                {/* Right Column: Details */}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-black text-slate-900 text-base sm:text-lg truncate group-hover:text-blue-600 transition-colors mb-2">
                                                        {event.eventName}
                                                    </h3>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {event.department && (
                                                            <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border-2 border-slate-900 shadow-[1px_1px_0_#0f172a] ${deptClass}`}>
                                                                {event.department}
                                                            </span>
                                                        )}
                                                        {event.location && (
                                                            <span className="px-2 py-0.5 text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-300 flex items-center gap-1">
                                                                <MapPin size={10} />
                                                                {Array.isArray(event.location) ? event.location.join(', ') : event.location}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            {/* Child Modal - Must render outside the above motion.div to overlay properly. It naturally stacks because it's a portal inside a portal, but React Portal appends to body, so the latest one is on top. */}
            <EventPreviewModal 
                isOpen={!!selectedEvent} 
                event={selectedEvent} 
                onClose={() => setSelectedEvent(null)} 
            />
        </AnimatePresence>,
        document.body
    );
};

export default StatDrilldownModal;
