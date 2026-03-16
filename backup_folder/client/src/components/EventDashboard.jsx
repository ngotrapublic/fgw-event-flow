import React, { useState, useEffect } from 'react';
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
        <Card
            className={cn(
                "group relative h-full overflow-hidden border border-slate-200 transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] hover:border-indigo-100",
                isPast ? "bg-slate-50 opacity-60 grayscale-[0.5]" : "bg-white"
            )}
            onClick={() => onEmail(event, true)} // Card click triggers preview for better UX
        >
            {/* GRADIENT TOP BAR (Visual Interest) */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

            {/* HEADER: BADGE & ACTIONS */}
            <div className="flex items-start justify-between p-5 pb-0">
                {/* LEFT: Department Badge */}
                <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 font-bold shadow-sm">
                    {event.department || 'General'}
                </Badge>

                {/* RIGHT: Floating Action Pill (Visible on Hover) */}
                <div className="absolute top-4 right-4 flex items-center gap-1 rounded-full bg-white/90 p-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md border border-slate-100 opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 z-20">

                    {/* Primary: Quick View */}
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors shadow-sm"
                        onClick={(e) => { e.stopPropagation(); onEmail(event, true); }}
                        title="Xem nhanh (Quick View)"
                    >
                        <Eye size={16} strokeWidth={2.5} />
                    </Button>

                    {canModify && (
                        <>
                            <div className="mx-1 h-4 w-px bg-slate-200" />

                            {/* Actions Group */}
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700" onClick={(e) => { e.stopPropagation(); onEmail(event); }} title="Gửi Email">
                                <Mail size={16} />
                            </Button>

                            <Link to={`/print-portal/${event.id}`} onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-500 hover:bg-orange-50 hover:text-orange-600" title="In ấn">
                                    <Printer size={16} />
                                </Button>
                            </Link>

                            <Link to={`/events/${event.id}/edit`} onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-500 hover:bg-blue-50 hover:text-blue-600" title="Chỉnh sửa">
                                    <Edit2 size={16} />
                                </Button>
                            </Link>

                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-500 hover:bg-red-50 hover:text-red-600" onClick={(e) => { e.stopPropagation(); onDelete(event.id); }} title="Xóa">
                                <Trash2 size={16} />
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* MAIN CONTENT */}
            <CardHeader className="pt-4 pb-2">
                <CardTitle className="line-clamp-2 text-lg font-bold leading-tight text-slate-800 transition-colors group-hover:text-indigo-600">
                    {event.eventName}
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 pt-2">
                {/* Meta Info Row */}
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                    <div className="flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1">
                        <CalendarIcon size={14} className="text-indigo-500" />
                        <span className="font-semibold">{event.eventDate}</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1">
                        <Clock size={14} className="text-indigo-500" />
                        <span className="font-medium">{event.startTime} - {event.endTime}</span>
                    </div>
                </div>

                {/* Location & Contact */}
                <div className="space-y-2 border-t border-slate-50 pt-3">
                    <div className="flex items-start gap-2 text-sm text-slate-600">
                        <MapPin size={16} className="mt-0.5 shrink-0 text-pink-500" />
                        <span className="line-clamp-1 font-medium text-slate-700">
                            {Array.isArray(event.location) ? event.location.join(', ') : event.location}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Users size={16} className="shrink-0 text-emerald-500" />
                        <span className="truncate">{event.contactEmail}</span>
                    </div>
                </div>

                {/* LOGISTICS MICRO-TAGS (Mini Preview) */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                    {/* Setup Badge */}
                    <div className={cn("flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", event.setup ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-100 bg-slate-50 text-slate-400")}>
                        <div className={cn("h-1.5 w-1.5 rounded-full", event.setup ? "bg-emerald-500" : "bg-slate-300")} />
                        Setup
                    </div>

                    {/* Equipment Count Badge */}
                    <div className="flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                        <Box size={10} strokeWidth={3} />
                        {unassignedItems.length + Object.values(locationGroups).flat().length} Items
                    </div>
                </div>
            </CardContent>
        </Card>
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

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 9;

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

    const fetchEvents = async () => {
        try {
            const response = await api.get('/events');
            const sortedEvents = response.data.sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));
            setEvents(sortedEvents);
        } catch (error) {
            console.error('Error fetching events:', error);
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
    }, []);

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

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentEvents = filteredEvents.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);

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
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Status</span>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-xs font-bold text-black">Active • {filteredEvents.length} Events</span>
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

                        {/* UI/UX Pro Max Pagination */}
                        {totalPages > 1 && (
                            <div className="mt-16 mb-8 flex flex-col items-center gap-4">
                                <div className="flex items-center gap-3 p-2 bg-white/40 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl shadow-slate-200/50">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => paginate(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="h-10 w-10 rounded-xl bg-white border border-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all disabled:opacity-30 disabled:hover:bg-white"
                                    >
                                        <ChevronLeft size={20} strokeWidth={2.5} />
                                    </Button>

                                    <div className="flex items-center gap-1.5 px-1">
                                        {[...Array(totalPages)].map((_, i) => (
                                            <motion.button
                                                key={i + 1}
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => paginate(i + 1)}
                                                className={cn(
                                                    "w-10 h-10 rounded-xl font-black text-sm transition-all duration-300 relative overflow-hidden group",
                                                    currentPage === i + 1
                                                        ? "bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-[0_8px_20px_rgba(79,70,229,0.3)]"
                                                        : "bg-white text-slate-400 border border-slate-100/50 hover:border-indigo-200 hover:text-indigo-600 hover:shadow-md"
                                                )}
                                            >
                                                {/* Glossy overlay for active state */}
                                                {currentPage === i + 1 && (
                                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-50" />
                                                )}
                                                <span className="relative z-10">{i + 1}</span>
                                            </motion.button>
                                        ))}
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => paginate(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="h-10 w-10 rounded-xl bg-white border border-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all disabled:opacity-30 disabled:hover:bg-white"
                                    >
                                        <ChevronRight size={20} strokeWidth={2.5} />
                                    </Button>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                    Page {currentPage} of {totalPages}
                                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                    {filteredEvents.length} Events Total
                                </p>
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
                        <LogisticsKanban events={filteredEvents} />
                    </div>
                )}

                {/* NEW: Analytics View */}
                {viewMode === 'analytics' && (
                    <div className="animate-in fade-in zoom-in-90 duration-500">
                        <DepartmentGalaxy events={filteredEvents} />
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
