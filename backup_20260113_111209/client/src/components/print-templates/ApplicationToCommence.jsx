import React from 'react';
import EditableField from './EditableField';

const ApplicationToCommence = ({ data, onUpdate }) => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();

    const renderField = (value, fieldName, placeholder = '') => {
        return (
            <EditableField
                value={value}
                onChange={(newValue) => onUpdate && onUpdate(fieldName, newValue)}
                placeholder={placeholder}
            />
        );
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleDateString('en-GB');
    };

    const handleArrayUpdate = (index, field, value) => {
        if (!onUpdate) return;
        const list = data.workItems ? [...data.workItems] : [];
        // Ensure list is long enough
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

    return (
        <div className="text-black leading-snug max-w-[210mm] print:max-w-none mx-auto print:mx-0 px-8 print:px-0 pb-8 pt-0 bg-white text-sm print-break-before" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
            {/* Header Image */}
            <div className="mb-2">
                <img src="/assets/forms/header-full-v3.jpg" alt="Header" className="w-full object-contain" />
            </div>

            {/* Title */}
            <div className="flex justify-between items-start mb-6 border-b-2 border-transparent">
                <div className="border border-black px-4 py-2 font-bold whitespace-nowrap h-fit">
                    MẪU / FORM: 03
                </div>
                <div className="text-center flex-1 px-2">
                    <h1 className="text-lg font-bold uppercase leading-tight whitespace-nowrap">PHIẾU ĐĂNG KÝ BẮT ĐẦU THI CÔNG</h1>
                    <h2 className="text-sm font-bold italic whitespace-nowrap">APPLICATION TO COMMENCE FIT-OUT WORKS</h2>
                </div>
                <div className="w-32"></div> {/* Spacer for balance */}
            </div>

            {/* Recipient */}
            <div className="mb-4 font-bold">
                Kính gửi: Văn phòng Ban Quản lý/ <span className="italic">To the Management Office</span>
            </div>

            {/* Form Fields */}
            <div className="space-y-2">
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
                    <span className="whitespace-nowrap pr-2">Người liên hệ/ <span className="italic">Person in-charge:</span></span>
                    <span className="flex-1 border-b border-dotted border-black font-bold px-2">{renderField(data.registrantName, 'registrantName')}</span>
                </div>

                <div className="flex items-baseline">
                    <span className="whitespace-nowrap pr-2">Số điện thoại/ <span className="italic">Telephone no.:</span></span>
                    <span className="flex-1 border-b border-dotted border-black px-2">{renderField(data.contactPhone, 'contactPhone')}</span>
                </div>
            </div>

            {/* Intro Text */}
            <div className="mt-6 mb-3">
                <p>Chúng tôi muốn thông báo đến Ban Quản lý Tòa nhà về khoản thời gian bắt đầu thi công của chúng tôi như sau:</p>
                <p className="italic">We would like to inform you about our Executing period of Fit-out work as below:</p>
            </div>

            {/* Table */}
            <div className="mt-2">
                <table className="w-full border-collapse border border-black text-xs">
                    <thead>
                        <tr>
                            <th className="border border-black p-2 text-center w-12 align-middle">STT<br /><span className="italic font-normal">No.</span></th>
                            <th className="border border-black p-2 text-center align-middle">Tên nhà thầu/ Nhà thiết kế/ Công nhân thực hiện<br /><span className="italic font-normal">Contractors'/Designers' Names/ Workman's name</span></th>
                            <th className="border border-black p-2 text-center w-32 align-middle">Thời gian bắt đầu<br /><span className="italic font-normal">Date of commencing</span></th>
                            <th className="border border-black p-2 text-center w-32 align-middle">Thời gian kết thúc<br /><span className="italic font-normal">Expected date of completing</span></th>
                            <th className="border border-black p-2 text-center w-24 align-middle">Ghi chú<br /><span className="italic font-normal">Remarks</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {(() => {
                            const minRows = 5;
                            const totalRows = Math.max(minRows, 1);
                            return Array.from({ length: totalRows }).map((_, index) => {
                                const isFirstRow = index === 0;
                                // Use contractorName with fallback to Nested object if flattened failed
                                const rowName = isFirstRow ? (data.contractorName || (data.contractor && data.contractor.name) || '') : '';
                                const rowStart = isFirstRow ? formatDate(data.constructionStartDate) : '';
                                const rowEnd = isFirstRow ? formatDate(data.constructionEndDate) : '';
                                // Use constructionContent (Scope of work) or notes for Remarks if available
                                const rowNote = isFirstRow ? (data.constructionContent || data.notes || '') : '';

                                return (
                                    <tr key={index}>
                                        <td className="border border-black p-2 text-center h-8">{index + 1}</td>
                                        <td className="border border-black p-2">
                                            <EditableField
                                                value={rowName}
                                                onChange={(val) => {
                                                    if (isFirstRow && onUpdate) onUpdate('contractorName', val);
                                                }}
                                            />
                                        </td>
                                        <td className="border border-black p-2 text-center">
                                            <EditableField
                                                value={rowStart}
                                                onChange={(val) => { }}
                                            />
                                        </td>
                                        <td className="border border-black p-2 text-center">
                                            <EditableField
                                                value={rowEnd}
                                                onChange={(val) => { }}
                                            />
                                        </td>
                                        <td className="border border-black p-2">
                                            <EditableField
                                                value={rowNote}
                                                onChange={(val) => {
                                                    if (isFirstRow && onUpdate) onUpdate('constructionContent', val);
                                                }}
                                            />
                                        </td>
                                    </tr>
                                );
                            });
                        })()}
                    </tbody>
                </table>
            </div>

            {/* Indemnity Clause */}
            <div className="mt-2 text-justify text-xs">
                <p className="mb-1">
                    Chúng tôi xin cam kết và đảm bảo bồi hoàn đầy đủ các khoản thiệt hại, mất mát cũng như nghĩa vụ pháp lý (nếu có) mà nguyên nhân là do nhà thầu, những người làm cho nhà thầu hay các đại lý của nhà thầu vi phạm các điều khoản các yêu cầu có trong bản nội quy, cũng như bất cứ công việc gì được đảm trách bởi nhà thầu trong khu vực thuê
                </p>
                <p className="italic">
                    We hereby agree and undertake to keep you fully indemnified in respect of all claims, looses, liabilities or damages made against, suffered or incurred by you as a result of a breach by the contractor, its employees or agents, of any of the term and conditions, requirements and <span className="font-bold">the rules</span> mentioned in the brief or as a result of any of the works undertaken by the contractor for the said premises.
                </p>
            </div>

            {/* Signature */}
            <div className="mt-8 flex justify-end">
                <div className="text-center font-serif">
                    <div className="italic mb-2 text-center whitespace-nowrap">
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

export default ApplicationToCommence;
