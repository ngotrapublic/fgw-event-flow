import React, { useState, useEffect, useCallback } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Mail, Calendar as CalendarIcon, List, X, Send, Search, Printer, Clock, Filter, MoreVertical, ArrowRight, MapPin, Users, BarChart2, Box, Eye, FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../services/api';
import CalendarView from './CalendarView';
import LogisticsKanban from './LogisticsKanban';
import DepartmentGalaxy from './DepartmentGalaxy';
import EventPreviewModal from './EventPreviewModal'; // NEW
import ImportEventModal from './ImportEventModal'; // NEW
import { useToast } from './Toast';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { EQUIPMENT_OPTIONS } from './event-form/EventFormHelpers';

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
            <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border-0">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                    <h3 className="text-xl font-bold text-slate-900">Send Notification</h3>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X size={20} />
                    </Button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Recipients</label>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {recipients.map(email => (
                                    <Badge key={email} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
                                        {email}
                                        <button onClick={() => handleRemove(email)} className="hover:text-red-500 rounded-full p-0.5"><X size={12} /></button>
                                    </Badge>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    placeholder="Add email..."
                                    className="flex-1"
                                />
                                <Button onClick={handleAdd} size="sm" variant="outline"><Plus size={16} /></Button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 shrink-0 bg-slate-50/50">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => onSend(recipients)} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                        <Send size={16} /> Send Notification
                    </Button>
                </div>
            </Card>
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

const EventCard = ({ event, onDelete, onEmail }) => {
    const { user } = useAuth();

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
    const facilitiesData = Object.entries(event.facilitiesChecklist || {})
        .filter(([_, val]) => val?.checked)
        .map(([key, val]) => {
            const opt = EQUIPMENT_OPTIONS.find(o => o.id === key);
            return {
                label: opt?.label || key,
                icon: opt?.icon || Box,
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
            {/* GLASSMORPHISM + GRADIENT - Modern creative design */}
            <div className="relative h-full">
                {/* Gradient glow effect behind card */}
                <div
                    className="absolute -inset-1 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
                    style={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 50%, #f97316 100%)'
                    }}
                />

                {/* Main card with glassmorphism */}
                <div
                    className="relative h-full rounded-2xl border border-white/20 backdrop-blur-xl overflow-hidden transition-all duration-300 group-hover:translate-y-[-4px] group-hover:shadow-2xl"
                    style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)'
                    }}
                >
                    {/* Gradient accent bar at top */}
                    <div
                        className="h-1.5"
                        style={{ background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 25%, #ec4899 50%, #f97316 75%, #eab308 100%)' }}
                    />

                    {/* Header with department */}
                    <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-2 h-2 rounded-full animate-pulse"
                                style={{ background: 'linear-gradient(135deg, #6366f1, #ec4899)' }}
                            />
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                                {event.department || 'General'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {event.setup && (
                                <span className="px-2.5 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] font-bold uppercase rounded-full shadow-lg shadow-emerald-500/25">
                                    ✓ Setup
                                </span>
                            )}
                            <span className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-[10px] font-bold rounded-full shadow-lg shadow-amber-500/25">
                                <Box size={10} />
                                {unassignedItems.length + Object.values(locationGroups).flat().length}
                            </span>
                        </div>
                    </div>

                    {/* Main content */}
                    <div className="px-5 pb-5 space-y-4">
                        {/* Event Name with gradient on hover */}
                        <h4 className="text-xl font-bold text-slate-800 leading-tight line-clamp-2 group-hover:bg-gradient-to-r group-hover:from-violet-600 group-hover:via-pink-600 group-hover:to-orange-500 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300">
                            {event.eventName}
                        </h4>

                        {/* Date & Time pills */}
                        <div className="flex flex-wrap gap-2">
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100">
                                <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/30">
                                    <CalendarIcon size={12} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-medium text-violet-400 uppercase tracking-wider">Ngày</p>
                                    <p className="text-sm font-bold text-slate-700">{event.eventDate}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-100">
                                <div className="p-1.5 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 shadow-lg shadow-pink-500/30">
                                    <Clock size={12} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-medium text-pink-400 uppercase tracking-wider">Giờ</p>
                                    <p className="text-sm font-bold text-slate-700">{event.startTime} - {event.endTime}</p>
                                </div>
                            </div>
                        </div>

                        {/* Location */}
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100/50 border border-slate-100">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 shadow-lg shadow-orange-400/30">
                                <MapPin size={14} className="text-white" />
                            </div>
                            <span className="font-medium text-slate-600 text-sm line-clamp-1">
                                {Array.isArray(event.location) ? event.location.join(', ') : event.location}
                            </span>
                        </div>

                        {/* Contact footer */}
                        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                            <div className="p-1.5 rounded-full bg-slate-100">
                                <Users size={12} className="text-slate-400" />
                            </div>
                            <span className="text-sm text-slate-500 truncate">{event.contactEmail}</span>
                        </div>
                    </div>

                    {/* Floating action buttons */}
                    <div className="absolute top-12 right-3 flex flex-col gap-1.5 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 z-20">
                        <Button
                            size="icon"
                            className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/40 border-0"
                            onClick={(e) => { e.stopPropagation(); onEmail(event, true); }}
                            title="Xem nhanh"
                        >
                            <Eye size={16} />
                        </Button>

                        {canModify && (
                            <>
                                <Button
                                    size="icon"
                                    className="h-9 w-9 rounded-xl bg-white hover:bg-slate-50 text-slate-600 shadow-lg border border-slate-200"
                                    onClick={(e) => { e.stopPropagation(); onEmail(event); }}
                                    title="Gửi Email"
                                >
                                    <Mail size={16} />
                                </Button>
                                <Link to={`/print-portal/${event.id}`} onClick={(e) => e.stopPropagation()}>
                                    <Button
                                        size="icon"
                                        className="h-9 w-9 rounded-xl bg-white hover:bg-slate-50 text-slate-600 shadow-lg border border-slate-200"
                                        title="In ấn"
                                    >
                                        <Printer size={16} />
                                    </Button>
                                </Link>
                                <Link to={`/events/${event.id}/edit`} onClick={(e) => e.stopPropagation()}>
                                    <Button
                                        size="icon"
                                        className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white shadow-lg shadow-amber-500/40 border-0"
                                        title="Chỉnh sửa"
                                    >
                                        <Edit2 size={16} />
                                    </Button>
                                </Link>
                                <Button
                                    size="icon"
                                    className="h-9 w-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/40 border-0"
                                    onClick={(e) => { e.stopPropagation(); onDelete(event.id); }}
                                    title="Xóa"
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
};

const EventDashboard = () => {
    const [events, setEvents] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [locations, setLocations] = useState([]);
    const [viewMode, setViewMode] = useState('list');
    const { showSuccess, showError } = useToast();
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false); // NEW
    const [showImportModal, setShowImportModal] = useState(false); // Import State
    const [selectedEvent, setSelectedEvent] = useState(null);
    const { user } = useAuth();

    // --- Phase 3: Pagination states (simplified - no date range) ---
    const [pagination, setPagination] = useState({
        page: 1,
        totalPages: 1,
        totalCount: 0,
        hasMore: false,
        isLoading: false
    });

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 9; // Events per page

    // Search & Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMode, setFilterMode] = useState('all');
    const [filterDepartment, setFilterDepartment] = useState('all');
    const [filterLocation, setFilterLocation] = useState('all');
    const [filterDate, setFilterDate] = useState('all');

    // Reset to page 1 when filtering or searching
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterMode, filterDepartment, filterLocation, filterDate]);

    const fetchEvents = useCallback(async (page = 1) => {
        try {
            setPagination(prev => ({ ...prev, isLoading: true }));

            const params = {
                page,
                limit: itemsPerPage
            };

            const response = await api.get('/events', { params });
            const { events: newEvents, meta } = response.data;

            setEvents(newEvents);
            setPagination({
                page: meta.page,
                totalPages: meta.totalPages,
                totalCount: meta.totalCount,
                hasMore: meta.hasMore,
                isLoading: false
            });
            setCurrentPage(meta.page);

        } catch (error) {
            console.error('Error fetching events:', error);
            showError('Có lỗi xảy ra khi tải dữ liệu.');
            setPagination(prev => ({ ...prev, isLoading: false }));
        }
    }, [showError]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchEvents(newPage);
        }
    };

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

    useEffect(() => {
        fetchEvents();
        fetchDepartments();
        fetchLocations();
    }, []);  // Load once on mount

    const handleDelete = async (id) => {
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
    };

    // Modified Action Handler: Handles both Email and Preview
    const handleCardAction = (event, isPreview = false) => {
        setSelectedEvent(event);
        if (isPreview) {
            setShowPreviewModal(true);
        } else {
            setShowEmailModal(true);
        }
    };

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

    const filteredEvents = events.filter(event => {
        if (filterMode === 'my') {
            const myEmail = localStorage.getItem('userEmail');
            if (!myEmail || event.registrantEmail !== myEmail) return false;
        }
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
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
    });

    // Pagination is handled by server, so just use filteredEvents directly
    // No client-side slicing needed since API returns the correct page
    const currentEvents = filteredEvents;
    const totalPages = pagination.totalPages;

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
                                <StatCard title="Today" value={eventsToday.length} icon={CalendarIcon} color="bg-blue-50" labelColor="text-blue-600" />
                                <StatCard title="Tomorrow" value={eventsTomorrow.length} icon={Clock} color="bg-indigo-50" labelColor="text-indigo-600" />
                                <StatCard title="Next 7 Days" value={eventsWeek.length} icon={CalendarIcon} color="bg-purple-50" labelColor="text-purple-600" />
                                <StatCard title="Happening Now" value={eventsOngoing.length} icon={BarChart2} color="bg-emerald-50" labelColor="text-emerald-600" trend={eventsOngoing.length > 0 ? "LIVE" : null} />
                            </>
                        );
                    } else {
                        // REQUESTER VIEW (User): My Events
                        console.log('[DEBUG] User:', user);
                        console.log('[DEBUG] Checking Departments:', events.map(e => ({ id: e.id, evtDept: e.department })));

                        const myEvents = events.filter(e =>
                            e.createdBy === user?.uid ||
                            e.registrantEmail === user?.email ||
                            (user?.department && e.department === user.department)
                        );

                        console.log('[DEBUG] Filtered Events:', myEvents.length);

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
                            <span className="text-xs font-bold text-black">{pagination.totalCount} events</span>
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
                                <EventCard key={event.id} event={event} onDelete={handleDelete} onEmail={handleCardAction} />
                            ))}
                            {filteredEvents.length === 0 && (
                                <div className="col-span-full text-center py-20 text-slate-400">
                                    <Search size={48} className="mx-auto mb-4 opacity-20" />
                                    <p>No events found matching your criteria.</p>
                                </div>
                            )}
                        </div>

                        {/* Pagination Controls */}
                        {pagination.totalPages > 1 && (
                            <div className="mt-8 flex justify-center gap-2">
                                <Button
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page <= 1 || pagination.isLoading}
                                    variant="outline"
                                    className="gap-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                                >
                                    <ChevronLeft size={18} /> Prev
                                </Button>
                                <span className="flex items-center px-4 font-bold">
                                    Page {pagination.page} of {pagination.totalPages}
                                </span>
                                <Button
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page >= pagination.totalPages || pagination.isLoading}
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
                        <CalendarView events={filteredEvents} />
                    </div>
                )}

                {viewMode === 'timeline' && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <LogisticsKanban />
                    </div>
                )}

                {/* NEW: Analytics View */}
                {viewMode === 'analytics' && (
                    <div className="animate-in fade-in zoom-in-90 duration-500">
                        <DepartmentGalaxy />
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
