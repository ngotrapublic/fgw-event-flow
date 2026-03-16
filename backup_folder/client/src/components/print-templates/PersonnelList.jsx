import React from 'react';
import EditableField from './EditableField';

const PersonnelList = ({ data, onUpdate }) => {
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

    const handleArrayUpdate = (index, field, value) => {
        if (!onUpdate) return;
        const list = data.constructionPersonnel ? [...data.constructionPersonnel] : [];
        while (list.length <= index) {
            list.push({});
        }
        list[index] = { ...list[index], [field]: value };
        onUpdate('constructionPersonnel', list);
    };

    const renderField = (value, fieldName, placeholder = '', className = '') => (
        <EditableField
            value={value}
            onChange={(newValue) => onUpdate && onUpdate(fieldName, newValue)}
            placeholder={placeholder}
            className={className}
        />
    );

    const renderArrayField = (index, field, value) => (
        <EditableField
            value={value}
            onChange={(newValue) => handleArrayUpdate(index, field, newValue)}
        />
    );

    // Pagination Logic
    const personnel = data.constructionPersonnel || [];
    const PAGE_1_MAX = 12;
    const SUBSEQUENT_PAGE_MAX = 22;

    const pages = [];
    if (personnel.length <= PAGE_1_MAX) {
        // Single page
        pages.push(personnel);
    } else {
        // Multi page
        pages.push(personnel.slice(0, PAGE_1_MAX));
        let remaining = personnel.slice(PAGE_1_MAX);
        while (remaining.length > 0) {
            pages.push(remaining.slice(0, SUBSEQUENT_PAGE_MAX));
            remaining = remaining.slice(SUBSEQUENT_PAGE_MAX);
        }
    }

    const Header = () => (
        <div className="mb-2">
            <img src="/assets/forms/header-full-v3.jpg" alt="Header" className="w-full object-contain" />
        </div>
    );

    return (
        <div className="text-black leading-snug max-w-[210mm] print:max-w-none mx-auto print:mx-0 px-8 print:px-0 bg-white text-sm" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
            {pages.map((pageData, pageIndex) => (
                <div key={pageIndex} className={`print-break-before ${pageIndex > 0 ? 'pt-8' : 'pt-0'}`}>
                    <Header />

                    {/* Title & Info - Only on Page 1 */}
                    {pageIndex === 0 && (
                        <>
                            <div className="flex justify-between items-start mb-2 border-b-2 border-transparent">
                                <div className="border border-black px-4 py-2 font-bold whitespace-nowrap h-fit">
                                    MẪU / FORM: 04
                                </div>
                                <div className="text-center flex-1 px-2">
                                    <h1 className="text-lg font-bold uppercase leading-tight whitespace-nowrap">ĐĂNG KÝ DANH SÁCH CÔNG NHÂN THI CÔNG</h1>
                                    <h2 className="text-sm font-bold italic whitespace-nowrap">REGISTRATION FOR FITTING-OUT WORKERS</h2>
                                </div>
                                <div className="w-32"></div>
                            </div>

                            <div className="mb-2 font-bold">
                                Kính gửi: Văn phòng Ban Quản lý/ <span className="italic">To the Management Office</span>
                            </div>

                            <div className="space-y-1 mb-2">
                                <div className="flex items-baseline">
                                    <span className="whitespace-nowrap pr-2">Khách thuê/ <span className="italic">Company name:</span></span>
                                    <span className="flex-1 border-b border-dotted border-black font-bold uppercase px-2">
                                        {renderField(data.tenantName || 'TRUNG TÂM LIÊN KẾT FPT GREENWICH', 'tenantName')}
                                    </span>
                                </div>
                                <div className="flex items-baseline">
                                    <span className="whitespace-nowrap pr-2">Khu vực thuê/ <span className="italic">Unit no.:</span></span>
                                    <span className="flex-1 border-b border-dotted border-black font-bold uppercase px-2">
                                        {renderField(data.unitNo || 'TẦNG 1, 2, 3 TTTM', 'unitNo')}
                                    </span>
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
                                        {renderField(data.contractorName, 'contractorName', '', 'text-[13px] tracking-tight')}
                                    </span>
                                </div>
                                <div className="flex items-baseline">
                                    <span className="whitespace-nowrap pr-2">Người đại diện/ <span className="italic">Representatives:</span></span>
                                    <span className="flex-1 border-b border-dotted border-black px-2">{renderField(data.registrantName, 'registrantName')}</span>
                                    <span className="whitespace-nowrap px-2">Di động/ <span className="italic">Mobile No.:</span></span>
                                    <span className="w-32 border-b border-dotted border-black px-2">{renderField(data.contactPhone, 'contactPhone')}</span>
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

                            <div className="mt-2 mb-1">
                                <p>Danh sách công nhân thi công/ <span className="italic">List of fitting-out workers:</span></p>
                            </div>
                        </>
                    )}

                    <table className="w-full border-collapse border border-black text-xs">
                        <thead>
                            <tr>
                                <th className="border border-black p-1 text-center w-10 align-middle">STT<br /><span className="italic font-normal">No.</span></th>
                                <th className="border border-black p-1 text-center align-middle">Họ và Tên<br /><span className="italic font-normal">Full Name</span></th>
                                <th className="border border-black p-1 text-center w-24 align-middle">Di Động<br /><span className="italic font-normal">Mobile No</span></th>
                                <th className="border border-black p-1 text-center w-24 align-middle">Số CCCD/CMND<br /><span className="italic font-normal">ID No.</span></th>
                                <th className="border border-black p-1 text-center w-20 align-middle">Số Thẻ<br /><span className="italic font-normal">Number card</span></th>
                                <th className="border border-black p-1 text-center w-20 align-middle">Ghi chú<br /><span className="italic font-normal">Notes</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {(pageIndex === 0 ? Array.from({ length: PAGE_1_MAX }) : pageData).map((_, rowIndex) => {
                                const realIndex = pageIndex === 0 ? rowIndex : PAGE_1_MAX + (pageIndex - 1) * SUBSEQUENT_PAGE_MAX + rowIndex;
                                const person = pageData[rowIndex] || {};

                                return (
                                    <tr key={rowIndex}>
                                        <td className="border border-black p-1 text-center h-7">{realIndex + 1}</td>
                                        <td className="border border-black p-1">{renderArrayField(realIndex, 'name', person.name)}</td>
                                        <td className="border border-black p-1 text-center">{renderArrayField(realIndex, 'phone', person.phone)}</td>
                                        <td className="border border-black p-1 text-center">{renderArrayField(realIndex, 'idCard', person.idCard)}</td>
                                        <td className="border border-black p-1"></td>
                                        <td className="border border-black p-1"></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Footer - Only on Last Page */}
                    {pageIndex === pages.length - 1 && (
                        <>
                            <div className="mt-2 text-justify text-xs">
                                <p className="italic">
                                    Chúng tôi cam kết danh sách trên là trung thực khi có thay đổi chúng tôi sẽ cập nhập lại đầy đủ./ Understand the above to be true and correct at this time and we will update this list and names when any changes are made for the purposes of maintaining a secure and well managed building.
                                </p>
                            </div>

                            <div className="mt-4 flex justify-between text-center">
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
                        </>
                    )}
                </div>
            ))}
        </div>
    );
};

export default PersonnelList;
