import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, CheckSquare, Square } from 'lucide-react';
import { eventsApi as api } from '../api/events';

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

const PrintPortal = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [selectedForms, setSelectedForms] = useState(['construction']); // Default select first
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const response = await api.getById(id);
                setEvent(response);
            } catch (error) {
                console.error('Error fetching event:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, [id]);

    const toggleForm = (formId) => {
        setSelectedForms(prev =>
            prev.includes(formId)
                ? prev.filter(id => id !== formId)
                : [...prev, formId]
        );
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="p-8 text-center">Loading event data...</div>;
    if (!event) return <div className="p-8 text-center text-red-500">Event not found</div>;

    return (
        <div className="min-h-screen bg-slate-100 print:bg-white">
            {/* No-Print Header / Controls */}
            <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-50 print:hidden shadow-sm">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <ArrowLeft size={20} className="text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">Cổng In Ấn Biểu Mẫu</h1>
                            <p className="text-sm text-slate-500">{event.eventName}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex gap-2">
                            {FORM_REGISTRY.map(form => (
                                <button
                                    key={form.id}
                                    onClick={() => toggleForm(form.id)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${selectedForms.includes(form.id)
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    {selectedForms.includes(form.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                                    {form.title}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-primary/30"
                        >
                            <Printer size={20} />
                            In Biểu Mẫu ({selectedForms.length})
                        </button>
                    </div>
                </div>
            </div>

            {/* Printable Content Area */}
            <div className="max-w-[210mm] mx-auto bg-white min-h-screen shadow-xl print:shadow-none print:w-full print:max-w-none">
                {selectedForms.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 italic">
                        Vui lòng chọn ít nhất một biểu mẫu để in.
                    </div>
                ) : (
                    <div className="print-content">
                        {FORM_REGISTRY.filter(f => selectedForms.includes(f.id)).map((form, index) => {
                            const Component = form.component;
                            return (
                                <div key={form.id} className="print-page">
                                    <Component data={event} />
                                    {/* Page break after each form except the last one */}
                                    {index < selectedForms.length - 1 && <div className="page-break"></div>}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Print Styles */}
            <style>{`
                @media print {
                    @page { margin: 0; size: A4; }
                    body { background: white; }
                    .print-page { padding: 20mm; width: 100%; height: 100%; box-sizing: border-box; }
                    .page-break { page-break-after: always; }
                }
                .print-page { padding: 20mm; } /* Visual padding for screen */
            `}</style>
        </div>
    );
};

export default PrintPortal;
