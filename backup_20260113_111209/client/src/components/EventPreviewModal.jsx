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
            const label = resource?.label || key;
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

    // USE PORTAL to render at document.body level
    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* BACKDROP */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 overflow-y-auto font-sans"
                    >
                        {/* MAIN CONTAINER: Compact (max-w-4xl) & Auto Height */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-50 w-full max-w-4xl h-auto max-h-[90vh] rounded-[24px] shadow-2xl flex flex-col border border-white/40 ring-1 ring-black/5 relative"
                        >
                            {/* --- HEADER --- */}
                            <div className="bg-white px-5 py-3 border-b border-slate-200 flex items-center justify-between shrink-0 rounded-t-[24px]">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="bg-indigo-600 w-1 pt-6 rounded-full shrink-0"></div>
                                    <div className="min-w-0">
                                        <h2 className="text-lg font-black text-slate-800 tracking-tight truncate">
                                            {event.eventName}
                                        </h2>
                                    </div>
                                    <Badge variant="outline" className="ml-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 border-indigo-200 bg-indigo-50 px-2 py-0.5 rounded shadow-sm whitespace-nowrap hidden sm:inline-flex">
                                        {event.department || 'Event'}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={cn(
                                        "hidden sm:flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider items-center gap-1 border",
                                        event.setup ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    )}>
                                        <div className={cn("w-1.5 h-1.5 rounded-full", event.setup ? "bg-amber-500" : "bg-emerald-500")} />
                                        {event.setup ? "Có Setup" : "Tiêu chuẩn"}
                                    </div>
                                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors">
                                        <X size={18} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>

                            {/* --- BODY: Compact Grid --- */}
                            <div className="overflow-y-auto custom-scrollbar p-5 bg-slate-50/50 rounded-b-[24px]">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">

                                    {/* LEFT COLUMN: Meta Info (35%) */}
                                    <div className="md:col-span-12 lg:col-span-5 xl:col-span-4 flex flex-col gap-4">

                                        {/* 1. Date & Time */}
                                        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col gap-3 group hover:border-indigo-200 transition-colors">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-11 h-11 rounded-lg bg-indigo-50 text-indigo-600 flex flex-col items-center justify-center border border-indigo-100 shrink-0">
                                                        <span className="text-[9px] font-bold uppercase leading-none mb-0.5">{month}</span>
                                                        <span className="text-lg font-black leading-none">{day}</span>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-800">{dayOfWeek}</div>
                                                        <div className="text-[11px] font-semibold text-slate-500">Năm {year}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-indigo-700">
                                                <Clock size={16} strokeWidth={2.5} />
                                                <span className="text-lg font-black tracking-tight">
                                                    {event.startTime} - {event.endTime}
                                                </span>
                                            </div>
                                        </div>

                                        {/* 2. Contact & Location */}
                                        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-4 hover:border-indigo-200 transition-colors">
                                            {/* Location */}
                                            <div>
                                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                                                    <MapPin size={12} /> Địa điểm
                                                </h3>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {Array.isArray(event.location) && event.location.length > 0 ? (
                                                        event.location.map((loc, idx) => (
                                                            <div key={idx} className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1">
                                                                <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                                                                {loc}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-sm font-bold text-slate-800">{event.location || 'Chưa xác định'}</div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Contact */}
                                            <div className="pt-3 border-t border-slate-100">
                                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                                                    <User size={12} /> Liên hệ
                                                </h3>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs">
                                                        {(event.registrantName || 'U').charAt(0)}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-bold text-slate-800 text-sm truncate">{event.registrantName}</div>
                                                        <div className="flex flex-col gap-0.5 mt-0.5">
                                                            <div className="text-[10px] text-slate-500 truncate flex items-center gap-1 hover:text-indigo-600 transition-colors">
                                                                <Mail size={10} /> {event.contactEmail || event.registrantEmail}
                                                            </div>
                                                            {event.contactPhone && (
                                                                <div className="text-[10px] text-slate-500 truncate flex items-center gap-1 hover:text-indigo-600 transition-colors">
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
                                            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:border-indigo-200 transition-colors">
                                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5 flex items-center gap-1.5">
                                                    <FileText size={12} className="text-indigo-500" /> Mô tả / Nội dung
                                                </h3>
                                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-slate-700 text-[11px] leading-relaxed font-medium">
                                                    {event.content}
                                                </div>
                                            </div>
                                        )}



                                        {/* 5. Setup Requirements */}
                                        {event.setup && (
                                            <div className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:border-amber-200 transition-colors">
                                                <div className="bg-amber-50/50 px-4 py-2.5 border-b border-amber-100/50 flex items-center justify-between">
                                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-1.5">
                                                        <ClipboardList size={12} /> Yêu cầu Setup
                                                    </h3>
                                                </div>
                                                <div className="p-4 bg-white">
                                                    <div className="text-[11px] leading-relaxed font-medium text-slate-700 whitespace-pre-wrap">
                                                        {event.setup}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* RIGHT COLUMN: Logistics Grid (65%) - GROUPED BY LOCATION */}
                                    <div className="md:col-span-12 lg:col-span-7 xl:col-span-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full hover:border-indigo-200 transition-colors">
                                        {/* Simple Header */}
                                        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
                                            <Box size={14} className="text-indigo-600" />
                                            <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-wide">Danh sách thiết bị</h3>
                                        </div>

                                        {/* Logistics Content Area */}
                                        <div className="p-5 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                                            {hasLogistics ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full content-start">

                                                    {/* LOCATION CARDS */}
                                                    {Object.entries(locationGroups).map(([location, items]) => (
                                                        <div key={location} className="border border-slate-200 rounded-lg overflow-hidden h-fit hover:border-indigo-300 hover:shadow-sm transition-all">
                                                            <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                                                                <div className="flex items-center gap-1.5 max-w-[85%]">
                                                                    <MapPin size={12} className="text-indigo-500" />
                                                                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-wide truncate">{location}</span>
                                                                </div>
                                                                {/* Badge removed as requested */}
                                                            </div>
                                                            <div className="divide-y divide-slate-100 bg-white">
                                                                {items.map((item, idx) => (
                                                                    <div key={idx} className="px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 group">
                                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                                            <item.icon size={12} className="text-slate-400 group-hover:text-indigo-600 shrink-0 transition-colors" />
                                                                            <span className="text-xs font-medium text-slate-600 truncate font-sans">{item.label}</span>
                                                                        </div>
                                                                        <span className="text-xs font-bold text-slate-700 bg-slate-100/70 px-1.5 py-0.5 rounded min-w-[20px] text-center border border-slate-200">
                                                                            {item.quantity}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {/* UNASSIGNED */}
                                                    {unassignedItems.length > 0 && (
                                                        <div className="border border-slate-200 border-dashed rounded-lg overflow-hidden h-fit bg-slate-50/30 hover:border-slate-300 transition-colors">
                                                            <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center gap-2 opacity-70">
                                                                <Box size={12} className="text-slate-400" />
                                                                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wide">Thiết bị chung</span>
                                                            </div>
                                                            <div className="divide-y divide-slate-100/50">
                                                                {unassignedItems.map((item, idx) => (
                                                                    <div key={idx} className="px-3 py-1.5 flex items-center justify-between hover:bg-white transition-colors">
                                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                                            <item.icon size={12} className="text-slate-400 shrink-0" />
                                                                            <span className="text-xs font-medium text-slate-500 truncate font-sans">{item.label}</span>
                                                                        </div>
                                                                        <span className="text-xs font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded min-w-[20px] text-center border border-slate-100">
                                                                            {item.quantity}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2 min-h-[150px]">
                                                    <Box size={32} strokeWidth={1} />
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Không có thiết bị</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Footer: Additional Notes (Pinned to Bottom) */}
                                        {event.notes && (
                                            <div className="px-5 py-3 bg-purple-50/40 border-t border-slate-100/80 text-[11px] text-slate-700 backdrop-blur-sm">
                                                <div className="flex items-center gap-1.5 font-black text-purple-600 uppercase tracking-wide mb-1.5">
                                                    <StickyNote size={12} /> Ghi chú thêm
                                                </div>
                                                <div className="whitespace-pre-wrap leading-relaxed font-medium bg-white/60 p-2.5 rounded-lg border border-purple-100/50 shadow-sm">
                                                    {event.notes}
                                                </div>
                                            </div>
                                        )}
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
