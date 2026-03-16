import React, { useState } from 'react';
import {
    Users, Zap, Box, Calendar, Clock, MapPin, Hammer, Info,
    Speaker, Mic, Monitor, Layout as LayoutIcon, Coffee, ChevronDown, Check,
    ClipboardList, FileText, StickyNote
} from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/utils';

export const ICON_MAP = {
    Speaker, Mic, Monitor, Layout: LayoutIcon, Zap, Coffee, Box
};

export const EQUIPMENT_OPTIONS = []; // Now dynamically loaded


export const Section = ({ title, icon: Icon, children, className = "", defaultOpen = true }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className={cn("bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group mb-6", className)}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors cursor-pointer"
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <Icon className="text-white" size={22} strokeWidth={2.5} />
                    </div>
                    <div className="text-left">
                        <h3 className="text-lg font-black text-black tracking-tight">{title}</h3>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">Section Details</p>
                    </div>
                </div>
                <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center transition-transform duration-200 border-2",
                    isOpen
                        ? "bg-violet-100 text-violet-600 border-violet-300 rotate-180"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                )}>
                    <ChevronDown size={18} strokeWidth={2.5} />
                </div>
            </button>
            <div
                className={cn(
                    "transition-all duration-300 ease-in-out",
                    isOpen ? "max-h-[5000px] opacity-100 overflow-visible" : "max-h-0 opacity-0 overflow-hidden"
                )}
            >
                <div className="px-6 pb-6 space-y-6 border-t-2 border-dashed border-slate-200 pt-6">
                    {children}
                </div>
            </div>
        </div>
    );
};

export const InputGroup = ({ label, error, children, className }) => (
    <div className={cn("space-y-2", className)}>
        <label className="block text-sm font-black text-black tracking-tight">{label}</label>
        {children}
        {error && (
            <span className="text-xs text-rose-600 font-bold flex items-center gap-1.5 mt-1 bg-rose-50 px-2 py-1 rounded-md border border-rose-200">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                {error.message}
            </span>
        )}
    </div>
);

export const QuickPresets = ({ onSelect }) => {
    const presets = [];

    return (
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
            {presets.map((p, idx) => (
                <button
                    key={idx}
                    type="button"
                    onClick={() => onSelect(p.data)}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2.5 bg-white border rounded-xl hover:shadow-md transition-all duration-300 group whitespace-nowrap",
                        p.color.replace('text-', 'hover:border-').split(' ')[2] // Hacky way to get border color for hover
                    )}
                >
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-colors", p.color)}>
                        <p.icon size={16} />
                    </div>
                    <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">{p.label}</span>
                </button>
            ))}
        </div>
    );
};



export const LivePreview = ({ data, resources = [] }) => {
    // Helper to Group Facilities
    const locationGroups = React.useMemo(() => {
        const groups = {};
        const unassigned = [];
        let hasItems = false;

        // Map ID to Label
        const resourceMap = resources.reduce((acc, curr) => {
            acc[curr.id] = curr;
            return acc;
        }, {});

        Object.entries(data.facilitiesChecklist || {}).forEach(([key, val]) => {
            if (!val?.checked) return;
            hasItems = true;

            const resource = resourceMap[key];
            const label = resource?.label || key;
            const IconComponent = resource?.icon && ICON_MAP[resource.icon] ? ICON_MAP[resource.icon] : Box;

            const itemBase = { label, icon: IconComponent, id: key, totalQty: val.quantity };

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

        return { groups, unassigned, hasItems };
    }, [data.facilitiesChecklist, resources]);

    return (
        <div className="sticky top-24 font-sans space-y-4">
            {/* Section Header */}
            <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Live Preview</h3>
                <div className="flex items-center gap-2 bg-emerald-50/80 backdrop-blur-sm px-2.5 py-1 rounded-full border border-emerald-100/50 shadow-sm">
                    <span className="flex h-1.5 w-1.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">On Air</span>
                </div>
            </div>

            {/* UI/UX Pro Max: Futuristic "Holographic" Compact Card v2 */}
            <div className="relative group rounded-[24px] p-[2px] overflow-hidden transition-all duration-500 hover:scale-[1.005]">

                {/* Animated Gradient Border */}
                <div className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,#818cf8_0%,#c084fc_25%,#22d3ee_50%,#c084fc_75%,#818cf8_100%)] opacity-80 blur-[2px] group-hover:opacity-100 transition-opacity duration-500 animate-[spin_4s_linear_infinite]"></div>
                <div className="absolute inset-[2px] bg-white rounded-[22px] z-0"></div>

                {/* Inner Card Content */}
                <div className="relative z-10 bg-white/60 backdrop-blur-2xl rounded-[22px] overflow-hidden h-full flex flex-col font-sans">

                    {/* Top Accent Mesh */}
                    <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-indigo-100/60 via-fuchsia-50/30 to-transparent pointer-events-none"></div>

                    <div className="relative p-4 space-y-3">
                        {/* Header: Compact & Impactful */}
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                                <Badge className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white border-0 font-extrabold px-2.5 py-0.5 text-[9px] uppercase tracking-wider shadow-lg shadow-indigo-500/30">
                                    {data.department || 'GEN'}
                                </Badge>
                                <span className="text-[10px] font-bold text-slate-400 font-mono flex items-center gap-1.5 bg-white/50 px-2 py-0.5 rounded-full border border-indigo-50">
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse"></span>
                                    {data.eventDate || 'YYYY-MM-DD'}
                                </span>
                            </div>

                            {/* Title */}
                            <h3 className="text-[1.25rem] leading-[1.1] font-black tracking-tight">
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-indigo-800 to-slate-900">
                                    {data.eventName || 'Event Name Preview...'}
                                </span>
                            </h3>

                            {/* Metrics: Extra Compact */}
                            <div className="flex flex-col gap-1 text-[10px] font-medium text-slate-600 bg-white/70 border border-indigo-100/50 rounded-xl px-2.5 py-1.5 shadow-sm w-full">
                                <div className="flex items-center gap-2">
                                    <div className="w-3.5 h-3.5 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0 border border-indigo-100">
                                        <Clock size={9} strokeWidth={2.5} />
                                    </div>
                                    <span className="font-bold text-[9.5px]">{data.startTime || '--:--'} - {data.endTime || '--:--'}</span>
                                </div>
                                <div className="min-h-[1px] w-full bg-gradient-to-r from-indigo-100/50 to-transparent"></div>
                                <div className="flex flex-start gap-2">
                                    <div className="w-3.5 h-3.5 rounded-full bg-fuchsia-50 text-fuchsia-500 flex items-center justify-center shrink-0 border border-fuchsia-100 mt-0.5">
                                        <MapPin size={9} strokeWidth={2.5} />
                                    </div>
                                    <span className="leading-tight text-slate-700 font-semibold break-words text-[9.5px]">
                                        {Array.isArray(data.location) && data.location.length > 0 ? data.location.join(', ') : (data.location || "Select...")}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* RESOURCES: GROUPED BY LOCATION (Chips) */}
                        <div className="pt-1.5 border-t border-dashed border-indigo-100/60">
                            <div className="flex items-center gap-1.5 mb-1">
                                <Box size={10} className="text-indigo-400" strokeWidth={3} />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Assets</span>
                            </div>

                            {!locationGroups.hasItems ? (
                                <div className="text-[10px] text-slate-400 italic bg-slate-50/50 px-3 py-1.5 rounded-lg border border-dashed border-slate-200 text-center">
                                    No assets selected
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {Object.entries(locationGroups.groups).map(([loc, items]) => (
                                        <div key={loc} className="bg-white/40 rounded-lg p-1 border border-indigo-50/50">
                                            <div className="text-[9px] font-extrabold text-indigo-900/40 uppercase tracking-wide mb-0.5 ml-0.5 flex items-center gap-1">
                                                <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                                                {loc}
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {items.map((item, idx) => (
                                                    <span key={`${loc}-${idx}`} className="inline-flex items-center gap-1 bg-white border border-indigo-100/80 rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.02)] px-1.5 py-[1px] hover:border-indigo-300 transition-colors group/chip">
                                                        <span className="text-[9.5px] font-bold text-slate-600 max-w-[150px] truncate">{item.label}</span>
                                                        <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1 rounded-[3px] min-w-[14px] text-center">
                                                            {item.quantity}
                                                        </span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}

                                    {locationGroups.unassigned.length > 0 && (
                                        <div className="bg-slate-50/40 rounded-lg p-1 border border-slate-100/50">
                                            <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide mb-0.5 ml-0.5 flex items-center gap-1">
                                                <div className="w-1 h-1 rounded-full bg-slate-400"></div>
                                                General
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {locationGroups.unassigned.map((item, idx) => (
                                                    <span key={`gen-${idx}`} className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-md shadow-sm px-1.5 py-[1px] hover:border-slate-300 transition-colors">
                                                        <span className="text-[9.5px] font-bold text-slate-500 max-w-[150px] truncate">{item.label}</span>
                                                        <span className="text-[9px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1 rounded-[3px] min-w-[14px] text-center">
                                                            {item.quantity}
                                                        </span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* DETAILS: FULL CONTENT (No Scroll) */}
                        {(data.content || data.notes) && (
                            <div className="grid grid-cols-1 gap-2 pt-1">
                                {data.content && (
                                    <div className="bg-sky-50/40 rounded-xl p-2.5 border border-sky-100/50 hover:border-sky-200 transition-colors">
                                        <div className="flex items-center gap-1 mb-1.5 text-sky-500/80">
                                            <FileText size={10} strokeWidth={3} />
                                            <span className="text-[8px] font-extrabold uppercase tracking-wide">Description</span>
                                        </div>
                                        <div className="text-[10px] leading-relaxed text-slate-600 font-medium whitespace-pre-wrap break-words">
                                            {data.content}
                                        </div>
                                    </div>
                                )}

                                {data.notes && (
                                    <div className="bg-purple-50/40 rounded-xl p-2.5 border border-purple-100/50 hover:border-purple-200 transition-colors">
                                        <div className="flex items-center gap-1 mb-1.5 text-purple-500/80">
                                            <StickyNote size={10} strokeWidth={3} />
                                            <span className="text-[8px] font-extrabold uppercase tracking-wide">Internal Notes</span>
                                        </div>
                                        <div className="text-[10px] leading-relaxed text-slate-700 font-medium whitespace-pre-wrap break-words">
                                            {data.notes}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
