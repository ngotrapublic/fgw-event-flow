import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Calendar, Clock, MapPin, User, Mail, Component,
    Box, FileText, Info, AlertCircle, Phone, CheckCircle2,
    Building2, Quote, ClipboardList, StickyNote
} from 'lucide-react';
import { Badge } from './ui/Badge';
import { cn } from '../lib/utils';
import { ICON_MAP } from './event-form/EventFormHelpers';
import api from '../services/api';

const EventPreviewModal = ({ event, isOpen, onClose }) => {
    const [resources, setResources] = useState([]);

    // Fetch resources on mount to get correct labels
    useEffect(() => {
        const fetchResources = async () => {
            try {
                const res = await api.get('/resources');
                setResources(res.data || []);
            } catch (error) {
                console.error("Failed to fetch resources for preview", error);
            }
        };

        if (isOpen) {
            fetchResources();
        }
    }, [isOpen]);

    // --- Data Processing (Memoized) - MUST come before any conditional returns ---
    const { locationGroups, unassignedItems, hasLogistics } = useMemo(() => {
        if (!event) return { locationGroups: {}, unassignedItems: [], hasLogistics: false };

        const groups = {};
        const unassigned = [];
        let hasItems = false;

        Object.entries(event.facilitiesChecklist || {}).forEach(([key, val]) => {
            if (!val?.checked) return;
            hasItems = true;

            const resource = resources.find(r => r.id === key);
            // Priority: 1. saved label (val.label), 2. resource lookup, 3. key as fallback
            const label = val?.label || resource?.label || key;
            const IconComponent = resource?.icon && ICON_MAP[resource.icon]
                ? ICON_MAP[resource.icon]
                : Box;

            const itemBase = {
                label,
                icon: IconComponent,
                id: key,
                totalQty: val.quantity
            };

            const distEntries = Object.entries(val.distribution || {}).filter(([_, qty]) => Number(qty) > 0);

            if (distEntries.length > 0) {
                distEntries.forEach(([loc, qty]) => {
                    if (!groups[loc]) groups[loc] = [];
                    groups[loc].push({ ...itemBase, quantity: qty });
                });
            } else {
                unassigned.push({ ...itemBase, quantity: val.quantity });
            }
        });

        return {
            locationGroups: groups,
            unassignedItems: unassigned,
            hasLogistics: hasItems
        };
    }, [event, resources]);

    // Early return AFTER all hooks
    if (!event) return null;

    // Formatting Helpers
    const eventDateObj = new Date(event.eventDate);
    const day = eventDateObj.getDate().toString().padStart(2, '0');
    const month = (eventDateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = eventDateObj.getFullYear();
    const dayOfWeek = eventDateObj.toLocaleDateString('vi-VN', { weekday: 'long' });

    // Support Multi-day display
    const endDateStr = event.seriesEndDate || event.eventEndDate;
    let endDay, endMonth, endYear;
    if (endDateStr && endDateStr !== event.eventDate) {
        const endDateObj = new Date(endDateStr);
        endDay = endDateObj.getDate().toString().padStart(2, '0');
        endMonth = (endDateObj.getMonth() + 1).toString().padStart(2, '0');
        endYear = endDateObj.getFullYear();
    }

    // USE PORTAL to render at document.body level
    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* BACKDROP - Neo-Glass Pro style */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
                        style={{ fontFamily: "'Be Vietnam Pro', system-ui, sans-serif" }}
                    >
                        {/* NEO-GLASS PRO MODAL CONTAINER */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative w-full max-w-4xl h-auto max-h-[90vh]"
                        >
                            {/* Multi-layer shadow effect */}
                            <div
                                className="absolute inset-0"
                                style={{
                                    background: '#ec4899',
                                    transform: 'translate(12px, 12px)'
                                }}
                            />
                            <div
                                className="absolute inset-0"
                                style={{
                                    background: '#8b5cf6',
                                    transform: 'translate(6px, 6px)'
                                }}
                            />

                            {/* Main modal card */}
                            <div className="relative bg-white border-[3px] border-slate-900 flex flex-col max-h-[90vh]">

                                {/* Corner decoration dots */}
                                <div className="absolute top-3 left-3 flex gap-1 z-10">
                                    <div className="w-2.5 h-2.5 bg-violet-500 rounded-full" />
                                    <div className="w-2.5 h-2.5 bg-pink-500 rounded-full" />
                                    <div className="w-2.5 h-2.5 bg-amber-400 rounded-full" />
                                </div>

                                {/* --- HEADER - Neo-Glass Pro style --- */}
                                <div className="bg-slate-900 px-5 py-4 flex items-center justify-between shrink-0 border-b-[3px] border-slate-900">
                                    <div className="flex items-center gap-3 min-w-0 ml-12">
                                        <h2 className="text-lg font-black text-white tracking-tight truncate">
                                            {event.eventName}
                                        </h2>
                                        <div
                                            className="px-3 py-1 bg-cyan-400 border-2 border-slate-700 -rotate-2 shadow-[2px_2px_0_#0f172a] hidden sm:block"
                                        >
                                            <span className="text-slate-900 text-[10px] font-black uppercase tracking-wider">
                                                {event.department || 'Event'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {event.setup && (
                                            <div
                                                className="hidden sm:flex px-2.5 py-1 bg-amber-400 border-2 border-slate-700 rotate-1 shadow-[2px_2px_0_#0f172a] items-center gap-1.5"
                                            >
                                                <div className="w-2 h-2 rounded-full bg-slate-900" />
                                                <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider">Có Setup</span>
                                            </div>
                                        )}
                                        <button
                                            onClick={onClose}
                                            className="w-9 h-9 bg-white border-2 border-slate-700 text-slate-900 flex items-center justify-center hover:bg-red-500 hover:text-white hover:rotate-90 transition-all duration-200 shadow-[3px_3px_0_#0f172a] hover:shadow-[1px_1px_0_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px]"
                                        >
                                            <X size={18} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </div>

                                {/* --- BODY: Neo-Glass Pro Grid --- */}
                                <div className="overflow-y-auto custom-scrollbar p-5 bg-gradient-to-br from-slate-50 to-white flex-1">
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">

                                        {/* LEFT COLUMN: Meta Info */}
                                        <div className="md:col-span-12 lg:col-span-5 xl:col-span-4 flex flex-col gap-4">

                                            {/* 1. Date & Time - Staggered Neo style */}
                                            <div className="border-[3px] border-slate-900 bg-white p-4 shadow-[4px_4px_0_rgba(139,92,246,0.3)]">
                                                <div className="flex items-center gap-4 mb-3 pb-3 border-b-2 border-dashed border-slate-200">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-14 h-14 bg-violet-500 border-2 border-slate-900 flex flex-col items-center justify-center -rotate-2 shadow-[3px_3px_0_#0f172a]">
                                                            <span className="text-[9px] font-black text-white uppercase leading-none mb-0.5">{month}</span>
                                                            <span className="text-xl font-black text-white leading-none">{day}</span>
                                                        </div>
                                                        {endDay && (
                                                            <>
                                                                <span className="text-slate-400 font-black">-</span>
                                                                <div className="w-14 h-14 bg-pink-500 border-2 border-slate-900 flex flex-col items-center justify-center rotate-2 shadow-[3px_3px_0_#0f172a]">
                                                                    <span className="text-[9px] font-black text-white uppercase leading-none mb-0.5">{endMonth}</span>
                                                                    <span className="text-xl font-black text-white leading-none">{endDay}</span>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-black text-slate-800">{dayOfWeek} {endDay ? `đến ${endDay}/${endMonth}` : ''}</div>
                                                        <div className="text-[11px] font-bold text-slate-500">Năm {year}</div>
                                                    </div>
                                                </div>
                                                <div
                                                    className="flex items-center gap-2 px-3 py-2 bg-pink-100 border-2 border-slate-900 rotate-1 shadow-[3px_3px_0_rgba(236,72,153,0.4)]"
                                                >
                                                    <Clock size={16} strokeWidth={2.5} className="text-pink-600" />
                                                    <span className="text-lg font-black tracking-tight text-slate-900">
                                                        {event.startTime} - {event.endTime}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* 2. Location & Contact - Neo-Glass Pro */}
                                            <div className="border-[3px] border-slate-900 bg-white shadow-[4px_4px_0_rgba(249,115,22,0.3)]">
                                                {/* Location */}
                                                <div className="p-4 border-b-2 border-dashed border-slate-200">
                                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2.5 flex items-center gap-1.5">
                                                        <MapPin size={12} className="text-orange-500" /> Địa điểm
                                                    </h3>
                                                    <div className="flex flex-wrap gap-2">
                                                        {Array.isArray(event.location) && event.location.length > 0 ? (
                                                            event.location.map((loc, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className="bg-emerald-400 text-slate-900 border-2 border-slate-900 px-2.5 py-1 text-[11px] font-black flex items-center gap-1.5 shadow-[2px_2px_0_#0f172a]"
                                                                    style={{ transform: `rotate(${idx % 2 === 0 ? '-1' : '1'}deg)` }}
                                                                >
                                                                    <div className="w-1.5 h-1.5 bg-slate-900"></div>
                                                                    {loc}
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="text-sm font-bold text-slate-800">{event.location || 'Chưa xác định'}</div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Contact */}
                                                <div className="p-4">
                                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2.5 flex items-center gap-1.5">
                                                        <User size={12} className="text-violet-500" /> Liên hệ
                                                    </h3>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-slate-900 border-2 border-slate-900 flex items-center justify-center text-white font-black text-sm shadow-[2px_2px_0_#8b5cf6]">
                                                            {(event.registrantName || 'U').charAt(0)}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="font-black text-slate-800 text-sm truncate">{event.registrantName}</div>
                                                            <div className="flex flex-col gap-0.5 mt-0.5">
                                                                <div className="text-[10px] font-bold text-slate-500 truncate flex items-center gap-1">
                                                                    <Mail size={10} /> {event.contactEmail || event.registrantEmail}
                                                                </div>
                                                                {event.contactPhone && (
                                                                    <div className="text-[10px] font-bold text-slate-500 truncate flex items-center gap-1">
                                                                        <Phone size={10} /> {event.contactPhone}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 3. Description / Content */}
                                            {event.content && (
                                                <div className="border-[3px] border-slate-900 bg-white shadow-[4px_4px_0_rgba(99,102,241,0.3)]">
                                                    <div className="bg-indigo-100 px-4 py-2.5 border-b-2 border-slate-900">
                                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-700 flex items-center gap-1.5">
                                                            <FileText size={12} /> Mô tả / Nội dung
                                                        </h3>
                                                    </div>
                                                    <div className="p-4">
                                                        <div className="text-slate-700 text-[11px] leading-relaxed font-medium">
                                                            {event.content}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* 5. Setup Requirements - Neo-Glass Pro */}
                                            {event.setup && (
                                                <div className="border-[3px] border-slate-900 bg-white shadow-[4px_4px_0_rgba(245,158,11,0.4)] -rotate-[0.5deg]">
                                                    {/* Tape decoration */}
                                                    <div className="absolute -top-2 left-6 w-10 h-4 bg-amber-200 border border-amber-400 opacity-80 z-10" />
                                                    <div className="absolute -top-2 right-6 w-10 h-4 bg-amber-200 border border-amber-400 opacity-80 z-10" />

                                                    <div className="bg-amber-400 px-4 py-2.5 border-b-2 border-slate-900">
                                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-1.5">
                                                            <ClipboardList size={12} /> Yêu cầu Setup
                                                        </h3>
                                                    </div>
                                                    <div className="p-4 bg-amber-50/50">
                                                        <div className="text-[11px] leading-relaxed font-bold text-slate-700 whitespace-pre-wrap">
                                                            {event.setup}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* RIGHT COLUMN: Logistics Grid - Neo-Glass Pro */}
                                        <div className="md:col-span-12 lg:col-span-7 xl:col-span-8 border-[3px] border-slate-900 bg-white overflow-hidden flex flex-col h-full shadow-[6px_6px_0_#1e293b]">
                                            {/* Header */}
                                            <div className="px-5 py-3 border-b-[3px] border-slate-900 bg-slate-900 flex items-center gap-2">
                                                <Box size={14} className="text-cyan-400" />
                                                <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Danh sách thiết bị</h3>
                                            </div>

                                            {/* Logistics Content Area */}
                                            <div className="p-5 flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-slate-50/50">
                                                {hasLogistics ? (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full content-start">

                                                        {/* LOCATION CARDS */}
                                                        {Object.entries(locationGroups).map(([location, items], groupIdx) => (
                                                            <div
                                                                key={location}
                                                                className="border-2 border-slate-900 overflow-hidden h-fit shadow-[3px_3px_0_rgba(139,92,246,0.3)]"
                                                                style={{ transform: `rotate(${groupIdx % 2 === 0 ? '-0.5' : '0.5'}deg)` }}
                                                            >
                                                                <div className="bg-violet-500 px-3 py-2 border-b-2 border-slate-900 flex items-center justify-between">
                                                                    <div className="flex items-center gap-1.5 max-w-[85%]">
                                                                        <MapPin size={12} className="text-white" />
                                                                        <span className="text-[11px] font-black text-white uppercase tracking-wide truncate">{location}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="divide-y-2 divide-slate-200 bg-white">
                                                                    {items.map((item, idx) => (
                                                                        <div key={idx} className="px-3 py-2 flex items-center justify-between hover:bg-violet-50 group transition-colors">
                                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                                <item.icon size={12} className="text-slate-400 group-hover:text-violet-600 shrink-0 transition-colors" />
                                                                                <span className="text-xs font-bold text-slate-700 truncate">{item.label}</span>
                                                                            </div>
                                                                            <span className="text-xs font-black text-slate-900 bg-violet-100 px-2 py-0.5 border border-slate-900 min-w-[24px] text-center">
                                                                                {item.quantity}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}

                                                        {/* UNASSIGNED */}
                                                        {unassignedItems.length > 0 && (
                                                            <div className="border-2 border-dashed border-slate-400 overflow-hidden h-fit bg-slate-50">
                                                                <div className="bg-slate-200 px-3 py-2 border-b-2 border-dashed border-slate-400 flex items-center gap-2">
                                                                    <Box size={12} className="text-slate-500" />
                                                                    <span className="text-[11px] font-black text-slate-600 uppercase tracking-wide">Thiết bị chung</span>
                                                                </div>
                                                                <div className="divide-y divide-slate-200/50 bg-white">
                                                                    {unassignedItems.map((item, idx) => (
                                                                        <div key={idx} className="px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                                <item.icon size={12} className="text-slate-400 shrink-0" />
                                                                                <span className="text-xs font-medium text-slate-600 truncate">{item.label}</span>
                                                                            </div>
                                                                            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 border border-slate-300 min-w-[24px] text-center">
                                                                                {item.quantity}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3 min-h-[150px]">
                                                        <div className="w-16 h-16 border-2 border-dashed border-slate-300 flex items-center justify-center">
                                                            <Box size={32} strokeWidth={1} />
                                                        </div>
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Không có thiết bị</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Footer: Additional Notes */}
                                            {event.notes && (
                                                <div className="px-5 py-3 bg-purple-100 border-t-[3px] border-slate-900 text-[11px] text-slate-700">
                                                    <div className="flex items-center gap-1.5 font-black text-purple-700 uppercase tracking-widest mb-2">
                                                        <StickyNote size={12} /> Ghi chú thêm
                                                    </div>
                                                    <div className="whitespace-pre-wrap leading-relaxed font-medium bg-white p-3 border-2 border-slate-900 shadow-[2px_2px_0_rgba(139,92,246,0.3)]">
                                                        {event.notes}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default EventPreviewModal;
