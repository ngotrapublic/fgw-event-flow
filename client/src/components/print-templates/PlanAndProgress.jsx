import React from 'react';
import EditableField from './EditableField';

const PlanAndProgress = ({ data, onUpdate }) => {
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

    const renderField = (value, fieldName, placeholder = '', className = '') => {
        return (
            <EditableField
                value={value}
                onChange={(newValue) => onUpdate && onUpdate(fieldName, newValue)}
                placeholder={placeholder}
                className={className}
            />
        );
    };

    const handleArrayUpdate = (index, field, value) => {
        if (!onUpdate) return;
        // determine if we are updating existing Work Items or a separate progressList.
        // If we want consistency, we should probably update 'workItems'.
        const list = data.workItems ? [...data.workItems] : [];
        while (list.length <= index) {
            list.push({});
        }
        list[index] = { ...list[index], [field]: value };
        onUpdate('workItems', list);
    };

    const renderArrayField = (index, field, value) => {
        return (
            <EditableField
                value={value}
                onChange={(newValue) => handleArrayUpdate(index, field, newValue)}
            />
        );
    };

    const Header = () => (
        <div className="mb-2">
            <img src="/assets/forms/header-full-v3.jpg" alt="Header" className="w-full object-contain" />
        </div>
    );

    return (
        <div className="text-black leading-snug bg-white text-sm print-break-before" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
            <div className="max-w-[210mm] print:max-w-none mx-auto print:mx-0 px-8 print:px-0 pb-8 pt-0 relative">
                <Header />

                {/* Title */}
                <div className="flex justify-between items-start mb-4 border-b-2 border-transparent">
                    <div className="border border-black px-4 py-2 font-bold whitespace-nowrap h-fit">
                        MẪU / FORM: 08
                    </div>
                    <div className="text-center flex-1 px-2">
                        <h1 className="text-xl font-bold uppercase leading-tight">KẾ HOẠCH VÀ TIẾN ĐỘ THI CÔNG</h1>
                        <h2 className="text-lg font-bold italic">PLAN & CONSTRUCTION PROGRESS</h2>
                    </div>
                    <div className="w-20"></div>
                </div>

                {/* Recipient */}
                <div className="mb-4 font-bold">
                    Kính gửi: Văn phòng Ban Quản lý/ <span className="italic">To the Management Office</span>
                </div>

                {/* Form Fields */}
                <div className="space-y-1 mb-2">
                    <div className="flex items-baseline">
                        <span className="whitespace-nowrap pr-2">Tên Công Ty/ <span className="italic">Company name:</span></span>
                        <span className="flex-1 border-b border-dotted border-black font-bold uppercase px-2">
                            {renderField(data.tenantName || 'TRUNG TÂM LIÊN KẾT FPT GREENWICH', 'tenantName')}
                        </span>
                    </div>
                    <div className="flex items-baseline">
                        <span className="whitespace-nowrap pr-2">Khu vực thuê/ <span className="italic">Premises:</span></span>
                        <span className="flex-1 border-b border-dotted border-black font-bold uppercase px-2">
                            {renderField(data.unitNo || 'TẦNG 1, 2, 3 TTTM', 'unitNo')}
                        </span>
                    </div>
                    <div className="flex items-baseline">
                        <span className="whitespace-nowrap pr-2">Người đại diện/ <span className="italic">Representatives:</span></span>
                        <span className="flex-1 border-b border-dotted border-black px-2">{renderField(data.registrantName, 'registrantName')}</span>
                        <span className="whitespace-nowrap px-2">ĐTDĐ/ <span className="italic">Mobile No.:</span></span>
                        <span className="w-32 border-b border-dotted border-black px-2">{renderField(data.contactPhone, 'contactPhone')}</span>
                    </div>
                    <div className="flex items-baseline">
                        <span className="whitespace-nowrap pr-2">Tên nhà thầu/Công ty/ <span className="italic">Contractor's Name/Company:</span></span>
                        <span className="flex-1 border-b border-dotted border-black font-bold uppercase px-2">
                            {renderField(data.contractorName, 'contractorName', '', 'text-xs tracking-tight')}
                        </span>
                    </div>
                    <div className="flex items-baseline">
                        <span className="whitespace-nowrap pr-2">Điện thoại/ <span className="italic">Office Phone:</span></span>
                        <span className="flex-1 border-b border-dotted border-black px-2">{renderField(data.contractorPhone, 'contractorPhone')}</span>
                    </div>
                    <div className="flex items-baseline">
                        <span className="whitespace-nowrap pr-2">Tên người giám sát/ <span className="italic">Supervisor's name:</span></span>
                        <span className="flex-1 border-b border-dotted border-black px-2">{renderField(data.supervisorName, 'supervisorName')}</span>
                        <span className="whitespace-nowrap px-2">ĐTDĐ/ <span className="italic">Mobile No.:</span></span>
                        <span className="w-32 border-b border-dotted border-black px-2">{renderField(data.supervisorPhone, 'supervisorPhone')}</span>
                    </div>
                    <div className="flex items-baseline">
                        <span className="whitespace-nowrap pr-1">Ngày khởi công / <span className="italic">Commence date:</span> từ/from</span>
                        <span className="w-24 border-b border-dotted border-black text-center px-1">{renderField(formatDate(data.constructionTimeStart || data.eventDate), 'constructionTimeStart')}</span>
                        <span className="whitespace-nowrap px-1">đến/to</span>
                        <span className="w-24 border-b border-dotted border-black text-center px-1">{renderField(formatDate(data.constructionTimeEnd || data.eventDate), 'constructionTimeEnd')}</span>
                    </div>
                    <div className="flex items-baseline">
                        <span className="whitespace-nowrap pr-2">Mô tả chi tiết cụ thể / <span className="italic">Description of details:</span></span>
                        <span className="flex-1 border-b border-dotted border-black px-2">{renderField(data.description, 'description')}</span>
                    </div>
                </div>

                {/* Table */}
                <div className="mb-4">
                    <table className="w-full border-collapse border border-black">
                        <thead>
                            <tr>
                                <th rowSpan="2" className="border border-black p-1 text-center w-10 align-middle">
                                    STT<br />No.
                                </th>
                                <th rowSpan="2" className="border border-black p-1 text-center align-middle">
                                    Hạng Mục Công Việc<br />Work Items
                                </th>
                                <th colSpan="2" className="border border-black p-1 text-center">
                                    Thời Gian Thi Công ( Dự Kiến )<br />Construction Progress
                                </th>
                                <th rowSpan="2" className="border border-black p-1 text-center w-24 align-middle">
                                    Ghi Chú<br />Note
                                </th>
                            </tr>
                            <tr>
                                <th className="border border-black p-1 text-center w-20">
                                    Bắt đầu<br />Start Time
                                </th>
                                <th className="border border-black p-1 text-center w-20">
                                    Kết Thúc<br />Finish
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Render rows from data.workItems if available, otherwise 5 empty rows */}
                            {/* Render rows from data.workItems if available, padding with empty rows to reach minimum count */}
                            {(() => {
                                const minRows = 5;
                                const items = data.workItems && data.workItems.length > 0 ? data.workItems : [];
                                const rowsToRender = [...items];
                                while (rowsToRender.length < minRows) {
                                    rowsToRender.push({});
                                }
                                return rowsToRender.map((item, index) => {
                                    const workItem = item || {};
                                    return (
                                        <tr key={index}>
                                            <td className="border border-black p-1 text-center h-8 text-middle">
                                                {index + 1}
                                            </td>
                                            <td className="border border-black p-1">
                                                <EditableField
                                                    value={workItem.category || ''}
                                                    onChange={(val) => handleArrayUpdate(index, 'category', val)}
                                                />
                                            </td>
                                            <td className="border border-black p-1 text-center">
                                                <EditableField
                                                    value={formatDate(workItem.startDate)}
                                                    onChange={(val) => handleArrayUpdate(index, 'startDate', val)}
                                                />
                                            </td>
                                            <td className="border border-black p-1 text-center">
                                                <EditableField
                                                    value={formatDate(workItem.endDate)}
                                                    onChange={(val) => handleArrayUpdate(index, 'endDate', val)}
                                                />
                                            </td>
                                            <td className="border border-black p-1">
                                                <EditableField
                                                    value={workItem.notes || ''}
                                                    onChange={(val) => handleArrayUpdate(index, 'notes', val)}
                                                />
                                            </td>
                                        </tr>
                                    );
                                });
                            })()}
                        </tbody>
                    </table>
                </div>

                {/* Signatures */}
                <div className="flex justify-between text-center">
                    <div className="w-1/3">
                        <h4 className="font-bold">Nhà thầu</h4>
                        <p className="italic text-xs mb-1">Contractor</p>
                        <p className="italic text-xs">(Ký tên và đóng dấu/</p>
                        <p className="italic text-xs">Signature & Stamp)</p>
                        <div className="h-16"></div>
                        <div className="text-xs">
                            <span>Ngày / Date: </span>
                            <EditableField
                                isInline={true}
                                value={data.signDateContractor || `${day}/${month}/${year}`}
                                onChange={(val) => onUpdate('signDateContractor', val)}
                                className="text-center min-w-[60px]"
                            />
                        </div>
                    </div>
                    <div className="w-1/3">
                        <h4 className="font-bold">Xác nhận của Khách thuê</h4>
                        <p className="italic text-xs mb-1">Confirmed by Tenant</p>
                        <p className="italic text-xs">(Ký tên và đóng dấu/</p>
                        <p className="italic text-xs">Signature & Stamp)</p>
                        <div className="h-16"></div>
                        <div className="text-xs">
                            <span>Ngày / Date: </span>
                            <EditableField
                                isInline={true}
                                value={data.signDateTenant || `${day}/${month}/${year}`}
                                onChange={(val) => onUpdate('signDateTenant', val)}
                                className="text-center min-w-[60px]"
                            />
                        </div>
                    </div>
                    <div className="w-1/3">
                        <h4 className="font-bold">Ban Quản lý</h4>
                        <p className="italic text-xs mb-1">Management Office</p>
                        <p className="italic text-xs">(Ký tên và đóng dấu/</p>
                        <p className="italic text-xs">Signature & Stamp)</p>
                        <div className="h-16"></div>
                        <div className="text-xs">
                            <span>Ngày / Date: </span>
                            <EditableField
                                isInline={true}
                                value={data.signDateManagement || `${day}/${month}/${year}`}
                                onChange={(val) => onUpdate('signDateManagement', val)}
                                className="text-center min-w-[60px]"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlanAndProgress;
