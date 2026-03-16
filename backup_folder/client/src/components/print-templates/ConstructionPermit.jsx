import React from 'react';
import EditableField from './EditableField';

const ConstructionPermit = ({ data, onUpdate }) => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return ''; // Handle invalid dates safely
        return date.toLocaleDateString('en-GB'); // DD/MM/YYYY
    };

    const renderField = (value, fieldName, placeholder = '') => {
        return (
            <EditableField
                value={value}
                onChange={(newValue) => onUpdate && onUpdate(fieldName, newValue)}
                placeholder={placeholder}
            />
        );
    };

    return (
        <div className="text-black leading-snug max-w-[210mm] print:max-w-none mx-auto print:mx-0 px-8 print:px-0 pb-8 pt-0 bg-white text-sm" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
            {/* Header Image */}
            <div className="mb-2">
                <img src="/assets/forms/header-full-v3.jpg" alt="Header" className="w-full object-contain" />
            </div>

            {/* Title */}
            <div className="flex justify-between items-end mb-4 border-b-2 border-transparent">
                <div className="border border-black px-4 py-2 font-bold whitespace-nowrap">
                    MẪU / FORM: 02
                </div>
                <div className="text-center flex-1">
                    <h1 className="text-2xl font-bold uppercase">GIẤY CAM KẾT</h1>

                    <h2 className="text-lg font-bold italic">LETTER OF UNDERTAKING</h2>
                </div>
                <div className="w-32"></div> {/* Spacer for balance */}
            </div>

            {/* Recipient */}
            <div className="mb-3 font-bold">
                Kính gửi: Văn phòng Ban Quản lý/ <span className="italic">To the Management Office</span>
            </div>

            {/* Form Fields */}
            <div className="space-y-1">
                <div className="flex items-baseline">
                    <span className="whitespace-nowrap pr-2">Khách thuê/ <span className="italic">Company name:</span></span>
                    <span className="flex-1 border-b border-dotted border-black font-bold uppercase px-2">
                        {renderField(data.tenantName || 'TRUNG TÂM LIÊN KẾT FPT GREENWICH', 'tenantName')}
                    </span>
                </div>

                <div className="flex items-baseline">
                    <span className="whitespace-nowrap pr-2">Người đại diện/ <span className="italic">Representatives:</span></span>
                    <span className="flex-1 border-b border-dotted border-black font-bold px-2">{renderField(data.registrantName, 'registrantName')}</span>
                    <span className="whitespace-nowrap px-2">Di động/ <span className="italic">Mobile No.:</span></span>
                    <span className="w-32 border-b border-dotted border-black px-2">{renderField(data.contactPhone, 'contactPhone')}</span>
                </div>

                <div className="flex items-baseline">
                    <span className="whitespace-nowrap pr-2">Khu vực thuê / <span className="italic">Unit no:</span></span>
                    <span className="flex-1 border-b border-dotted border-black font-bold uppercase px-2">
                        {renderField(data.unitNo || 'TẦNG 1, 2, 3 TTTM', 'unitNo')}
                    </span>
                </div>

                <div className="flex items-baseline">
                    <span className="whitespace-nowrap pr-2">Nhà thầu thi công/ <span className="italic">Fitting-out Contractor:</span></span>
                    <span className="flex-1 border-b border-dotted border-black font-bold uppercase px-2">
                        {renderField(data.contractorName, 'contractorName')}
                    </span>
                </div>

                <div className="flex items-baseline">
                    <span className="whitespace-nowrap pr-2">Người đại diện/ <span className="italic">Representatives:</span></span>
                    <span className="flex-1 border-b border-dotted border-black px-2">{renderField(data.representative2Name, 'representative2Name')}</span>
                    <span className="whitespace-nowrap px-2">Di động/ <span className="italic">Mobile No.:</span></span>
                    <span className="w-32 border-b border-dotted border-black px-2">{renderField(data.representative2Phone, 'representative2Phone')}</span>
                </div>

                <div className="flex items-baseline">
                    <span className="whitespace-nowrap pr-2">Từ ngày/ <span className="italic">From:</span></span>
                    <span className="flex-1 border-b border-dotted border-black px-2">
                        {renderField(formatDate(data.constructionTimeStart || data.eventDate), 'constructionTimeStart')}
                    </span>
                    <span className="whitespace-nowrap px-2">Đến ngày/ <span className="italic">To:</span></span>
                    <span className="w-40 border-b border-dotted border-black px-2">
                        {renderField(formatDate(data.constructionTimeEnd || data.eventDate), 'constructionTimeEnd')}
                    </span>
                </div>
            </div>

            {/* Undertaking Content (Blank Lines) */}
            <div className="mt-4 mb-2">
                <h3 className="font-bold mb-2">Chúng tôi cam kết/ <span className="italic">We hereby undertake:</span></h3>

                <div className="space-y-2">
                    {Array.from({ length: 10 }).map((_, index) => (
                        <div key={index} className="border-b border-dotted border-black h-6 w-full"></div>
                    ))}
                </div>
            </div>

            {/* Signature */}
            <div className="mt-8 flex justify-end">
                <div className="text-center">
                    <div className="italic mb-1 text-center">
                        <EditableField
                            isInline={true}
                            value={data.signDateString || `TP. Hồ Chí Minh, ngày ${day} tháng ${month} năm ${year}`}
                            onChange={(val) => onUpdate('signDateString', val)}
                            className="text-center"
                        />
                    </div>
                    <h4 className="font-bold uppercase">Ký tên và đóng dấu</h4>
                    <p className="italic font-bold">Signed & sealed by</p>
                    <div className="h-24"></div>
                </div>
            </div>
        </div>
    );
};

export default ConstructionPermit;
