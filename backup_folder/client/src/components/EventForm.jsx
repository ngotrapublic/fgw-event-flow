import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Save, Plus, Trash2, Calendar, MapPin, Users, Box, Hammer,
    Info, FileText, ChevronDown, Map, X, Clock, Check, Download, Upload, FileSpreadsheet, Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../services/api';
import { useToast } from './Toast';
import VenueMapModal from './VenueMapModal';
import ContractorCard from './event-form/ContractorCard';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import MultiSelect from './ui/MultiSelect';
import Select from './ui/Select';
import { Section, InputGroup, QuickPresets, LivePreview, ICON_MAP } from './event-form/EventFormHelpers';

const EventForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [dayOfWeek, setDayOfWeek] = useState('');
    const [activeTab, setActiveTab] = useState('general');
    const [dynamicEquipment, setDynamicEquipment] = useState([]);


    const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
        defaultValues: {
            eventName: '',
            registrantEmail: '',
            eventDate: '',
            eventEndDate: '',
            startTime: '07:00',
            endTime: '11:30',
            location: [],
            department: '',
            content: '',
            setup: '',
            // Legacy fields (kept for backward compatibility)
            contractorName: '',
            constructionContent: '',
            constructionStartDate: '',
            constructionEndDate: '',
            constructionStartTime: '',
            constructionEndTime: '',
            equipmentInOut: [],
            constructionPersonnel: [],
            // New: Contractor Packages
            contractorPackages: [],
            workItems: [{ category: '', startDate: '', endDate: '', notes: '' }],
            layoutPlan: '',
            rooms: [{ name: '', seats: '' }],
            services: { ac: false, security: false, cleaning: false },
            notes: '',
            facilitiesSummary: '',
            facilitiesChecklist: {}
        }
    });

    // Field arrays
    const { fields: contractorPackageFields, append: appendContractor, remove: removeContractor } = useFieldArray({ control, name: "contractorPackages" });
    const { fields: equipmentInOutFields, append: appendEqIn, remove: removeEqIn } = useFieldArray({ control, name: "equipmentInOut" });
    const { fields: workItemsFields, append: appendWorkItem, remove: removeWorkItem } = useFieldArray({ control, name: "workItems" });
    const { fields: constructionFields, append: appendCons, remove: removeCons } = useFieldArray({ control, name: "constructionPersonnel" });

    const [departments, setDepartments] = useState([]);
    const [filteredDepartments, setFilteredDepartments] = useState([]);
    const [locations, setLocations] = useState([]);
    const [deptEmails, setDeptEmails] = useState([]);
    const [isEmailDropdownOpen, setIsEmailDropdownOpen] = useState(false);
    const { showSuccess, showError } = useToast();
    const [isMapOpen, setIsMapOpen] = useState(false);

    useEffect(() => {
        const fetchDepts = async () => {
            try {
                const res = await api.get('/departments');
                setDepartments(res.data);
            } catch (error) {
                console.error("Error fetching departments", error);
                showError('Không thể tải danh sách phòng ban');
            }
        };

        const fetchLocations = async () => {
            try {
                const res = await api.get('/locations');
                setLocations(res.data);
            } catch (error) {
                console.error("Error fetching locations", error);
            }
        };

        const fetchResources = async () => {
            try {
                const res = await api.get('/resources');
                setDynamicEquipment(res.data);
            } catch (error) {
                console.error("Error fetching resources", error);
            }
        };

        fetchDepts();
        fetchLocations();
        fetchResources();
    }, []);

    // Effect to filter departments based on user
    useEffect(() => {
        if (departments.length > 0) {
            if (user && user.department) {
                // If user has a department, only show that department
                const userDept = departments.filter(d => d.name === user.department);
                setFilteredDepartments(userDept.length > 0 ? userDept : departments);

                // Auto-select the department if it's the only one
                if (userDept.length === 1 && !id) {
                    setValue('department', userDept[0].name);
                }
            } else {
                // Show all departments
                setFilteredDepartments(departments);
            }
        }
    }, [departments, user, setValue, id]);

    const selectedDept = watch('department');
    const startTime = watch('startTime');
    const endTime = watch('endTime');

    useEffect(() => {
        if (selectedDept) {
            const dept = departments.find(d => d.name === selectedDept);
            if (dept) {
                // Prepare email list: Combine emails array and defaultEmail
                let availableEmails = Array.isArray(dept.emails) ? [...dept.emails] : [];

                // Ensure defaultEmail is in the list if it exists
                if (dept.defaultEmail && !availableEmails.includes(dept.defaultEmail)) {
                    availableEmails.unshift(dept.defaultEmail);
                }

                // Remove duplicates and filter empty strings
                availableEmails = [...new Set(availableEmails)].filter(Boolean);

                setDeptEmails(availableEmails);

                // Auto-fill logic
                let emailToSet = '';

                // 1. If editing an existing event (id exists), don't override unless empty (handled by fetchEvent)
                // 2. If new event:
                if (!id) {
                    // Check if logged-in user belongs to this department
                    if (user && user.department === selectedDept && user.email) {
                        // Use user's email
                        emailToSet = user.email;
                    } else {
                        // Default to department's default email
                        emailToSet = dept.defaultEmail || (availableEmails.length > 0 ? availableEmails[0] : '');
                    }
                    setValue('registrantEmail', emailToSet, { shouldValidate: !!emailToSet });
                }
            } else {
                setDeptEmails([]);
                if (!id) setValue('registrantEmail', '');
            }
        }
    }, [selectedDept, departments, setValue, user, id]);

    useEffect(() => {
        if (id) {
            const fetchEvent = async () => {
                try {
                    const response = await api.get(`/events`);
                    const event = response.data.find(e => e.id == id);
                    if (event) {
                        // Normalize location to array for MultiSelect
                        if (event.location && !Array.isArray(event.location)) {
                            event.location = [event.location];
                        }
                        reset(event);
                    }
                } catch (error) {
                    console.error("Error fetching event", error);
                }
            };
            fetchEvent();
        } else {
            const savedEmail = localStorage.getItem('userEmail');
            if (savedEmail) {
                setValue('registrantEmail', savedEmail);
            }
        }
    }, [id, reset, setValue]);

    const [conflictWarning, setConflictWarning] = useState(null);
    const watchDate = watch('eventDate');
    const watchLocation = watch('location');

    useEffect(() => {
        const checkConflict = async () => {
            if (watchDate && startTime && endTime && watchLocation && watchLocation.length > 0) {
                try {
                    const response = await api.post('/events/check-conflict', {
                        eventDate: watchDate,
                        startTime,
                        endTime,
                        location: watchLocation,
                        excludeId: id
                    });

                    if (response.data.conflict) {
                        const conflict = response.data.conflictingEvent;
                        const conflictLocs = Array.isArray(conflict.location) ? conflict.location.join(', ') : conflict.location;
                        const myLocs = Array.isArray(watchLocation) ? watchLocation.join(', ') : watchLocation;
                        setConflictWarning(`⚠️ Warning: Location(s) "${myLocs}" overlap with "${conflict.eventName}" at "${conflictLocs}" on ${watchDate} (${conflict.startTime} - ${conflict.endTime}).`);
                    } else {
                        setConflictWarning(null);
                    }
                } catch (error) {
                    console.error('Error checking conflict:', error);
                }
            } else {
                setConflictWarning(null);
            }
        };

        const timeoutId = setTimeout(checkConflict, 500);
        return () => clearTimeout(timeoutId);
    }, [watchDate, startTime, endTime, watchLocation, id]);

    const [isImporting, setIsImporting] = useState(false);

    const handleDownloadTemplate = async (type) => {
        try {
            const endpoint = type === 'equipment' ? '/import/equipment-template' : '/import/personnel-template';
            const filename = type === 'equipment' ? 'Equipment_Import_Template.xlsx' : 'Personnel_Import_Template.xlsx';

            const response = await api.get(endpoint, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Template download failed', error);
            showError('Không thể tải file mẫu');
        }
    };

    const handleFileImport = async (e, type) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post(`/import/parse-logistics?type=${type}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const { equipment, personnel } = response.data;

            if (type === 'equipment' && equipment.length > 0) {
                equipment.forEach(item => appendEqIn(item));
                showSuccess(`Đã nhập ${equipment.length} vật dụng`);
            } else if (type === 'personnel' && personnel.length > 0) {
                personnel.forEach(p => appendCons(p));
                showSuccess(`Đã nhập ${personnel.length} nhân sự`);
            } else {
                showError('Không tìm thấy dữ liệu phù hợp trong file');
            }
        } catch (error) {
            console.error('Import failed', error);
            showError('Lỗi khi đọc file Excel');
        } finally {
            setIsImporting(false);
            e.target.value = ''; // Reset input
        }
    };

    const onSubmit = async (data) => {
        if (conflictWarning) {
            showError('Không thể tạo sự kiện! Vui lòng chọn thời gian hoặc địa điểm khác.');
            return;
        }

        if (data.registrantEmail) {
            localStorage.setItem('userEmail', data.registrantEmail);
        }

        let summaryParts = [];
        if (data.facilitiesChecklist) {
            Object.entries(data.facilitiesChecklist).forEach(([key, value]) => {
                if (value.checked) {
                    const label = dynamicEquipment.find(opt => opt.id === key)?.label || key;
                    let detail = label;
                    if (value.quantity) detail += ` (${value.quantity})`;
                    summaryParts.push(detail);
                }
            });
        }
        const generatedSummary = summaryParts.join(', ');

        let sessionName = 'Custom';
        const startH = parseInt(data.startTime.split(':')[0]);
        if (startH < 12) sessionName = 'Sáng';
        else if (startH < 18) sessionName = 'Chiều';
        else sessionName = 'Tối';

        const finalData = { ...data, eventSession: sessionName, dayOfWeek, facilitiesSummary: generatedSummary || data.facilitiesSummary };

        try {
            if (id) {
                await api.put(`/events/${id}`, finalData);
                showSuccess('Cập nhật sự kiện thành công!');
            } else {
                await api.post('/events', finalData);
                showSuccess('Tạo sự kiện mới thành công!');
            }
            navigate('/');
        } catch (error) {
            console.error('Error saving event:', error);
            showError(id ? 'Không thể cập nhật sự kiện' : 'Không thể tạo sự kiện');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">
            {/* Header - Neubrutalism Style */}
            <div className="bg-white border-b-2 border-black sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="h-10 w-10 flex items-center justify-center bg-slate-100 text-slate-600 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-200 transition-colors duration-150 cursor-pointer"
                        >
                            <X size={20} strokeWidth={2.5} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-black tracking-tight flex items-center gap-2">
                                {id ? 'Edit Event' : 'New Event'}
                                <span className="px-2.5 py-1 rounded-lg bg-violet-100 text-violet-700 text-xs font-black uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                    Registration
                                </span>
                            </h1>
                        </div>
                    </div>

                    {/* Tabs - Neubrutalism Style */}
                    <div className="flex p-1.5 bg-slate-100 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <button
                            type="button"
                            onClick={() => setActiveTab('general')}
                            className={cn(
                                "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-colors duration-150 cursor-pointer border-2",
                                activeTab === 'general'
                                    ? "bg-white text-violet-600 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                    : "bg-transparent text-slate-500 border-transparent hover:text-black hover:bg-white"
                            )}
                        >
                            <Info size={16} strokeWidth={2.5} />
                            General
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('logistics')}
                            className={cn(
                                "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-colors duration-150 cursor-pointer border-2",
                                activeTab === 'logistics'
                                    ? "bg-white text-amber-600 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                    : "bg-transparent text-slate-500 border-transparent hover:text-black hover:bg-white"
                            )}
                        >
                            <Hammer size={16} strokeWidth={2.5} />
                            Logistics
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Form */}
                    <div className="lg:col-span-2 space-y-6">

                        <form onSubmit={handleSubmit(onSubmit)}>

                            {/* TAB 1: GENERAL & FACILITIES */}
                            <div className={activeTab === 'general' ? 'block' : 'hidden'}>
                                <Section title="Event Details" icon={Calendar}>
                                    <div className="space-y-6">
                                        <InputGroup label="Event Name" error={errors.eventName}>
                                            <Input
                                                {...register('eventName', { required: 'Event name is required' })}
                                                placeholder="e.g., Quarterly Review Meeting"
                                                startIcon={FileText}
                                            />
                                        </InputGroup>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <InputGroup label="Department" error={errors.department}>
                                                <Select
                                                    options={filteredDepartments.map(dept => ({ value: dept.name, label: dept.name }))}
                                                    value={watch('department')}
                                                    onChange={(val) => setValue('department', val, { shouldValidate: true })}
                                                    placeholder="Select Department..."
                                                    icon={Users}
                                                    error={errors.department}
                                                />
                                            </InputGroup>

                                            <InputGroup label="Registrant Email" error={errors.registrantEmail}>
                                                <div className="relative">
                                                    <Input
                                                        {...register('registrantEmail', { required: 'Email is required', pattern: { value: /^\S+@\S+$/i, message: "Invalid email" } })}
                                                        placeholder="your.email@company.com"
                                                        startIcon={Users}
                                                        autoComplete="off"
                                                        className={deptEmails.length > 0 ? "pr-10" : ""}
                                                    />

                                                    {/* Custom Dropdown Toggle */}
                                                    {deptEmails.length > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsEmailDropdownOpen(!isEmailDropdownOpen)}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-slate-100 transition-all"
                                                        >
                                                            <ChevronDown size={16} className={cn("transition-transform duration-200", isEmailDropdownOpen ? "rotate-180" : "")} />
                                                        </button>
                                                    )}

                                                    {/* Custom Dropdown Menu */}
                                                    <AnimatePresence>
                                                        {isEmailDropdownOpen && deptEmails.length > 0 && (
                                                            <motion.div
                                                                initial={{ opacity: 0, y: 5 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                exit={{ opacity: 0, y: 5 }}
                                                                className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden"
                                                            >
                                                                <ul className="max-h-48 overflow-y-auto py-1">
                                                                    {deptEmails.map((email, idx) => (
                                                                        <li key={idx}>
                                                                            <button
                                                                                type="button"
                                                                                onMouseDown={(e) => {
                                                                                    e.preventDefault(); // Prevent blur
                                                                                    setValue('registrantEmail', email, { shouldValidate: true });
                                                                                    setIsEmailDropdownOpen(false);
                                                                                }}
                                                                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700 hover:text-primary-600 font-medium transition-colors flex items-center justify-between group"
                                                                            >
                                                                                {email}
                                                                                {watch('registrantEmail') === email && (
                                                                                    <Check size={14} className="text-primary-500" />
                                                                                )}
                                                                            </button>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </InputGroup>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <InputGroup label="Date" error={errors.eventDate}>
                                                <Input type="date" {...register('eventDate', { required: 'Date is required' })} startIcon={Calendar} />
                                            </InputGroup>
                                            <InputGroup label="End Date (Optional)" error={errors.eventEndDate}>
                                                <Input type="date" {...register('eventEndDate')} startIcon={Calendar} />
                                            </InputGroup>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <InputGroup label="Start Time" error={errors.startTime}>
                                                <Input type="time" {...register('startTime', { required: 'Start time is required' })} startIcon={Clock} />
                                            </InputGroup>
                                            <InputGroup label="End Time" error={errors.endTime}>
                                                <Input type="time" {...register('endTime', { required: 'End time is required' })} startIcon={Clock} />
                                            </InputGroup>
                                        </div>

                                        <InputGroup label="Location" error={errors.location}>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <MultiSelect
                                                        options={locations.map(loc => ({ value: loc.name, label: loc.name }))}
                                                        value={watch('location') || []}
                                                        onChange={(val) => setValue('location', val, { shouldValidate: true, shouldDirty: true })}
                                                        placeholder="Select Locations..."
                                                    />
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => setIsMapOpen(true)}
                                                    className="gap-2"
                                                >
                                                    <Map size={16} />
                                                    <span className="hidden sm:inline">Map</span>
                                                </Button>
                                            </div>
                                        </InputGroup>

                                        <InputGroup label="Description / Content" error={errors.content}>
                                            <textarea
                                                {...register('content')}
                                                rows="3"
                                                className="w-full p-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-black focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-colors duration-150 text-sm font-medium hover:border-black placeholder:text-slate-400"
                                                placeholder="Brief description of the event..."
                                            />
                                        </InputGroup>
                                    </div>
                                </Section>

                                <Section title="Facilities & Services (Venue Provided)" icon={Box}>
                                    <div className="space-y-6">
                                        <QuickPresets onSelect={(presetData) => {
                                            const currentChecklist = watch('facilitiesChecklist');
                                            const resetChecklist = {};
                                            Object.keys(currentChecklist || {}).forEach(k => resetChecklist[k] = { checked: false, quantity: 1 });
                                            setValue('facilitiesChecklist', resetChecklist);

                                            Object.entries(presetData.facilitiesChecklist).forEach(([key, val]) => {
                                                setValue(`facilitiesChecklist.${key}`, val);
                                            });
                                            if (presetData.eventSession) setValue('eventSession', presetData.eventSession);
                                        }} />

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {dynamicEquipment.map((option, idx) => {
                                                const isChecked = watch(`facilitiesChecklist.${option.id}.checked`);
                                                const selectedLocations = watch('location');
                                                const isMultiLoc = Array.isArray(selectedLocations) && selectedLocations.length > 1;
                                                const Icon = ICON_MAP[option.icon] || Box;

                                                // Color palette for variety
                                                const colors = ['violet', 'blue', 'emerald', 'orange', 'fuchsia', 'cyan'];
                                                const color = colors[idx % colors.length];
                                                const colorMap = {
                                                    violet: { bg: 'bg-violet-500', light: 'bg-violet-100', border: 'border-violet-300', text: 'text-violet-600' },
                                                    blue: { bg: 'bg-blue-500', light: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-600' },
                                                    emerald: { bg: 'bg-emerald-500', light: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-600' },
                                                    orange: { bg: 'bg-orange-500', light: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-600' },
                                                    fuchsia: { bg: 'bg-fuchsia-500', light: 'bg-fuchsia-100', border: 'border-fuchsia-300', text: 'text-fuchsia-600' },
                                                    cyan: { bg: 'bg-cyan-500', light: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-600' },
                                                };
                                                const theme = colorMap[color];

                                                return (
                                                    <div
                                                        key={option.id}
                                                        className={cn(
                                                            "rounded-lg border-2 transition-colors duration-150 cursor-pointer",
                                                            isChecked
                                                                ? `${theme.light} border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]`
                                                                : "bg-white border-slate-200 hover:border-black"
                                                        )}
                                                        onClick={() => {
                                                            const currentVal = watch(`facilitiesChecklist.${option.id}.checked`);
                                                            setValue(`facilitiesChecklist.${option.id}.checked`, !currentVal);
                                                        }}
                                                    >
                                                        <div className="flex items-center justify-between p-3">
                                                            <div className="flex items-center gap-3">
                                                                {/* Custom Checkbox */}
                                                                <div className={cn(
                                                                    "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors",
                                                                    isChecked
                                                                        ? `${theme.bg} border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]`
                                                                        : "bg-white border-slate-300"
                                                                )}>
                                                                    {isChecked && <Check size={14} strokeWidth={3} className="text-white" />}
                                                                    <input
                                                                        type="checkbox"
                                                                        {...register(`facilitiesChecklist.${option.id}.checked`)}
                                                                        className="sr-only"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    />
                                                                </div>

                                                                {/* Icon + Label */}
                                                                <div className={cn(
                                                                    "w-8 h-8 rounded-lg flex items-center justify-center border-2 transition-colors",
                                                                    isChecked
                                                                        ? `${theme.bg} border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]`
                                                                        : "bg-slate-100 border-slate-200"
                                                                )}>
                                                                    <Icon size={16} strokeWidth={2.5} className={isChecked ? 'text-white' : 'text-slate-500'} />
                                                                </div>
                                                                <span className={cn(
                                                                    "font-bold text-sm transition-colors",
                                                                    isChecked ? 'text-black' : 'text-slate-600'
                                                                )}>
                                                                    {option.label}
                                                                </span>
                                                            </div>

                                                            {/* Quantity Input (Single Location) */}
                                                            {isChecked && !isMultiLoc && (
                                                                <div
                                                                    className="flex items-center gap-2"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <span className="text-[10px] text-slate-500 font-black uppercase">Qty</span>
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        {...register(`facilitiesChecklist.${option.id}.quantity`)}
                                                                        defaultValue={1}
                                                                        className="w-14 h-8 text-center border-2 border-black rounded-md focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none bg-white text-sm font-black"
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Multi-Location Distribution */}
                                                        {isChecked && isMultiLoc && (
                                                            <div
                                                                className="px-4 pb-3 pt-0 space-y-2 border-t-2 border-dashed border-slate-300"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <div className="pt-3">
                                                                    {selectedLocations.map(loc => (
                                                                        <div key={loc} className="flex items-center justify-between py-1.5 text-sm">
                                                                            <div className="flex items-center gap-2 text-slate-700 font-medium">
                                                                                <div className={cn("w-2 h-2 rounded-full", theme.bg)} />
                                                                                {loc}
                                                                            </div>
                                                                            <input
                                                                                type="number"
                                                                                min="0"
                                                                                placeholder="0"
                                                                                {...register(`facilitiesChecklist.${option.id}.distribution.${loc}`, {
                                                                                    onChange: (e) => {
                                                                                        const currentDist = watch(`facilitiesChecklist.${option.id}.distribution`) || {};
                                                                                        const total = Object.values({ ...currentDist, [loc]: e.target.value }).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
                                                                                        setValue(`facilitiesChecklist.${option.id}.quantity`, total);
                                                                                    }
                                                                                })}
                                                                                className="w-14 h-7 text-center border-2 border-black rounded-md focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] outline-none bg-white text-sm font-bold"
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                    <div className="flex justify-end pt-2 border-t border-slate-200 mt-2">
                                                                        <div className={cn("text-xs font-black px-2 py-1 rounded border-2 border-black", theme.light)}>
                                                                            Total: {watch(`facilitiesChecklist.${option.id}.quantity`) || 0}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </Section>

                                <Section title="Additional Notes" icon={FileText}>
                                    <textarea
                                        {...register('notes')}
                                        rows="3"
                                        className="w-full p-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-black focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-colors duration-150 text-sm font-medium hover:border-black placeholder:text-slate-400"
                                        placeholder="Any special requests or notes..."
                                    />
                                </Section>
                            </div>

                            {/* TAB 2: CONSTRUCTION & LOGISTICS */}
                            <div className={activeTab === 'logistics' ? 'block' : 'hidden'}>
                                <Section title="Construction & Logistics (External)" icon={Hammer}>
                                    <div className="space-y-6">
                                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mb-4">
                                            <div className="flex gap-2">
                                                <Info className="text-amber-600 shrink-0" size={20} />
                                                <p className="text-sm text-amber-800">
                                                    Please fill this section ONLY if you are bringing external equipment or have a construction team setting up (e.g., Backdrop, Stage).
                                                </p>
                                            </div>
                                        </div>

                                        <InputGroup label="Setup Requirements" error={errors.setup}>
                                            <textarea
                                                {...register('setup')}
                                                rows="3"
                                                className="w-full p-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-black focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-colors duration-150 text-sm font-medium hover:border-black placeholder:text-slate-400"
                                                placeholder="Stage setup, backdrop, etc."
                                            />
                                        </InputGroup>

                                        {/* Contractor Packages Section */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                                    <Users size={20} /> Nhà thầu / Đơn vị thi công
                                                </h3>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => appendContractor({
                                                        contractorName: '',
                                                        workDescription: '',
                                                        startDate: '',
                                                        endDate: '',
                                                        startTime: '',
                                                        endTime: '',
                                                        equipmentInOut: [{ name: '', specification: '', quantity: '', notes: '' }],
                                                        constructionPersonnel: [{ name: '', phone: '', idCard: '' }]
                                                    })}
                                                    className="gap-2 text-primary-600 border-primary-200 hover:bg-primary-50"
                                                >
                                                    <Plus size={16} /> Thêm nhà thầu
                                                </Button>
                                            </div>

                                            {contractorPackageFields.length === 0 ? (
                                                <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                                    <Users size={40} className="mx-auto text-slate-300 mb-3" />
                                                    <p className="text-slate-500 mb-4">Chưa có nhà thầu nào</p>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => appendContractor({
                                                            contractorName: '',
                                                            workDescription: '',
                                                            startDate: '',
                                                            endDate: '',
                                                            startTime: '',
                                                            endTime: '',
                                                            equipmentInOut: [{ name: '', specification: '', quantity: '', notes: '' }],
                                                            constructionPersonnel: [{ name: '', phone: '', idCard: '' }]
                                                        })}
                                                        className="gap-2"
                                                    >
                                                        <Plus size={16} /> Thêm nhà thầu đầu tiên
                                                    </Button>
                                                </div>
                                            ) : (
                                                <AnimatePresence>
                                                    {contractorPackageFields.map((field, index) => (
                                                        <ContractorCard
                                                            key={field.id}
                                                            control={control}
                                                            register={register}
                                                            index={index}
                                                            remove={removeContractor}
                                                            watch={watch}
                                                        />
                                                    ))}
                                                </AnimatePresence>
                                            )}
                                        </div>

                                        {/* Work Items - Keep for backward compatibility */}
                                        <div className="space-y-3 mt-6">
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Work Items (Hạng mục công việc)</label>
                                            {workItemsFields.map((field, index) => (
                                                <div key={field.id} className="flex gap-2 mb-2 items-start">
                                                    <div className="flex-[2]">
                                                        <Input {...register(`workItems.${index}.category`)} placeholder="Hạng mục công việc" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <Input type="date" {...register(`workItems.${index}.startDate`)} placeholder="Ngày bắt đầu" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <Input type="date" {...register(`workItems.${index}.endDate`)} placeholder="Ngày kết thúc" />
                                                    </div>
                                                    <div className="flex-[1.5]">
                                                        <Input {...register(`workItems.${index}.notes`)} placeholder="Ghi chú" />
                                                    </div>
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeWorkItem(index)} className="text-red-400 hover:text-red-600 hover:bg-red-50 mt-1"><Trash2 size={18} /></Button>
                                                </div>
                                            ))}
                                            <Button type="button" variant="ghost" onClick={() => appendWorkItem({ category: '', startDate: '', endDate: '', notes: '' })} className="text-primary-600 hover:text-primary-700 hover:bg-primary-50 gap-2"><Plus size={16} /> Add Work Item</Button>
                                        </div>
                                    </div>
                                </Section>
                            </div>


                            <div className="flex gap-4 pt-6 border-t-2 border-dashed border-slate-200 mt-6">
                                <button
                                    type="button"
                                    onClick={() => navigate('/')}
                                    className="px-6 py-3 bg-white text-slate-700 font-bold border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-50 active:bg-slate-100 transition-colors duration-150 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:opacity-90 active:opacity-100 transition-opacity duration-150 cursor-pointer"
                                >
                                    <Save size={20} strokeWidth={2.5} />
                                    {id ? 'Update Event' : 'Create Event'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Right Column - Live Preview */}
                    <div className="lg:col-span-1 hidden lg:block">
                        <LivePreview data={watch()} resources={dynamicEquipment} />
                    </div>
                </div>
                {/* Venue Map Modal */}
                <VenueMapModal
                    isOpen={isMapOpen}
                    onClose={() => setIsMapOpen(false)}
                    onSelect={(loc) => {
                        setValue('location', loc, { shouldValidate: true, shouldDirty: true });
                    }}
                    selectedLocation={watch('location')}
                    bookedLocations={[]}
                />
            </div>
        </div>
    );
};

export default EventForm;
