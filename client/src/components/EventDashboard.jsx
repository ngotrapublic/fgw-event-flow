import React, { useState, useEffect, useCallback, useMemo, memo, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Mail, Calendar as CalendarIcon, List, X, Send, Search, Printer, Clock, Filter, MoreVertical, ArrowRight, MapPin, Users, BarChart2, Box, Eye, FileSpreadsheet, ChevronLeft, ChevronRight, Hammer, Check } from 'lucide-react';
import api, { toggleContractorSign } from '../services/api';

// Lazy-loaded tab views — bundles only downloaded when user clicks the tab
const CalendarView = lazy(() => import('./CalendarView'));
const LogisticsKanban = lazy(() => import('./LogisticsKanban'));
const DepartmentGalaxy = lazy(() => import('./DepartmentGalaxy'));

import EventPreviewModal from './EventPreviewModal';
import ImportEventModal from './ImportEventModal';
import { useToast } from './Toast';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';

/** Skeleton shimmer shown while a lazy view loads */
const ViewSkeleton = () => (
    <div className="animate-pulse space-y-4 p-4">
        <div className="h-8 bg-slate-200 rounded-lg w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="h-40 bg-slate-100 rounded-xl border-2 border-slate-200" />
            ))}
        </div>
    </div>
);

const DEFAULT_RECIPIENTS = [
    'huynt40@fpt.edu.vn',
    'ctsv@fpt.edu.vn',
    'ts@fpt.edu.vn',
    'pdp@fpt.edu.vn',
    'qhdn@fpt.edu.vn'
];

const EmailModal = ({ event, onClose, onSend }) => {
    const [recipients, setRecipients] = useState([]);
    const [newEmail, setNewEmail] = useState('');

    useEffect(() => {
        const list = new Set([...DEFAULT_RECIPIENTS]);
        if (event.registrantEmail) {
            list.add(event.registrantEmail);
        }
        setRecipients(Array.from(list));
    }, [event]);

    const handleAdd = () => {
        if (newEmail && !recipients.includes(newEmail)) {
            setRecipients([...recipients, newEmail]);
            setNewEmail('');
        }
    };

    const handleRemove = (email) => {
        setRecipients(recipients.filter(e => e !== email));
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            {/* NEO-GLASS PRO CONTAINER */}
            <div className="relative w-full max-w-2xl">
                {/* Multi-layer shadow effect */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: '#ec4899',
                        transform: 'translate(10px, 10px)'
                    }}
                />
                <div
                    className="absolute inset-0"
                    style={{
                        background: '#8b5cf6',
                        transform: 'translate(5px, 5px)'
                    }}
                />

                {/* Main card */}
                <div className="relative bg-white border-[3px] border-slate-900 flex flex-col max-h-[90vh]">

                    {/* Corner decoration dots */}
                    <div className="absolute top-3 left-3 flex gap-1 z-10">
                        <div className="w-2.5 h-2.5 bg-violet-500 rounded-full" />
                        <div className="w-2.5 h-2.5 bg-pink-500 rounded-full" />
                        <div className="w-2.5 h-2.5 bg-amber-400 rounded-full" />
                    </div>

                    {/* Header - Neo-Glass Pro */}
                    <div className="bg-slate-900 px-6 py-4 flex justify-between items-center border-b-[3px] border-slate-900">
                        <div className="flex items-center gap-3 ml-10">
                            <h3 className="text-xl font-black text-white tracking-tight">Send Notification</h3>
                            <div
                                className="px-2 py-0.5 bg-cyan-400 border-2 border-slate-700 -rotate-2 shadow-[2px_2px_0_#0f172a]"
                            >
                                <span className="text-slate-900 text-[9px] font-black uppercase tracking-wider">Email</span>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 bg-white border-2 border-slate-700 text-slate-900 flex items-center justify-center hover:bg-red-500 hover:text-white hover:rotate-90 transition-all duration-200 shadow-[3px_3px_0_#0f172a] hover:shadow-[1px_1px_0_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px]"
                        >
                            <X size={18} strokeWidth={2.5} />
                        </button>
                    </div>

                    {/* Body - Neo-Glass Pro */}
                    <div className="p-6 space-y-5 overflow-y-auto bg-gradient-to-br from-slate-50 to-white">
                        <div className="border-[3px] border-slate-900 bg-white p-4 shadow-[4px_4px_0_rgba(139,92,246,0.3)]">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1.5 block">
                                <Mail size={12} className="text-violet-500" /> Recipients
                            </label>

                            {/* Email badges - rotated Neo style */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                {recipients.map((email, idx) => (
                                    <div
                                        key={email}
                                        className="pl-3 pr-1.5 py-1.5 bg-violet-100 border-2 border-slate-900 flex items-center gap-2 shadow-[2px_2px_0_rgba(139,92,246,0.4)] hover:shadow-[1px_1px_0_rgba(139,92,246,0.4)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-default"
                                        style={{ transform: `rotate(${idx % 2 === 0 ? '-1' : '1'}deg)` }}
                                    >
                                        <span className="text-sm font-bold text-slate-800">{email}</span>
                                        <button
                                            onClick={() => handleRemove(email)}
                                            className="w-5 h-5 bg-white border border-slate-900 flex items-center justify-center hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors"
                                        >
                                            <X size={10} strokeWidth={3} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Add email input - Neo style */}
                            <div className="flex gap-3">
                                <div className="flex-1 relative">
                                    <input
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                                        placeholder="Add email..."
                                        className="w-full px-4 py-2.5 border-2 border-slate-900 bg-white text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-0 shadow-[3px_3px_0_rgba(99,102,241,0.3)] focus:shadow-[1px_1px_0_rgba(99,102,241,0.3)] focus:translate-x-[2px] focus:translate-y-[2px] transition-all"
                                    />
                                </div>
                                <button
                                    onClick={handleAdd}
                                    className="w-11 h-11 bg-emerald-400 border-2 border-slate-900 flex items-center justify-center text-slate-900 shadow-[3px_3px_0_#0f172a] hover:shadow-[1px_1px_0_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] transition-all hover:bg-emerald-500"
                                >
                                    <Plus size={18} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Footer - Neo-Glass Pro */}
                    <div className="px-6 py-4 border-t-[3px] border-slate-900 flex justify-end gap-3 bg-slate-100">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 bg-white border-2 border-slate-900 text-slate-900 font-bold shadow-[3px_3px_0_#1e293b] hover:shadow-[1px_1px_0_#1e293b] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => onSend(recipients)}
                            className="px-5 py-2.5 bg-violet-500 border-2 border-slate-900 text-white font-bold flex items-center gap-2 shadow-[3px_3px_0_#0f172a] hover:shadow-[1px_1px_0_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-violet-600 transition-all -rotate-1 hover:rotate-0"
                        >
                            <Send size={16} /> Send Notification
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon: Icon, color, trend, labelColor }) => (
    <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-150 group relative overflow-hidden rounded-xl cursor-pointer">
        <CardContent className="p-5 flex items-start justify-between">
            <div className="flex flex-col z-10">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">{title}</p>
                <div className="flex items-end gap-3">
                    <h3 className="text-4xl font-black text-black tracking-tight leading-none">{value}</h3>
                    {trend && (
                        <span className="text-[10px] font-black text-white bg-gradient-to-r from-emerald-500 to-green-500 px-2 py-1 rounded-full mb-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border border-black animate-pulse">
                            {trend}
                        </span>
                    )}
                </div>
            </div>

            <div className={cn(
                "p-3 rounded-xl transition-all duration-150 group-hover:rotate-6 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                color, labelColor
            )}>
                <Icon size={22} strokeWidth={2.5} />
            </div>
        </CardContent>
        {/* Decorative corner accent */}
        <div className={cn("absolute -right-4 -bottom-4 w-16 h-16 rounded-full opacity-20", color.replace('bg-', 'bg-'))} />
    </Card>
);

const EventCard = memo(({ event, onDelete, onEmail, onToggleSign, resources = [] }) => {
    const { user } = useAuth();
    const { showSuccess } = useToast();

    // Calculate if event is in the past
    const eventDate = new Date(event.eventDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isPast = eventDate < today;

    const isOwner = user?.uid === event.createdBy;
    const isAdmin = user?.role === 'admin' || user?.role === 'manager';

    // Permission: Admin can always modify. User can modify only their own FUTURE events.
    const canModify = isAdmin || (isOwner && !isPast);

    // Logistics Data Parsing & Grouping
    // Create a resource map for quick lookup
    const resourceMap = resources.reduce((acc, r) => {
        acc[r.id] = r;
        return acc;
    }, {});

    const facilitiesData = Object.entries(event.facilitiesChecklist || {})
        .filter(([_, val]) => val?.checked)
        .map(([key, val]) => {
            // Priority: 1. val.label (saved in new events), 2. resourceMap, 3. formatLabel(key)
            const resourceInfo = resourceMap[key];
            const formatLabel = (str) => str
                .replace(/_/g, ' ')
                .replace(/([a-z])([A-Z])/g, '$1 $2')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
            return {
                label: val?.label || resourceInfo?.label || formatLabel(key),
                icon: Box, // Default icon
                totalQty: val.quantity,
                distribution: val.distribution || {}
            };
        });

    // Group by Location
    const locationGroups = {};
    const unassignedItems = [];

    facilitiesData.forEach(item => {
        const distEntries = Object.entries(item.distribution).filter(([_, qty]) => Number(qty) > 0);

        if (distEntries.length > 0) {
            distEntries.forEach(([loc, qty]) => {
                if (!locationGroups[loc]) locationGroups[loc] = [];
                locationGroups[loc].push({ ...item, quantity: qty });
            });
        } else {
            // No specific distribution, treat as global/unassigned
            unassignedItems.push({ ...item, quantity: item.totalQty });
        }
    });

    return (
        <div
            className={cn(
                "group relative h-full cursor-pointer",
                isPast ? "opacity-60 grayscale-[0.5]" : ""
            )}
            onClick={() => onEmail(event, true)}
        >
            {/* NEO-GLASS PRO - Enhanced creative version */}
            <div className="relative h-full">
                {/* Multi-layer shadow effect */}
                <div
                    className="absolute inset-0 transition-transform duration-200 group-hover:translate-x-[-2px] group-hover:translate-y-[-2px]"
                    style={{
                        background: '#ec4899',
                        transform: 'translate(10px, 10px)'
                    }}
                />
                <div
                    className="absolute inset-0 transition-transform duration-200 group-hover:translate-x-[-1px] group-hover:translate-y-[-1px]"
                    style={{
                        background: '#8b5cf6',
                        transform: 'translate(5px, 5px)'
                    }}
                />

                {/* Main card */}
                <div
                    className="relative h-full border-[3px] border-slate-900 overflow-hidden transition-all duration-200 group-hover:translate-x-[-4px] group-hover:translate-y-[-4px]"
                    style={{
                        background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
                    }}
                >
                    {/* Diagonal accent stripe */}
                    <div
                        className="absolute top-0 right-0 w-24 h-24 overflow-hidden pointer-events-none"
                    >
                        <div
                            className="absolute top-4 -right-8 w-32 h-6 rotate-45 flex items-center justify-center"
                            style={{ background: 'linear-gradient(90deg, #7c3aed, #ec4899)' }}
                        >
                            <span className="text-[8px] font-black text-white uppercase tracking-wider">
                                {event.setup ? 'READY' : 'NEW'}
                            </span>
                        </div>
                    </div>

                    {/* Corner decoration dots */}
                    <div className="absolute top-2 left-2 flex gap-1">
                        <div className="w-2 h-2 bg-violet-500 rounded-full" />
                        <div className="w-2 h-2 bg-pink-500 rounded-full" />
                        <div className="w-2 h-2 bg-amber-400 rounded-full" />
                    </div>

                    {/* Bold header bar with rotated badge */}
                    <div className="bg-slate-900 border-b-[3px] border-slate-900 px-4 py-3 flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2">
                            <div
                                className="px-2 py-0.5 bg-cyan-400 border-2 border-slate-900 -rotate-2 shadow-[2px_2px_0_#0f172a]"
                            >
                                <span className="text-slate-900 text-[10px] font-black uppercase tracking-wider" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                                    {event.department || 'General'}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span
                                className="flex items-center gap-1 px-2.5 py-1 bg-amber-400 text-slate-900 text-[10px] font-black uppercase border-2 border-slate-900 rotate-1 shadow-[2px_2px_0_#0f172a]"
                            >
                                <Box size={10} />
                                {unassignedItems.length + Object.values(locationGroups).flat().length}
                            </span>
                        </div>
                    </div>

                    {/* Main content */}
                    <div className="p-4 space-y-4">
                        {/* Event Name - Glitch style hover */}
                        <div className="relative">
                            <h4 className="text-xl font-black text-slate-900 leading-tight line-clamp-2 transition-all duration-150 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-violet-600 group-hover:via-pink-500 group-hover:to-orange-500 group-hover:bg-clip-text">
                                {event.eventName}
                            </h4>
                            {/* Underline decoration */}
                            <div className="h-1 w-12 bg-gradient-to-r from-violet-500 to-pink-500 mt-2 transition-all duration-300 group-hover:w-full" />
                        </div>

                        {/* Date & Time - Staggered layout */}
                        <div className="space-y-2">
                            <div
                                className="flex items-center gap-2 px-3 py-2 border-2 border-slate-900 -rotate-1 transition-transform duration-200 group-hover:rotate-0"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(99,102,241,0.1) 100%)',
                                    boxShadow: '4px 4px 0 rgba(139,92,246,0.4)'
                                }}
                            >
                                <div className="p-1.5 bg-violet-500 border-2 border-slate-900">
                                    <CalendarIcon size={12} className="text-white" />
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-[9px] font-bold text-violet-600 uppercase">Ngày</span>
                                    {event.seriesEndDate && event.seriesEndDate !== event.eventDate ? (
                                        <span className="text-sm font-black text-slate-800">
                                            {event.eventDate.split('-').reverse().slice(0, 2).join('/')} - {event.seriesEndDate.split('-').reverse().slice(0, 2).join('/')}
                                        </span>
                                    ) : (
                                        <span className="text-sm font-black text-slate-800">{event.eventDate}</span>
                                    )}
                                </div>
                            </div>
                            <div
                                className="flex items-center gap-2 px-3 py-2 border-2 border-slate-900 rotate-1 ml-4 transition-transform duration-200 group-hover:rotate-0 group-hover:ml-0"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(236,72,153,0.2) 0%, rgba(244,114,182,0.1) 100%)',
                                    boxShadow: '4px 4px 0 rgba(236,72,153,0.4)'
                                }}
                            >
                                <div className="p-1.5 bg-pink-500 border-2 border-slate-900">
                                    <Clock size={12} className="text-white" />
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-[9px] font-bold text-pink-600 uppercase">Giờ</span>
                                    <span className="text-sm font-black text-slate-800">{event.startTime} - {event.endTime}</span>
                                </div>
                            </div>
                        </div>

                        {/* Location - Tape style */}
                        <div
                            className="relative flex items-center gap-3 p-3 border-2 border-slate-900 -rotate-[0.5deg]"
                            style={{
                                background: 'linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(251,191,36,0.1) 100%)',
                                boxShadow: '4px 4px 0 rgba(249,115,22,0.3)'
                            }}
                        >
                            {/* Tape decoration */}
                            <div className="absolute -top-2 left-4 w-8 h-3 bg-amber-200 border border-amber-400 opacity-80" />
                            <div className="absolute -top-2 right-4 w-8 h-3 bg-amber-200 border border-amber-400 opacity-80" />

                            <div className="p-2 bg-orange-500 border-2 border-slate-900">
                                <MapPin size={14} className="text-white" />
                            </div>
                            <span className="font-bold text-slate-700 text-sm line-clamp-1">
                                {Array.isArray(event.location) ? event.location.join(', ') : event.location}
                            </span>
                        </div>

                        {/* Contractors Section - Neo-Glass Pro style */}
                        {event.contractorPackages?.length > 0 ? (
                            <div
                                className="relative p-3 border-2 border-slate-900 -rotate-[0.5deg]"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(217,119,6,0.1) 100%)',
                                    boxShadow: '4px 4px 0 rgba(217,119,6,0.4)'
                                }}
                            >
                                {/* Tape decoration */}
                                <div className="absolute -top-2 left-4 w-8 h-3 bg-orange-200 border border-orange-400 opacity-80" />
                                <div className="absolute -top-2 right-4 w-8 h-3 bg-orange-200 border border-orange-400 opacity-80" />

                                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-dashed border-amber-300">
                                    <div className="p-1.5 bg-amber-500 border-2 border-slate-900">
                                        <Hammer size={12} className="text-white" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-700" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                                        Nhà thầu thi công
                                    </span>
                                </div>

                                <div className="space-y-1.5">
                                    {event.contractorPackages.map((pkg, idx) => (
                                        <div
                                            key={idx}
                                            className={cn(
                                                "flex items-center gap-2 py-1.5 px-2 rounded transition-all",
                                                isAdmin ? "cursor-pointer hover:bg-amber-100/50" : ""
                                            )}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (isAdmin && onToggleSign) {
                                                    onToggleSign(event.id, idx);
                                                }
                                            }}
                                            style={{ transform: `rotate(${idx % 2 === 0 ? '-0.5' : '0.5'}deg)` }}
                                        >
                                            {/* Checkbox */}
                                            <div className={cn(
                                                "w-5 h-5 border-2 border-slate-900 flex items-center justify-center flex-shrink-0 transition-colors",
                                                pkg.signed ? "bg-emerald-400" : "bg-white",
                                                isAdmin ? "hover:bg-emerald-100" : ""
                                            )}>
                                                {pkg.signed && <Check size={12} strokeWidth={3} className="text-slate-900" />}
                                            </div>
                                            {/* Name & Status */}
                                            <span className="text-xs font-bold text-slate-700 flex-1 truncate" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                                                {pkg.contractorName || `Nhà thầu ${idx + 1}`}
                                            </span>
                                            <span
                                                className={cn(
                                                    "text-[9px] font-bold px-1.5 py-0.5 border uppercase tracking-wide",
                                                    pkg.signed
                                                        ? "text-emerald-700 bg-emerald-100 border-emerald-300"
                                                        : "text-red-600 bg-red-100 border-red-300 animate-pulse"
                                                )}
                                                style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}
                                            >
                                                {pkg.signed ? "Đã đăng ký" : "Chưa đăng ký"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : facilitiesData.length > 0 && (
                            /* Equipment Summary - When no contractors */
                            <div
                                className="relative p-3 border-2 border-slate-900 -rotate-[0.5deg]"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%)',
                                    boxShadow: '4px 4px 0 rgba(99,102,241,0.4)'
                                }}
                            >
                                {/* Tape decoration */}
                                <div className="absolute -top-2 left-4 w-8 h-3 bg-indigo-200 border border-indigo-400 opacity-80" />
                                <div className="absolute -top-2 right-4 w-8 h-3 bg-indigo-200 border border-indigo-400 opacity-80" />

                                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-dashed border-indigo-300">
                                    <div className="p-1.5 bg-indigo-500 border-2 border-slate-900">
                                        <Box size={12} className="text-white" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                                        Thiết bị yêu cầu
                                    </span>
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                    {facilitiesData.slice(0, 4).map((item, idx) => {
                                        const IconComponent = item.icon;
                                        return (
                                            <div
                                                key={idx}
                                                className="flex items-center gap-1.5 px-2 py-1 bg-white border-2 border-slate-900 shadow-[2px_2px_0_rgba(99,102,241,0.3)] hover:shadow-[1px_1px_0_rgba(99,102,241,0.3)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                                                style={{ transform: `rotate(${idx % 2 === 0 ? '-1' : '1'}deg)`, fontFamily: "'Be Vietnam Pro', sans-serif" }}
                                                title={`${item.label}: ${item.totalQty}`}
                                            >
                                                <IconComponent size={12} className="text-indigo-600 flex-shrink-0" />
                                                <span className="text-[10px] font-bold text-slate-700 truncate max-w-[60px]">{item.label}</span>
                                                <span className="text-[10px] font-bold text-indigo-600">×{item.totalQty}</span>
                                            </div>
                                        );
                                    })}
                                    {facilitiesData.length > 4 && (
                                        <div className="flex items-center px-2 py-1 bg-indigo-100 border-2 border-slate-900 text-[10px] font-bold text-indigo-700">
                                            +{facilitiesData.length - 4}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Footer - Contact Email */}
                        <div className="flex items-center gap-2 pt-3 border-t-2 border-dashed border-slate-300">
                            <div className="p-1.5 bg-slate-800 border-2 border-slate-900 rounded-full flex-shrink-0">
                                <Mail size={12} className="text-white" />
                            </div>
                            <span className="text-sm font-medium text-slate-600 truncate" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                                {event.contactEmail || event.registrantEmail || 'No email'}
                            </span>
                        </div>
                    </div>

                    {/* Action buttons - Stacked neo style */}
                    <div className="absolute top-16 right-3 flex flex-col gap-1.5 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 z-20">
                        <Button
                            size="icon"
                            className="h-9 w-9 bg-violet-500 hover:bg-violet-600 text-white border-2 border-slate-900 rounded-none shadow-[4px_4px_0_#1e293b] hover:shadow-[2px_2px_0_#1e293b] hover:translate-x-[2px] hover:translate-y-[2px] transition-all rotate-2 hover:rotate-0"
                            onClick={(e) => { e.stopPropagation(); onEmail(event, true); }}
                            title="Xem nhanh"
                            aria-label="Xem nhanh sự kiện"
                        >
                            <Eye size={16} />
                        </Button>

                        {canModify && (
                            <>
                                <Button
                                    size="icon"
                                    className="h-9 w-9 bg-white hover:bg-cyan-100 text-slate-700 border-2 border-slate-900 rounded-none shadow-[4px_4px_0_#1e293b] hover:shadow-[2px_2px_0_#1e293b] hover:translate-x-[2px] hover:translate-y-[2px] transition-all -rotate-1 hover:rotate-0"
                                    onClick={(e) => { e.stopPropagation(); onEmail(event); }}
                                    title="Gửi Email"
                                >
                                    <Mail size={16} />
                                </Button>
                                <Link to={`/print-portal/${event.id}`} onClick={(e) => e.stopPropagation()}>
                                    <Button
                                        size="icon"
                                        className="h-9 w-9 bg-white hover:bg-pink-100 text-slate-700 border-2 border-slate-900 rounded-none shadow-[4px_4px_0_#1e293b] hover:shadow-[2px_2px_0_#1e293b] hover:translate-x-[2px] hover:translate-y-[2px] transition-all rotate-1 hover:rotate-0"
                                        title="In ấn"
                                    >
                                        <Printer size={16} />
                                    </Button>
                                </Link>
                                <Link to={`/events/${event.id}/edit`} onClick={(e) => e.stopPropagation()}>
                                    <Button
                                        size="icon"
                                        className="h-9 w-9 bg-amber-400 hover:bg-amber-500 text-slate-900 border-2 border-slate-900 rounded-none shadow-[4px_4px_0_#1e293b] hover:shadow-[2px_2px_0_#1e293b] hover:translate-x-[2px] hover:translate-y-[2px] transition-all -rotate-2 hover:rotate-0"
                                        title="Chỉnh sửa"
                                    >
                                        <Edit2 size={16} />
                                    </Button>
                                </Link>
                                <Button
                                    size="icon"
                                    className="h-9 w-9 bg-red-500 hover:bg-red-600 text-white border-2 border-slate-900 rounded-none shadow-[4px_4px_0_#1e293b] hover:shadow-[2px_2px_0_#1e293b] hover:translate-x-[2px] hover:translate-y-[2px] transition-all rotate-2 hover:rotate-0"
                                    onClick={(e) => { e.stopPropagation(); onDelete(event.id); }}
                                    title="Xóa"
                                    aria-label="Xóa sự kiện"
                                >
                                    <Trash2 size={16} />
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

const EventDashboard = () => {
    const [events, setEvents] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [locations, setLocations] = useState([]);
    const [resources, setResources] = useState([]); // Equipment resources for label mapping
    const [viewMode, setViewMode] = useState('list');
    const { showSuccess, showError } = useToast();
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false); // NEW
    const [showImportModal, setShowImportModal] = useState(false); // Import State
    const [selectedEvent, setSelectedEvent] = useState(null);
    const { user } = useAuth();

    // Dashboard Stats from dedicated API (not affected by pagination)
    const [dashboardStats, setDashboardStats] = useState({ today: 0, tomorrow: 0, week: 0, happeningNow: 0 });

    // --- Cursor-based pagination state ---
    const [pagination, setPagination] = useState({
        hasMore: false,
        isLoading: false,
        lastId: null, // cursor for next page
        total: 0 // actual total count from backend
    });
    // cursorStack keeps track of previous page cursors for Prev navigation
    // cursorStack[0] = null (first page), cursorStack[1] = lastId from page 1, etc.
    const [cursorStack, setCursorStack] = useState([null]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 9; // Events per page

    // Search & Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMode, setFilterMode] = useState('all');
    const [filterDepartment, setFilterDepartment] = useState('all');
    const [filterLocation, setFilterLocation] = useState('all');
    const [filterDate, setFilterDate] = useState('all');

    // Reset to first page when filter/search changes
    useEffect(() => {
        setCursorStack([null]);
        setCurrentPage(1);
        fetchEvents(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterMode, filterDepartment, filterLocation, filterDate]);

    const fetchEvents = useCallback(async (lastDocId = null) => {
        try {
            setPagination(prev => ({ ...prev, isLoading: true }));

            const params = { limit: itemsPerPage };
            if (lastDocId) params.lastDocId = lastDocId;

            const response = await api.get('/events', { params });
            const { events: newEvents, meta } = response.data;

            setEvents(newEvents);
            setPagination({
                hasMore: meta.hasMore,
                lastId: meta.lastId,
                total: meta.total, // Accurately set the total matching count
                isLoading: false
            });
        } catch (error) {
            console.error('Error fetching events:', error);
            showError('Có lỗi xảy ra khi tải dữ liệu.');
            setPagination(prev => ({ ...prev, isLoading: false }));
        }
    }, [showError]);

    const handleNext = useCallback(() => {
        if (!pagination.hasMore || pagination.isLoading) return;
        const nextCursor = pagination.lastId;
        setCursorStack(prev => [...prev, nextCursor]);
        setCurrentPage(prev => prev + 1);
        fetchEvents(nextCursor);
    }, [pagination, fetchEvents]);

    const handlePrev = useCallback(() => {
        if (currentPage <= 1 || pagination.isLoading) return;
        const prevStack = cursorStack.slice(0, -1);
        const prevCursor = prevStack[prevStack.length - 1];
        setCursorStack(prevStack);
        setCurrentPage(prev => prev - 1);
        fetchEvents(prevCursor);
    }, [currentPage, cursorStack, pagination.isLoading, fetchEvents]);

    const fetchDepartments = async () => {
        try {
            const response = await api.get('/departments');
            setDepartments(response.data);
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    };

    const fetchLocations = async () => {
        try {
            const response = await api.get('/locations');
            setLocations(response.data);
        } catch (error) {
            console.error('Error fetching locations:', error);
        }
    };

    const fetchResources = async () => {
        try {
            const response = await api.get('/resources');
            setResources(response.data);
        } catch (error) {
            console.error('Error fetching resources:', error);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await api.get('/events/stats');
            setDashboardStats(res.data);
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    };

    useEffect(() => {
        fetchEvents(null);
        fetchDepartments();
        fetchLocations();
        fetchResources();
        fetchStats();
        // Refresh stats every 5 minutes
        const statsInterval = setInterval(fetchStats, 5 * 60 * 1000);
        return () => clearInterval(statsInterval);
    }, []);  // Load once on mount

    const handleDelete = useCallback(async (id) => {
        if (window.confirm('Bạn có chắc muốn xóa sự kiện này?')) {
            try {
                await api.delete(`/events/${id}`);
                showSuccess('Đã xóa sự kiện thành công!');
                fetchEvents();
            } catch (error) {
                console.error('Error deleting event:', error);
                showError('Không thể xóa sự kiện');
            }
        }
    }, [fetchEvents, showSuccess, showError]);

    const handleCardAction = useCallback((event, isPreview = false) => {
        setSelectedEvent(event);
        if (isPreview) {
            setShowPreviewModal(true);
        } else {
            setShowEmailModal(true);
        }
    }, []);

    const handleSendNotification = async (recipients) => {
        if (!selectedEvent) return;
        try {
            await api.post('/notify', {
                recipients,
                eventName: selectedEvent.eventName,
                event: selectedEvent,
                subject: `Notification: ${selectedEvent.eventName}`
            });
            setShowEmailModal(false);
            showSuccess('Đã gửi email thành công!');
        } catch (error) {
            console.error('Error sending notification:', error);
            showError('Không thể gửi email');
        }
    };

    const handleToggleContractorSign = useCallback(async (eventId, contractorIndex) => {
        try {
            const response = await toggleContractorSign(eventId, contractorIndex);
            setEvents(prevEvents => prevEvents.map(event => {
                if (event.id === eventId) {
                    return { ...event, contractorPackages: response.data.contractorPackages };
                }
                return event;
            }));
            showSuccess(response.data.message);
        } catch (error) {
            console.error('Error toggling contractor sign:', error);
            showError(error.response?.data?.error || 'Không thể cập nhật trạng thái ký');
        }
    }, [showSuccess, showError]);

    // Debounce search input to avoid filtering on every keystroke
    const debouncedSearch = useDebounce(searchTerm, 300);

    const filteredEvents = useMemo(() => events.filter(event => {
        if (filterMode === 'my') {
            const myEmail = localStorage.getItem('userEmail');
            if (!myEmail || event.registrantEmail !== myEmail) return false;
        }
        if (debouncedSearch) {
            const term = debouncedSearch.toLowerCase();
            const matchesName = String(event.eventName || '').toLowerCase().includes(term);
            const matchesLocation = String(event.location || '').toLowerCase().includes(term);
            const matchesDepartment = String(event.department || '').toLowerCase().includes(term);

            if (!matchesName && !matchesLocation && !matchesDepartment) return false;
        }
        if (filterDepartment !== 'all' && event.department !== filterDepartment) return false;
        if (filterLocation !== 'all' && event.location !== filterLocation) return false;
        if (filterDate !== 'all') {
            const eventDate = new Date(event.eventDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (filterDate === 'today') {
                return eventDate.toDateString() === today.toDateString();
            }
            if (filterDate === 'upcoming') {
                return eventDate >= today;
            }
            if (filterDate === 'past') {
                return eventDate < today;
            }
        }
        return true;
    }), [events, debouncedSearch, filterMode, filterDepartment, filterLocation, filterDate]);

    // Server already deduplicates series events, so use filteredEvents directly
    const currentEvents = filteredEvents;

    const paginate = (pageNumber) => {
        setCurrentPage(pageNumber);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };



    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {(() => {
                    const isAdmin = user?.role === 'admin' || user?.role === 'manager';
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    if (isAdmin) {
                        // ... existing admin logic
                        const tomorrow = new Date(today);
                        tomorrow.setDate(tomorrow.getDate() + 1);

                        const nextWeek = new Date(today);
                        nextWeek.setDate(nextWeek.getDate() + 7);

                        const eventsToday = events.filter(e => new Date(e.eventDate).toDateString() === today.toDateString());
                        const eventsTomorrow = events.filter(e => new Date(e.eventDate).toDateString() === tomorrow.toDateString());
                        const eventsWeek = events.filter(e => {
                            const d = new Date(e.eventDate);
                            return d >= today && d <= nextWeek;
                        });

                        // "Happening Now" calculation (simple approx)
                        const now = new Date();
                        const currentHour = now.getHours();
                        const currentMin = now.getMinutes();
                        const eventsOngoing = eventsToday.filter(e => {
                            try {
                                const [startH, startM] = e.startTime.split(':').map(Number);
                                const [endH, endM] = e.endTime.split(':').map(Number);
                                const startVal = startH * 60 + startM;
                                const endVal = endH * 60 + endM;
                                const nowVal = currentHour * 60 + currentMin;
                                return nowVal >= startVal && nowVal <= endVal;
                            } catch (err) { return false; }
                        });

                        return (
                            <>
                                <StatCard title="Today" value={dashboardStats.today} icon={CalendarIcon} color="bg-blue-50" labelColor="text-blue-600" />
                                <StatCard title="Tomorrow" value={dashboardStats.tomorrow} icon={Clock} color="bg-indigo-50" labelColor="text-indigo-600" />
                                <StatCard title="Next 7 Days" value={dashboardStats.week} icon={CalendarIcon} color="bg-purple-50" labelColor="text-purple-600" />
                                <StatCard title="Happening Now" value={dashboardStats.happeningNow} icon={BarChart2} color="bg-emerald-50" labelColor="text-emerald-600" trend={dashboardStats.happeningNow > 0 ? "LIVE" : null} />
                            </>
                        );
                    } else {
                        // REQUESTER VIEW (User): My Events
                        const myEvents = events.filter(e =>
                            e.createdBy === user?.uid ||
                            e.registrantEmail === user?.email ||
                            (user?.department && e.department === user.department)
                        );

                        const myUpcoming = myEvents.filter(e => new Date(e.eventDate) >= today);
                        const myPast = myEvents.filter(e => new Date(e.eventDate) < today);
                        const myMonth = myEvents.filter(e => new Date(e.eventDate).getMonth() === today.getMonth());

                        return (
                            <>
                                <StatCard title="My Events" value={myEvents.length} icon={Users} color="bg-violet-50" labelColor="text-violet-600" />
                                <StatCard title="Upcoming" value={myUpcoming.length} icon={Clock} color="bg-teal-50" labelColor="text-teal-600" />
                                <StatCard title="Completed" value={myPast.length} icon={List} color="bg-slate-100" labelColor="text-slate-600" />
                                <StatCard title="This Month" value={myMonth.length} icon={CalendarIcon} color="bg-orange-50" labelColor="text-orange-600" />
                            </>
                        );
                    }
                })()}
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-5 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <Input
                            placeholder="Search events..."
                            className="pl-11 bg-slate-50 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[-1px] focus:translate-y-[-1px] transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="icon" className="shrink-0 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"><Filter size={18} /></Button>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <Button
                        variant="outline"
                        onClick={() => setShowImportModal(true)}
                        className="bg-white hover:bg-green-50 text-black border-2 border-black gap-2 font-bold rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] transition-all"
                    >
                        <FileSpreadsheet size={18} className="text-green-600" />
                        Import Excel
                    </Button>
                    <Link to="/register">
                        <Button className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white gap-2 font-bold border-2 border-black rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] transition-all">
                            <Plus size={18} /> New Event
                        </Button>
                    </Link>
                </div>
            </div>

            {/* View Switcher - Pro Max Segmented Control */}
            <div className="flex items-center justify-between gap-4 bg-white/40 backdrop-blur-md p-2 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sticky top-4 z-40 transition-all duration-300">
                <nav className="flex items-center relative w-full lg:w-auto p-1 bg-slate-100/50 rounded-xl overflow-hidden">
                    {[
                        { id: 'list', label: 'List', icon: List, color: 'text-blue-600', activeBg: 'bg-blue-600' },
                        { id: 'calendar', label: 'Calendar', icon: CalendarIcon, color: 'text-indigo-600', activeBg: 'bg-indigo-600' },
                        { id: 'timeline', label: 'Timeline', icon: Clock, color: 'text-violet-600', activeBg: 'bg-violet-600' },
                        { id: 'analytics', label: 'Analytics', icon: BarChart2, color: 'text-fuchsia-600', activeBg: 'bg-gradient-to-r from-violet-600 to-fuchsia-600' },
                    ].map((tab) => {
                        const isActive = viewMode === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setViewMode(tab.id)}
                                className={cn(
                                    "relative flex-1 lg:flex-none flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-lg text-sm font-black transition-all duration-300 group z-10",
                                    isActive ? "text-white" : "text-slate-500 hover:text-slate-900"
                                )}
                            >
                                {/* Floating Background Indicator */}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className={cn(
                                            "absolute inset-0 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.15)] z-[-1]",
                                            tab.id === 'analytics' ? tab.activeBg : tab.activeBg
                                        )}
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}

                                <tab.icon
                                    size={18}
                                    strokeWidth={isActive ? 3 : 2.5}
                                    className={cn(
                                        "transition-transform duration-300 group-hover:scale-110",
                                        isActive ? "text-white" : "group-hover:text-black"
                                    )}
                                />
                                <span className="relative">
                                    {tab.label}
                                    {tab.id === 'analytics' && !isActive && (
                                        <span className="absolute -top-1 -right-2 flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 border border-white"></span>
                                        </span>
                                    )}
                                </span>
                            </button>
                        );
                    })}
                </nav>

                {/* Desktop Search Indicator/Summary */}
                <div className="hidden lg:flex items-center gap-3 px-4 h-full border-l-2 border-black/5">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Events</span>
                        <div className="flex items-center gap-1.5">
                            <CalendarIcon size={12} className="text-indigo-500" />
                            <span className="text-xs font-bold text-black">{pagination.total} events</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="mt-6 min-h-[400px]">
                {viewMode === 'list' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {currentEvents.map(event => (
                                <EventCard key={event.id} event={event} onDelete={handleDelete} onEmail={handleCardAction} onToggleSign={handleToggleContractorSign} resources={resources} />
                            ))}
                            {filteredEvents.length === 0 && (
                                <div className="col-span-full text-center py-20 text-slate-400">
                                    <Search size={48} className="mx-auto mb-4 opacity-20" />
                                    <p>No events found matching your criteria.</p>
                                </div>
                            )}
                        </div>

                        {/* Pagination Controls */}
                        {(currentPage > 1 || pagination.hasMore) && (
                            <div className="mt-8 flex justify-center items-center gap-4">
                                <Button
                                    onClick={handlePrev}
                                    disabled={currentPage <= 1 || pagination.isLoading}
                                    variant="outline"
                                    className="gap-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                                >
                                    <ChevronLeft size={18} /> Prev
                                </Button>
                                <span className="flex items-center px-4 font-bold">
                                    {pagination.isLoading ? 'Loading...' : `Page ${currentPage}`}
                                </span>
                                <Button
                                    onClick={handleNext}
                                    disabled={!pagination.hasMore || pagination.isLoading}
                                    variant="outline"
                                    className="gap-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                                >
                                    Next <ChevronRight size={18} />
                                </Button>
                            </div>
                        )}


                    </div>
                )}

                {viewMode === 'calendar' && (
                    <div className="animate-in fade-in zoom-in-95 duration-300">
                        <Suspense fallback={<ViewSkeleton />}>
                            <CalendarView events={filteredEvents} />
                        </Suspense>
                    </div>
                )}

                {viewMode === 'timeline' && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <Suspense fallback={<ViewSkeleton />}>
                            <LogisticsKanban />
                        </Suspense>
                    </div>
                )}

                {/* Analytics View */}
                {viewMode === 'analytics' && (
                    <div className="animate-in fade-in zoom-in-90 duration-500">
                        <Suspense fallback={<ViewSkeleton />}>
                            <DepartmentGalaxy />
                        </Suspense>
                    </div>
                )}
            </div>

            {/* Render Modals at the bottom */}
            {selectedEvent && (
                <>
                    {showEmailModal && (
                        <EmailModal
                            event={selectedEvent}
                            onClose={() => setShowEmailModal(false)}
                            onSend={handleSendNotification}
                        />
                    )}

                    {showPreviewModal && (
                        <EventPreviewModal
                            event={selectedEvent}
                            isOpen={showPreviewModal}
                            onClose={() => setShowPreviewModal(false)}
                        />
                    )}
                </>
            )}

            {/* Import Modal */}
            {showImportModal && (
                <ImportEventModal
                    onClose={() => setShowImportModal(false)}
                    onSuccess={() => {
                        setShowImportModal(false);
                        fetchEvents();
                    }}
                />
            )}
        </div>
    );
};

export default EventDashboard;
