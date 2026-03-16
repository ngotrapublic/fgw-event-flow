import React from 'react';
import EditableField from './EditableField';

const SpecialWorkPermit = ({ data, onUpdate }) => {
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
        const list = data.workList ? [...data.workList] : [];
        // Ensure list is long enough
        while (list.length <= index) {
            list.push({});
        }
        list[index] = { ...list[index], [field]: value };
        onUpdate('workList', list);
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

            {/* ================= PAGE 1 ================= */}
            <div className="max-w-[210mm] print:max-w-none mx-auto print:mx-0 px-8 print:px-0 pb-0 pt-0 relative">
                <Header />

                {/* Title */}
                <div className="flex justify-between items-start mb-1 border-b-2 border-transparent">
                    <div className="border border-black px-4 py-2 font-bold whitespace-nowrap h-fit">
                        MẪU / FORM: 06
                    </div>
                    <div className="text-center flex-1 px-2">
                        <h1 className="text-lg font-bold uppercase leading-tight whitespace-nowrap">ĐĂNG KÝ THI CÔNG ĐẶC BIỆT</h1>
                        <h2 className="text-sm font-bold italic whitespace-nowrap">SPECIAL WORK APPLICATION FORM</h2>
                    </div>
                    <div className="w-32"></div>
                </div>

                {/* Note Box */}
                <div className="border border-black p-1 text-center mb-1 italic font-bold text-xs">
                    <p>Để phục vụ tốt hơn, việc đăng ký cần thực hiện trước khi thi công ít nhất 03 ngày làm việc.</p>
                    <p>Application should be made at least 3 working days prior to the commencement of work</p>
                </div>

                {/* Recipient */}
                <div className="mb-1 font-bold">
                    Kính gửi: Văn phòng Ban Quản lý/ <span className="italic">To the Management Office</span>
                </div>

                {/* Form Fields */}
                <div className="space-y-0 mb-2">
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

                    {/* Special Time Field */}
                    <div className="flex items-baseline mt-1 font-bold">
                        <span className="whitespace-nowrap pr-1">Thời gian thi công: Ngày/ <span className="italic font-normal">Working time: Date</span></span>
                        <span className="w-24 border-b border-black text-center px-1 font-normal">{renderField(formatDate(data.constructionTimeStart || data.eventDate), 'constructionTimeStart')}</span>
                        <span className="whitespace-nowrap px-1">Từ (giờ)/ <span className="italic font-normal">From (time)</span></span>
                        <span className="w-20 border-b border-black text-center px-1 font-normal">{renderField(data.constructionTimeStartHour, 'constructionTimeStartHour', '', 'text-center')}</span>
                        <span className="whitespace-nowrap px-1">đến (giờ)/ <span className="italic font-normal">to (time)</span></span>
                        <span className="flex-1 border-b border-black text-center px-1 font-normal">{renderField(data.constructionTimeEndHour, 'constructionTimeEndHour', '', 'text-center')}</span>
                    </div>
                </div>

                {/* Table */}
                <div className="mb-2">
                    <table className="w-full border-collapse border border-black text-xs">
                        <thead>
                            <tr>
                                <th className="border border-black p-1 text-center w-10">STT<br /><span className="italic font-normal">No.</span></th>
                                <th className="border border-black p-1 text-center">Tóm tắt chi tiết công việc<br /><span className="italic font-normal">Description of working plan</span></th>
                                <th className="border border-black p-1 text-center w-24">Số lượng<br /><span className="italic font-normal">Amount</span></th>
                                <th className="border border-black p-1 text-center w-32">Ghi chú<br /><span className="italic font-normal">Note</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: 4 }).map((_, index) => {
                                const item = (data.workList && data.workList[index]) || {};
                                return (
                                    <tr key={index}>
                                        <td className="border border-black p-1 text-center h-8">{index + 1}</td>
                                        <td className="border border-black p-1">{renderArrayField(index, 'description', item.description)}</td>
                                        <td className="border border-black p-1 text-center">{renderArrayField(index, 'amount', item.amount)}</td>
                                        <td className="border border-black p-1">{renderArrayField(index, 'note', item.note)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Attachments */}
                <div className="mb-2 text-xs flex">
                    <div className="font-bold mr-4">Đính kèm/Attachment:</div>
                    <div className="space-y-1">
                        <div className="flex items-center">
                            <div className="w-4 h-4 border border-black mr-2"></div>
                            <span>Danh sách công nhân/ <span className="italic">List of workers</span></span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-4 h-4 border border-black mr-2"></div>
                            <span>Danh sách công việc/ <span className="italic">List of works</span></span>
                        </div>
                    </div>
                </div>

                {/* Terms Page 1 */}
                <div className="text-xs text-justify">
                    <h3 className="font-bold underline mb-1">Quy Định/ Terms:</h3>
                    <ul className="list-disc pl-4 space-y-1">
                        <li>
                            Khách thuê ký xác nhận và sẽ làm hoàn thiện lại hiện trạng ban đầu khi trả mặt bằng.<br />
                            <span className="italic">Tenants agree that return premises as original and as handover.</span>
                        </li>
                        <li>
                            Đăng Ký Thi Công Đặc Biệt phải được Ban Quản lý Tòa nhà duyệt ít nhất 24 giờ trước khi thi công.<br />
                            <span className="italic">Special Work Application Form should be approved by management office in 24 hours advance.</span>
                        </li>
                        <li>
                            Đơn vị thi công phải cung cấp bản vẽ đầy đủ (khi có yêu cầu của Tòa nhà).<br />
                            <span className="italic">Contractor should provide drawing (if management requested).</span>
                        </li>
                        <li>
                            Đơn vị thi công chịu trách nhiệm hoàn toàn về an toàn lao động, an toàn cháy nổ v.v.v...<br />
                            <span className="italic">Contractor fully responsible work safety, fire, exploration and in the like.</span>
                        </li>
                    </ul>
                </div>
            </div>

            {/* ================= PAGE 2 ================= */}
            <div className="max-w-[210mm] print:max-w-none mx-auto print:mx-0 px-8 print:px-0 pb-4 pt-4 relative print:break-before-page" style={{ pageBreakBefore: 'always' }}>
                <Header />

                {/* Terms Page 2 */}
                <div className="text-xs text-justify mb-4">
                    <ul className="list-disc pl-4 space-y-1">
                        <li>
                            Trong quá trình thi công trên cao hoặc nguy hiểm thì phải có giám sát liên tục.<br />
                            <span className="italic">Permenatly supervision for working at hight place.</span>
                        </li>
                        <li>
                            Nhân viên Tòa nhà kiểm tra và lập biên bản ngừng công việc khi đơn vị thi công không tuân thủ theo quy định của Tòa nhà.<br />
                            <span className="italic">Building staff have right to terminate fit-out work when contrator violate building rules & regulations.</span>
                        </li>
                        <li>
                            Giấy đăng ký thi công đặc biệt này làm thành 02 bản (đơn vị thi công giữ 01 bản và Văn phòng Quản lý giữ 01 bản).<br />
                            <span className="italic">Special Work Application Form develop into 2 copies (01 for Contractor, 01 for Management Office).</span>
                        </li>
                    </ul>
                </div>

                {/* Signatures */}
                <div className="mt-8 flex justify-between text-center">
                    <div className="w-1/3">
                        <h4 className="font-bold">Nhà thầu</h4>
                        <p className="italic text-xs mb-1">Contractor</p>
                        <p className="italic text-xs">(Ký tên và đóng dấu/</p>
                        <p className="italic text-xs">Signature & Stamp)</p>
                        <div className="h-24"></div>
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
                        <div className="h-24"></div>
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
                        <div className="h-24"></div>
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

export default SpecialWorkPermit;
