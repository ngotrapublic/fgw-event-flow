import React from 'react';
import EditableField from './EditableField';

const WorkingPermitPage1 = ({ data, onUpdate }) => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleDateString('en-GB');
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

    const handleArrayUpdate = (arrayName, index, field, value) => {
        if (!onUpdate) return;
        const list = data[arrayName] ? [...data[arrayName]] : [];
        while (list.length <= index) {
            list.push({});
        }
        list[index] = { ...list[index], [field]: value };
        onUpdate(arrayName, list);
    };

    const renderArrayField = (arrayName, index, field, value) => {
        return (
            <EditableField
                value={value}
                onChange={(newValue) => handleArrayUpdate(arrayName, index, field, newValue)}
            />
        );
    };

    const Header = () => (
        <div className="mb-2">
            <img src="/assets/forms/header-full-v3.jpg" alt="Header" className="w-full object-contain" />
        </div>
    );

    return (
        <div className="max-w-[210mm] print:max-w-none mx-auto print:mx-0 px-8 print:px-0 pb-0 pt-0 relative bg-white print-break-before">
            <Header />

            {/* Title */}
            <div className="flex justify-between items-start mb-4 border-b-2 border-transparent">
                <div className="border border-black px-2 py-2 font-bold whitespace-nowrap h-fit text-sm w-32 text-center">
                    MẪU / FORM: 05
                </div>
                <div className="text-center flex-1 px-1">
                    <h1 className="text-[17px] font-bold uppercase tracking-tighter whitespace-nowrap">PHIẾU ĐĂNG KÝ LÀM VIỆC / THI CÔNG NGOÀI GIỜ</h1>
                    <h2 className="text-sm font-bold italic">WORKING PERMIT APPLICATION FORM</h2>
                </div>
                <div className="w-32"></div>
            </div>

            {/* Info Section */}
            <div className="text-xs space-y-1 mb-2">
                <div className="border border-black p-2 text-center mb-2">
                    <p className="font-bold text-sm">Để phục vụ tốt hơn, việc đăng ký cần thực hiện trước khi thi công ít nhất 03 ngày làm việc.</p>
                    <p className="italic text-sm">Application should be made at least 3 working day prior to the commencement of work.</p>
                </div>

                <div className="flex items-baseline">
                    <span className="whitespace-nowrap pr-2 font-bold">Kính gửi: Văn phòng Ban Quản lý/ <span className="italic font-normal">To the Management Office</span></span>
                </div>

                <div className="flex items-baseline">
                    <span className="whitespace-nowrap pr-2">Khách thuê/ <span className="italic">Company name:</span></span>
                    <span className="flex-1 border-b border-dotted border-black font-bold uppercase px-2 text-blue-900">
                        {renderField(data.companyName || 'TRUNG TÂM LIÊN KẾT FPT GREENWICH', 'companyName')}
                    </span>
                </div>

                <div className="flex items-baseline">
                    <span className="whitespace-nowrap pr-2">Khu vực thuê/ <span className="italic">Unit no.: </span></span>
                    <span className="w-48 border-b border-dotted border-black px-2 font-bold text-blue-900">{renderField(data.unitNumber || 'TẦNG 1, 2, 3 TTTM', 'unitNumber')}</span>
                </div>

                <div className="flex items-baseline">
                    <span className="whitespace-nowrap pr-2">Nội dung thi công/ <span className="italic">Fitting-out Content:</span></span>
                    <span className="flex-1 border-b border-dotted border-black px-2">
                        {renderField(data.constructionContent || data.eventName, 'constructionContent')}
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
                    <span className="flex-1 border-b border-dotted border-black px-2">{renderField(data.registrantName, 'registrantName')}</span>
                    <span className="whitespace-nowrap px-2">Di động/ <span className="italic">Mobile No.:</span></span>
                    <span className="w-32 border-b border-dotted border-black px-2">{renderField(data.contactPhone, 'contactPhone')}</span>
                </div>
            </div>

            {/* Table I: Working Permit */}
            <div className="mb-2">
                <h3 className="font-bold italic mb-1">I. Đăng ký thi công, thi công ngoài giờ/ Working - overtime working permit form:</h3>
                <table className="w-full border-collapse border border-black text-xs">
                    <thead>
                        <tr>
                            <th rowSpan="2" className="border border-black p-1 text-center w-24">Ngày/ Date</th>
                            <th rowSpan="2" className="border border-black p-1 text-center">Mô tả công việc<br /><span className="italic font-normal">Work Description</span></th>
                            <th colSpan="2" className="border border-black p-1 text-center">Giờ thi công/ Working time</th>
                        </tr>
                        <tr>
                            <th className="border border-black p-1 text-center w-24">Giờ hành chính<br /><span className="italic font-normal">Business hours</span></th>
                            <th className="border border-black p-1 text-center w-24">Ngoài giờ<br /><span className="italic font-normal">Over time</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 3 }).map((_, index) => {
                            const item = (data.workingTimeList && data.workingTimeList[index]) || {};
                            return (
                                <tr key={index}>
                                    <td className="border border-black p-1 min-h-5">{renderArrayField('workingTimeList', index, 'date', item.date)}</td>
                                    <td className="border border-black p-1">{renderArrayField('workingTimeList', index, 'description', item.description)}</td>
                                    <td className="border border-black p-1">{renderArrayField('workingTimeList', index, 'businessHours', item.businessHours)}</td>
                                    <td className="border border-black p-1">{renderArrayField('workingTimeList', index, 'overtime', item.overtime)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Supervisor Info */}
            <div className="mb-2">
                <h3 className="font-bold italic mb-1">* Thông tin người giám sát / Supervisor information</h3>
                <table className="w-full border-collapse border border-black text-xs">
                    <thead>
                        <tr>
                            <th className="border border-black p-1 text-center w-12">STT/ No</th>
                            <th className="border border-black p-1 text-center">Họ & Tên/ Full name</th>
                            <th className="border border-black p-1 text-center w-32">Position/ Chức Vụ</th>
                            <th className="border border-black p-1 text-center w-32">Số ĐT/ Contact No.</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 2 }).map((_, index) => {
                            const item = (data.supervisorList && data.supervisorList[index]) || {};
                            return (
                                <tr key={index}>
                                    <td className="border border-black p-1 text-center min-h-6">{index + 1}</td>
                                    <td className="border border-black p-1">{renderArrayField('supervisorList', index, 'name', item.name)}</td>
                                    <td className="border border-black p-1 text-center">{renderArrayField('supervisorList', index, 'position', item.position || `Giám Sát ${index + 1}`)}</td>
                                    <td className="border border-black p-1">{renderArrayField('supervisorList', index, 'phone', item.phone)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <p className="italic text-xs mt-1">* Danh sách công nhân đính kèm/ Attach worker list</p>
            </div>

            {/* Table II: Air-con */}
            <div className="mb-2">
                <h3 className="font-bold italic mb-1">II. Đăng ký máy lạnh ngoài giờ/ Overtime working hour (using air-con) registration form:</h3>
                <table className="w-full border-collapse border border-black text-xs">
                    <thead>
                        <tr>
                            <th className="border border-black p-1 text-center w-24">Ngày/ Date</th>
                            <th className="border border-black p-1 text-center">Khu vực/ Area</th>
                            <th className="border border-black p-1 text-center w-40">Thời gian/ Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 2 }).map((_, index) => {
                            const item = (data.airconList && data.airconList[index]) || {};
                            return (
                                <tr key={index}>
                                    <td className="border border-black p-1 min-h-5">{renderArrayField('airconList', index, 'date', item.date)}</td>
                                    <td className="border border-black p-1">{renderArrayField('airconList', index, 'area', item.area)}</td>
                                    <td className="border border-black p-1">{renderArrayField('airconList', index, 'time', item.time)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default WorkingPermitPage1;
