import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Printer, CheckSquare, Square, FileText, Truck, Hammer, Calendar, ChevronRight, Layers, CheckCircle2, Circle, Download, Loader2, GripVertical, Check, Users } from 'lucide-react';
import { eventsApi as api } from '../api/events';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import PrintGuide from './PrintGuide';
import { FORM_SCENARIOS, mapEventToFormData } from './FormScenarios';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Registry of available forms
import ConstructionPermit from './print-templates/ConstructionPermit';
import LetterOfUndertaking from './print-templates/LetterOfUndertaking';
import ApplicationToCommence from './print-templates/ApplicationToCommence';
import PersonnelList from './print-templates/PersonnelList';
import WorkingPermit from './print-templates/WorkingPermit';
import SpecialWorkPermit from './print-templates/SpecialWorkPermit';
import DecorationFitOutPermit from './print-templates/DecorationFitOutPermit';
import PlanAndProgress from './print-templates/PlanAndProgress';
import EquipmentMovingPermit from './print-templates/EquipmentMovingPermit';
import DecorationExtension from './print-templates/DecorationExtension';
import NoticeOfCompletion from './print-templates/NoticeOfCompletion';
import FitOutCompletionInspection from './print-templates/FitOutCompletionInspection';
import FitOutDepositRefund from './print-templates/FitOutDepositRefund';
import PenaltyForViolation from './print-templates/PenaltyForViolation';
import EventApplicationForm from './print-templates/EventApplicationForm';
import PageBreakTest from './print-templates/PageBreakTest';
import WorkingPermitPage1 from './print-templates/WorkingPermitPage1';
import WorkingPermitPage2 from './print-templates/WorkingPermitPage2';
import WorkingPermitPage3 from './print-templates/WorkingPermitPage3';

const FORM_REGISTRY = [
    { id: 'form01', title: 'Form 01: Giấy Cam Kết (Letter of Undertaking)', component: LetterOfUndertaking },
    { id: 'construction', title: 'Form 02: Giấy Cam Kết (Blank)', component: ConstructionPermit },
    { id: 'form03', title: 'Form 03: Phiếu Đăng Ký Bắt Đầu Thi Công', component: ApplicationToCommence },
    { id: 'form04', title: 'Form 04: Đăng Ký Danh Sách Công Nhân', component: PersonnelList },
    { id: 'form05', title: 'Form 05: Phiếu Đăng Ký Làm Việc Ngoài Giờ', component: WorkingPermit },
    { id: 'form06', title: 'Form 06: Đăng Ký Thi Công Đặc Biệt', component: SpecialWorkPermit },
    { id: 'form07', title: 'Form 07: Phiếu Đăng Ký Thi Công Trang Trí', component: DecorationFitOutPermit },
    { id: 'form08', title: 'Form 08: Kế Hoạch Và Tiến Độ Thi Công', component: PlanAndProgress },
    { id: 'form09', title: 'Form 09: Phiếu Đăng Ký Di Chuyển Tài Sản', component: EquipmentMovingPermit },
    { id: 'form10', title: 'Form 10: Đăng Ký Gia Hạn Thi Công', component: DecorationExtension },
    { id: 'notice-completion', title: 'Form 11: Thông Báo Hoàn Tất', component: NoticeOfCompletion },
    { id: 'fit-out-inspection', title: 'Form 12: Biên Bản Nghiệm Thu', component: FitOutCompletionInspection },
    { id: 'deposit-refund', title: 'Form 13: Đề Nghị Hoàn Tiền Ký Quỹ', component: FitOutDepositRefund },
    { id: 'penalty-violation', title: 'Form 14: Phạt Hành Chính Vi Phạm', component: PenaltyForViolation },
    { id: 'event-application', title: 'Form 15: Mẫu Đăng Ký Sự Kiện', component: EventApplicationForm },
];

const SortableFormItem = ({ form, isSelected, onToggle, onScroll }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: form.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        position: 'relative',
    };

    const isLastItem = form.isLast;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`w-full text-left px-3 py-2.5 text-sm transition-colors duration-150 flex items-start gap-3 group relative border-b border-slate-100 last:border-0 ${isSelected
                ? 'bg-blue-50/40 text-slate-900'
                : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                } ${isDragging ? 'opacity-50 z-50 bg-white shadow-lg ring-1 ring-slate-200' : ''}`}
        >
            {/* Drag Handle - Hidden by default, visible on hover */}
            <div
                {...attributes}
                {...listeners}
                className={`flex-shrink-0 mt-1 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-200/50 transition-opacity duration-200 ${isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            >
                <GripVertical size={14} className="text-slate-300" />
            </div>

            {/* Content Container */}
            <div
                className="flex-1 flex items-start gap-3 cursor-pointer select-none min-w-0"
                onClick={() => {
                    onToggle(form.id);
                    onScroll(form.id);
                }}
            >
                {/* Custom Checkbox */}
                <div className={`flex-shrink-0 mt-0.5 relative flex items-center justify-center w-5 h-5 rounded border transition-all duration-200 ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300 group-hover:border-slate-400'}`}>
                    {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
                </div>

                {/* Text Content */}
                <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                        {/* Form Code/ID Badge */}
                        <span className="mt-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded leading-none shrink-0 border border-slate-100/50">
                            {form.id.split('_').pop().toUpperCase().slice(0, 3)}
                        </span>
                        <span className={`text-[13px] leading-snug break-words ${isSelected ? 'font-medium text-slate-900' : 'text-slate-600'}`}>
                            {form.title}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PrintPortal = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [event, setEvent] = useState(null);

    // Initialize selectedForms from URL or empty
    const [selectedForms, setSelectedForms] = useState(() => {
        const forms = searchParams.get('forms');
        return forms ? forms.split(',') : [];
    });
    const [loading, setLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);

    // Drag & Drop State
    const [items, setItems] = useState(FORM_REGISTRY);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Contractor Selection State
    const [selectedContractorIndex, setSelectedContractorIndex] = useState(-1);

    // Get contractors list from event
    const getContractors = () => {
        if (!event) return [];
        // New structure: contractorPackages
        if (event.contractorPackages && event.contractorPackages.length > 0) {
            return event.contractorPackages;
        }
        // Legacy structure: flat contractor fields
        if (event.contractorName) {
            return [{
                contractorName: event.contractorName,
                workDescription: event.constructionContent,
                equipmentInOut: event.equipmentInOut || [],
                constructionPersonnel: event.constructionPersonnel || []
            }];
        }
        return [];
    };

    const contractors = getContractors();
    const selectedContractor = selectedContractorIndex >= 0 ? contractors[selectedContractorIndex] : null;

    // Get event data filtered by selected contractor
    const getFilteredEventData = () => {
        if (!event) return null;
        if (!selectedContractor) return event;
        return {
            ...event,
            contractorName: selectedContractor.contractorName,
            constructionContent: selectedContractor.workDescription,
            // Map dates for different templates (Form 04, 09, etc.)
            constructionStartDate: selectedContractor.startDate,
            constructionEndDate: selectedContractor.endDate,
            constructionTimeStart: selectedContractor.startDate, // For Form 04 (PersonnelList)
            constructionTimeEnd: selectedContractor.endDate,     // For Form 04 (PersonnelList)
            constructionStartTime: selectedContractor.startTime,
            constructionEndTime: selectedContractor.endTime,
            equipmentInOut: selectedContractor.equipmentInOut || [],
            constructionPersonnel: selectedContractor.constructionPersonnel || []
        };
    };

    const filteredEvent = getFilteredEventData();

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            setItems((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);

                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    // Scenario State
    const [activeScenario, setActiveScenario] = useState(null);
    const [activeOption, setActiveOption] = useState(null);

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const response = await api.getById(id);
                const enrichedEvent = mapEventToFormData(response);
                setEvent(enrichedEvent);
            } catch (error) {
                console.error('Error fetching event:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, [id]);

    // Sync selectedForms to URL
    useEffect(() => {
        if (selectedForms.length > 0) {
            setSearchParams({ forms: selectedForms.join(',') });
        } else {
            setSearchParams({});
        }
    }, [selectedForms, setSearchParams]);

    const toggleForm = (formId) => {
        setSelectedForms(prev =>
            prev.includes(formId)
                ? prev.filter(id => id !== formId)
                : [...prev, formId]
        );
    };

    const scrollToForm = (formId) => {
        const element = document.getElementById(`form-${formId}`);
        if (element) element.scrollIntoView({ behavior: 'smooth' });
    };

    const handleScenarioSelect = (scenarioId, optionId, forms) => {
        setActiveScenario(scenarioId);
        setActiveOption(optionId);
        setSelectedForms(forms);
    };



    // Helper: Convert images to base64
    const convertImagesToBase64 = async (container) => {
        const images = Array.from(container.querySelectorAll('img'));
        console.log(`[PDF] Found ${images.length} images to convert`);

        const conversionPromises = images.map(async (img, index) => {
            try {
                // Skip if already base64
                if (img.src.startsWith('data:')) {
                    console.log(`[PDF] Image ${index + 1} already base64`);
                    return;
                }

                // Wait for image to load if not already loaded
                if (!img.complete) {
                    console.log(`[PDF] Waiting for image ${index + 1} to load...`);
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = () => reject(new Error('Image failed to load'));
                        setTimeout(() => reject(new Error('Image load timeout')), 5000);
                    });
                }

                console.log(`[PDF] Converting image ${index + 1}...`);

                // Fetch and convert to base64
                const response = await fetch(img.src);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const blob = await response.blob();
                const base64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });

                img.src = base64;
                console.log(`[PDF] ✓ Image ${index + 1} converted`);
            } catch (error) {
                console.error(`[PDF] ✗ Image ${index + 1} failed:`, error.message);
            }
        });

        await Promise.all(conversionPromises);
        console.log('[PDF] All images processed');
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            console.log('[PDF] Starting download...');

            // Get the rendered content
            const printContent = document.getElementById('print-content');
            if (!printContent) {
                throw new Error('Print content not found');
            }

            // Clone the content to avoid React re-rendering issues
            console.log('[PDF] Cloning content...');
            const clonedContent = printContent.cloneNode(true);

            console.log('[PDF] Converting images to base64...');
            await convertImagesToBase64(clonedContent);

            console.log('[PDF] Extracting styles...');
            // Extract ONLY inline styles to avoid CORS issues
            const styles = Array.from(document.querySelectorAll('style'))
                .map(style => style.textContent)
                .join('\n');

            console.log('[PDF] Building HTML document...');
            // Build complete HTML document from CLONED content
            const htmlDocument = `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${event?.eventName || 'Document'}</title>
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; font-family: "Times New Roman", Times, serif; }
        ${styles}
    </style>
</head>
<body>
    ${clonedContent.innerHTML}
</body>
</html>`;

            console.log(`[PDF] HTML size: ${(htmlDocument.length / 1024).toFixed(2)} KB`);
            console.log('[PDF] Sending to server...');

            // Send to server for PDF generation (using proxy)
            const response = await fetch('/api/pdf/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    html: htmlDocument,
                    filename: `${event?.eventName || 'document'}.pdf`
                })
            });

            console.log(`[PDF] Server response status: ${response.status}`);

            if (!response.ok) {
                const error = await response.json().catch(() => ({ details: 'Unknown error' }));
                console.error('[PDF] Server error:', error);
                throw new Error(error.details || 'PDF generation failed');
            }

            console.log('[PDF] Downloading blob...');
            // Download the PDF
            const blob = await response.blob();
            console.log(`[PDF] Blob size: ${(blob.size / 1024).toFixed(2)} KB`);

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${event?.eventName || 'document'}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error('Download failed:', error);
            alert('Có lỗi xảy ra khi tải xuống. Vui lòng thử lại.');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleFieldUpdate = (field, value) => {
        setEvent(prev => ({
            ...prev,
            [field]: value
        }));
    };

    if (loading) return <div className="p-8 text-center">Loading event data...</div>;
    if (!event) return (
        <div className="p-8 text-center text-red-500">
            <p className="font-bold text-lg mb-2">Event not found</p>
            <p className="text-sm text-slate-400">ID: {id}</p>
            <Button variant="outline" onClick={() => navigate('/')} className="mt-4">Back to Dashboard</Button>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-900 print:block print:bg-white">
            {/* Sidebar - Modern Light Theme */}
            <div className="w-[360px] bg-slate-50/50 flex flex-col border-r border-slate-200/60 z-20 backdrop-blur-xl h-screen sticky top-0">
                {/* Header */}
                <div className="p-6 pb-2">
                    <div className="flex items-center gap-4 mb-6">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="rounded-full hover:bg-white hover:shadow-sm -ml-2 text-slate-400 hover:text-slate-600">
                            <ArrowLeft size={20} />
                        </Button>
                        <div>
                            <h1 className="font-bold text-xl text-slate-800 tracking-tight flex items-center gap-2">
                                <Printer size={20} className="text-blue-600" />
                                PrintPortal
                            </h1>
                            <p className="text-slate-400 text-[11px] font-medium tracking-wide uppercase">Quản lý hồ sơ in ấn</p>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content Area - Contains Contractor, Scenarios, and Form List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6">
                    {/* Contractor Selector */}
                    {contractors.length > 0 && (
                        <div className="mb-4">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-3 flex items-center gap-2 tracking-widest pl-1">
                                <Users size={12} /> Chọn Nhà Thầu
                            </h3>
                            <select
                                value={selectedContractorIndex}
                                onChange={(e) => setSelectedContractorIndex(parseInt(e.target.value))}
                                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            >
                                <option value={-1}>-- Tất cả nhà thầu --</option>
                                {contractors.map((c, idx) => (
                                    <option key={idx} value={idx}>
                                        {c.contractorName || `Nhà thầu ${idx + 1}`}
                                    </option>
                                ))}
                            </select>
                            {selectedContractor && (
                                <div className="mt-2 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                                    <p className="font-medium">{selectedContractor.contractorName}</p>
                                    <p className="text-blue-600">{selectedContractor.workDescription}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Scenarios - Clean Cards */}
                    <div className="mb-4">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-3 flex items-center gap-2 tracking-widest pl-1">
                            <Layers size={12} /> Chọn Hồ Sơ Mẫu
                        </h3>
                        <div className="space-y-4">
                            {FORM_SCENARIOS.map(scenario => (
                                <div key={scenario.id} className="group">
                                    <div className="grid grid-cols-1 gap-2.5">
                                        {scenario.options.map(option => (
                                            <button
                                                key={option.id}
                                                onClick={() => handleScenarioSelect(scenario.id, option.id, option.forms)}
                                                className={`px-4 py-3 text-[13px] rounded-xl border transition-all duration-300 w-full text-left flex items-center justify-between group/btn relative overflow-hidden ${activeScenario === scenario.id && activeOption === option.id
                                                    ? 'bg-white border-blue-200 text-blue-700 shadow-md shadow-blue-500/10 ring-1 ring-blue-100'
                                                    : 'bg-white border-transparent text-slate-600 hover:border-blue-100 hover:shadow-sm hover:text-slate-800'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3 relative z-10">
                                                    <div className={`p-1.5 rounded-lg ${activeScenario === scenario.id && activeOption === option.id ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400 group-hover/btn:bg-white group-hover/btn:text-blue-400'}`}>
                                                        {scenario.id === 'entry_exit' && <Truck size={14} />}
                                                        {scenario.id === 'construction' && <Hammer size={14} />}
                                                        {scenario.id === 'event' && <Calendar size={14} />}
                                                    </div>
                                                    <span className="font-medium">{option.label}</span>
                                                </div>
                                                {activeScenario === scenario.id && activeOption === option.id && (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50"></div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Form List - Clean List */}
                    <div className="sticky top-0 bg-slate-50/95 backdrop-blur z-10 py-3 flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Danh sách biểu mẫu</span>
                        {selectedForms.length > 0 && (
                            <Badge variant="default" className="text-[10px] px-2 py-0.5 h-auto bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 border-0 rounded-full">
                                {selectedForms.length} ĐÃ CHỌN
                            </Badge>
                        )}
                    </div>
                    {/* Unified Container - iOS Settings Style */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={items}
                                strategy={verticalListSortingStrategy}
                            >
                                {items.map((form, index) => {
                                    const isSelected = selectedForms.includes(form.id);
                                    // Pass isLast prop for divider logic
                                    const formWithMeta = { ...form, isLast: index === items.length - 1 };
                                    return (
                                        <SortableFormItem
                                            key={form.id}
                                            form={formWithMeta}
                                            isSelected={isSelected}
                                            onToggle={toggleForm}
                                            onScroll={scrollToForm}
                                        />
                                    );
                                })}
                            </SortableContext>
                        </DndContext>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden print:h-auto print:overflow-visible print:block bg-[#EEF2F6]">
                {/* Header */}
                <header className="bg-white/80 backdrop-blur-md border-b border-white/40 px-8 py-4 flex justify-between items-center sticky top-0 z-30 transition-all duration-300 print:hidden">
                    <div className="flex items-center gap-4">
                        <div>
                            <h2 className="font-bold text-xl text-slate-800 tracking-tight">{event?.eventName || 'Đang tải...'}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className={`rounded-full border-0 px-2 py-0.5 ${event ? 'bg-green-50 text-green-700 ring-1 ring-green-600/20' : 'bg-slate-100 text-slate-500'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${event ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                                    {event?.companyName}
                                </Badge>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="default"
                            onClick={handleDownload}
                            disabled={isDownloading || selectedForms.length === 0}
                            className={`gap-2 rounded-xl shadow-xl shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 ${isDownloading ? 'bg-slate-100 text-slate-400' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0'}`}
                        >
                            {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                            <span className="font-medium">{isDownloading ? 'Đang xử lý...' : 'Tải Hồ Sơ PDF'}</span>
                        </Button>
                    </div>
                </header>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-8 print:p-0 print:overflow-visible print:h-auto print:block custom-scrollbar scroll-smooth">
                    <div id="print-content" className="max-w-[210mm] mx-auto transition-all duration-300 print:w-full print:max-w-none print:mx-0 pb-32">
                        {selectedForms.length === 0 ? (
                            <div className="h-[70vh] flex flex-col items-center justify-center text-slate-400 gap-6">
                                <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center text-blue-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-white/50">
                                    <FileText size={48} className="text-blue-200" strokeWidth={1.5} />
                                </div>
                                <div className="text-center max-w-sm">
                                    <h3 className="text-xl font-bold text-slate-700 mb-2">Chưa chọn biểu mẫu</h3>
                                    <p className="text-sm text-slate-400 leading-relaxed">Hãy chọn một bộ hồ sơ mẫu hoặc các biểu mẫu riêng lẻ từ menu bên trái để bắt đầu xem trước.</p>
                                </div>
                                <div className="flex gap-2 text-xs font-medium text-slate-300 uppercase tracking-widest mt-8">
                                    <span className="flex items-center gap-1"><ArrowLeft size={12} /> Chọn menu bên trái</span>
                                </div>
                            </div>
                        ) : (
                            items
                                .filter(form => selectedForms.includes(form.id))
                                .map((form, index) => {
                                    const Component = form.component;
                                    const formId = form.id;

                                    return (
                                        <div
                                            id={`form-${formId}`}
                                            key={formId}
                                            className="relative group print:break-after-page print:block mb-12 last:mb-0"
                                        >
                                            {/* Preview Container (Paper) */}
                                            <div className="bg-white shadow-[0_4px_24px_rgba(148,163,184,0.15)] print:shadow-none transition-all hover:shadow-[0_8px_32px_rgba(148,163,184,0.2)]">
                                                {/* Form Content - Direct Render */}
                                                <Component
                                                    data={filteredEvent}
                                                    onUpdate={handleFieldUpdate}
                                                />
                                            </div>

                                            {/* Floating Toolbar (Hover) - Outside Paper */}
                                            <div className="absolute -right-20 top-0 flex flex-col gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 print:hidden translate-x-[-10px] group-hover:translate-x-0">
                                                <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest rotate-90 origin-left translate-y-12 translate-x-3 whitespace-nowrap">
                                                    Page {index + 1}
                                                </div>
                                                <button
                                                    onClick={() => toggleForm(formId)}
                                                    className="p-3 bg-white text-slate-400 hover:text-red-500 rounded-full shadow-lg border border-slate-100 hover:scale-110 transition-all"
                                                    title="Xóa form này"
                                                >
                                                    <Square size={20} strokeWidth={2} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                        )}
                    </div>
                </div>
            </div>

            {/* Print Styles */}
            <style>{`
                /* Screen Preview Styles (A4 Visualization) */
                .a4-page {
                    width: 210mm;
                    min-height: 297mm;
                    background: white;
                    margin: 2rem auto;
                    padding: 0;
                    box-shadow: 0 4px 24px rgba(0,0,0,0.15);
                    position: relative;
                }

                @media print {
                    @page { 
                        margin: 0; /* Let content handle its own margins */
                        size: A4 portrait;
                    }
                    
                    /* Aggressive Reset */
                    html, body {
                        height: auto !important;
                        overflow: visible !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    /* Content container - full width */
                    #print-content {
                        width: 100% !important;
                        max-width: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    
                    /* Reset A4 Page Styles for Print */
                    .a4-page {
                        width: 100% !important;
                        min-height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important; 
                        box-shadow: none !important;
                        border: none !important;
                        page-break-after: always !important;
                    }
                    
                    /* Let templates handle their own padding - just remove centering */
                    .a4-page > div {
                        max-width: none !important;
                        width: 100% !important;
                        margin: 0 !important;
                    }
                    
                    /* Force all text to be black in print */
                    * {
                        color: black !important;
                    }
                    
                    #root {
                        display: block !important;
                    }
                    
                    /* Hide UI elements */
                    .print\\:hidden { 
                        display: none !important; 
                    }

                    /* Explicit Page Breaks */
                    .print-break-before {
                        page-break-before: always !important;
                        break-before: page !important;
                        margin-top: 0 !important;
                    }
                    
                    .print-break-after-page {
                        page-break-after: always !important;
                        break-after: page !important;
                    }
                    
                    /* Prevent breaks inside tables */
                    table, tr, td, th, tbody, thead {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                }
                
                /* Custom Scrollbar for Sidebar */
                .custom-scrollbar::-webkit-scrollbar {
                    width: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }

                /* PDF Generation Styles */
                .printing-mode {
                    background: white !important;
                    color: black !important;
                }
                .printing-mode .print\\:hidden {
                    display: none !important;
                }
                .printing-mode * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                
                /* Force headers to top of page in PDF */
                .printing-mode .print-break-before {
                    break-before: page !important;
                    page-break-before: always !important;
                    margin-top: 0 !important;
                    padding-top: 0 !important;
                }
                
                /* Ensure images (headers) don't get cut off */
                .printing-mode img {
                    max-width: 100% !important;
                    page-break-inside: avoid !important;
                }
            `}</style>
        </div>
    );
};

export default PrintPortal;
