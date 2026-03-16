import React from 'react';
import EditableField from './EditableField';

const FitOutCompletionInspection = ({ data, onUpdate }) => {
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

    const Header = () => (
        <div className="mb-2">
            <img src="/assets/forms/header-full-v3.jpg" alt="Header" className="w-full object-contain" />
        </div>
    );

    return (
        <div className="text-black leading-snug bg-white text-sm print-break-before" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
            {/* Page 1 */}
            <div className="max-w-[210mm] print:max-w-none mx-auto print:mx-0 px-8 print:px-0 pb-8 pt-0 relative">
                <Header />

                {/* Title */}
                <div className="flex justify-between items-start mb-2 border-b-2 border-transparent">
                    <div className="border border-black px-4 py-2 font-bold whitespace-nowrap h-fit">
                        MẪU / FORM: 12
                    </div>
                    <div className="text-center flex-1 px-2">
                        <h1 className="text-lg font-bold uppercase leading-tight">BIÊN BẢN NGHIỆM THU</h1>
                        <h2 className="text-sm font-bold italic">FIT-OUT COMPLETION INSPECTION</h2>
                    </div>
                    <div className="w-20"></div>
                </div>

                {/* Recipient */}
                <div className="mb-2 font-bold">
                    Kính gửi: Văn phòng Ban Quản lý/ <span className="italic">To the Management Office</span>
                </div>

                {/* Form Fields */}
                <div className="space-y-1 mb-4">
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
                        <span className="flex-1 border-b border-dotted border-black px-2 font-bold">{renderField(data.registrantName, 'registrantName')}</span>
                        <span className="whitespace-nowrap px-2">ĐTDĐ/ <span className="italic">Mobile No.:</span></span>
                        <span className="w-40 border-b border-dotted border-black px-2 font-bold">{renderField(data.contactPhone, 'contactPhone')}</span>
                    </div>
                    <div className="flex items-baseline">
                        <span className="whitespace-nowrap pr-2">Tên nhà thầu/Công ty/ <span className="italic">Contractor's Name/Company:</span></span>
                        <span className="flex-1 border-b border-dotted border-black px-2 font-bold">{renderField(data.contractorName, 'contractorName')}</span>
                    </div>
                    <div className="flex items-baseline">
                        <span className="whitespace-nowrap pr-2">Người đại diện/ <span className="italic">Representatives:</span></span>
                        <span className="flex-1 border-b border-dotted border-black px-2 font-bold">{renderField(data.contractorRepName, 'contractorRepName')}</span>
                        <span className="whitespace-nowrap px-2">ĐTDĐ/ <span className="italic">Mobile No.:</span></span>
                        <span className="w-40 border-b border-dotted border-black px-2 font-bold">{renderField(data.contractorRepPhone, 'contractorRepPhone')}</span>
                    </div>
                    <div className="flex items-baseline">
                        <span className="whitespace-nowrap pr-2">Tên người giám sát/ <span className="italic">Supervisor's name:</span></span>
                        <span className="flex-1 border-b border-dotted border-black px-2 font-bold">{renderField(data.supervisorName, 'supervisorName')}</span>
                        <span className="whitespace-nowrap px-2">ĐTDĐ/ <span className="italic">Mobile No.:</span></span>
                        <span className="w-40 border-b border-dotted border-black px-2 font-bold">{renderField(data.supervisorPhone, 'supervisorPhone')}</span>
                    </div>
                    <div className="flex items-baseline">
                        <span className="whitespace-nowrap pr-2">Giờ nghiệm thu/ <span className="italic">Inspection time:</span></span>
                        <span className="flex-1 border-b border-dotted border-black px-2 font-bold">{renderField(data.inspectionTime, 'inspectionTime')}</span>
                    </div>
                </div>

                {/* Content Section */}
                <div className="mb-2">
                    <div className="font-bold uppercase mb-1">NỘI DUNG NGHIỆM THU/ <span className="italic">CONTENT</span></div>
                    <p className="text-justify mb-2">
                        Sau khi kiểm tra, đối chiếu hồ sơ trang trí nội thất đã được phê duyệt bởi Ban Quản lý, thực trạng các hạng mục đã thi công, các bên kiểm tra cùng thống nhất như sau/ <span className="italic">After checking and inspecting the following conclusion has been agreed between parties:</span>
                    </p>

                    <div className="mb-2">
                        <div className="font-bold mb-1">Việc thi công trang trí nội thất đúng theo bản vẽ đã duyệt/ <span className="italic font-normal">The decoration follows the approved design:</span></div>
                        <div className="flex gap-8 pl-4">
                            <div className="flex items-center">
                                <span>Có/ <span className="italic">Yes</span></span>
                                <div className="w-4 h-4 border border-black ml-2"></div>
                            </div>
                            <div className="flex items-center">
                                <span>Không/ <span className="italic">No</span></span>
                                <div className="w-4 h-4 border border-black ml-2"></div>
                            </div>
                        </div>
                    </div>

                    <div className="mb-2">
                        <div className="font-bold mb-1">Phần thi công ngoài nội dung bản vẽ/ <span className="italic font-normal">The works are not in the approved design:</span></div>
                        <div className="space-y-1">
                            <div className="border-b border-dotted border-black px-2 h-6">{renderField(data.extraWork1, 'extraWork1')}</div>
                            <div className="border-b border-dotted border-black px-2 h-6">{renderField(data.extraWork2, 'extraWork2')}</div>
                            <div className="border-b border-dotted border-black px-2 h-6">{renderField(data.extraWork3, 'extraWork3')}</div>
                        </div>
                    </div>

                    <div className="mb-2">
                        <div className="font-bold mb-1">Phần vi phạm các quy định về thi công trang trí nội thất/ <span className="italic font-normal">The work violates the fit out guide:</span></div>
                        <div className="space-y-1">
                            <div className="border-b border-dotted border-black px-2 h-6">{renderField(data.violation1, 'violation1')}</div>
                            <div className="border-b border-dotted border-black px-2 h-6">{renderField(data.violation2, 'violation2')}</div>
                            <div className="border-b border-dotted border-black px-2 h-6">{renderField(data.violation3, 'violation3')}</div>
                        </div>
                    </div>

                    <div className="mb-2">
                        <div className="font-bold mb-1">Ý kiến Khách thuê/ <span className="italic font-normal">Tenant's opinion:</span></div>
                        <div className="space-y-1">
                            <div className="border-b border-dotted border-black px-2 h-6">{renderField(data.tenantOpinion1, 'tenantOpinion1')}</div>
                            <div className="border-b border-dotted border-black px-2 h-6">{renderField(data.tenantOpinion2, 'tenantOpinion2')}</div>
                            <div className="border-b border-dotted border-black px-2 h-6">{renderField(data.tenantOpinion3, 'tenantOpinion3')}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Page Break */}
            <div className="print:break-before-page"></div>

            {/* Page 2 */}
            <div className="max-w-[210mm] print:max-w-none mx-auto print:mx-0 px-8 print:px-0 pb-8 pt-8 relative">
                <Header />

                <div className="mb-8">
                    <div className="font-bold mb-2">Ý kiến của giám sát của Công ty Quản lý/ <span className="italic font-normal">Management Office's Supervisor opinions:</span></div>
                    <div className="space-y-2">
                        <div className="border-b border-dotted border-black px-2 h-6">{renderField(data.supervisorOpinion1, 'supervisorOpinion1')}</div>
                        <div className="border-b border-dotted border-black px-2 h-6">{renderField(data.supervisorOpinion2, 'supervisorOpinion2')}</div>
                        <div className="border-b border-dotted border-black px-2 h-6">{renderField(data.supervisorOpinion3, 'supervisorOpinion3')}</div>
                        <div className="border-b border-dotted border-black px-2 h-6">{renderField(data.supervisorOpinion4, 'supervisorOpinion4')}</div>
                    </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-y-16 gap-x-8 text-center">
                    {/* Row 1 */}
                    <div className="flex flex-col h-full justify-between">
                        <div>
                            <h4 className="font-bold">Đại diện Nhà thầu/ <span className="italic">Contractor's Rep</span></h4>
                            <p className="italic text-xs">(Ký tên / Signature)</p>
                        </div>
                        <div className="mt-24 flex items-end justify-center">
                            <span>Ngày/Date: </span>
                            <span className="border-b border-black min-w-[80px] mx-1">
                                <EditableField
                                    isInline={true}
                                    value={data.signDateContractor || `${day}/${month}/${year}`}
                                    onChange={(val) => onUpdate('signDateContractor', val)}
                                    className="text-center w-full"
                                />
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col h-full justify-between">
                        <div>
                            <h4 className="font-bold">Người nghiệm thu/ <span className="italic">Inspector</span></h4>
                            <p className="italic text-xs">(Ký tên / Signature)</p>
                        </div>
                        <div className="mt-24 flex items-end justify-center">
                            <span>Ngày/Date: </span>
                            <span className="border-b border-black min-w-[80px] mx-1">
                                <EditableField
                                    isInline={true}
                                    value={data.signDateInspector || `${day}/${month}/${year}`}
                                    onChange={(val) => onUpdate('signDateInspector', val)}
                                    className="text-center w-full"
                                />
                            </span>
                        </div>
                    </div>

                    {/* Row 2 */}
                    <div className="flex flex-col h-full justify-between">
                        <div>
                            <h4 className="font-bold">Xác nhận của Khách thuê/ <span className="italic">Confirmed by Tenant</span></h4>
                            <p className="italic text-xs">(Ký tên và đóng dấu / Signature & Stamp)</p>
                        </div>
                        <div className="mt-24 flex items-end justify-center">
                            <span>Ngày/Date: </span>
                            <span className="border-b border-black min-w-[80px] mx-1">
                                <EditableField
                                    isInline={true}
                                    value={data.signDateTenant || `${day}/${month}/${year}`}
                                    onChange={(val) => onUpdate('signDateTenant', val)}
                                    className="text-center w-full"
                                />
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col h-full justify-between">
                        <div>
                            <h4 className="font-bold">Ban Quản lý/ <span className="italic">Management Office</span></h4>
                            <p className="italic text-xs">(Ký tên và đóng dấu / Signature & Stamp)</p>
                        </div>
                        <div className="mt-24 flex items-end justify-center">
                            <span>Ngày/Date: </span>
                            <span className="border-b border-black min-w-[80px] mx-1">
                                <EditableField
                                    isInline={true}
                                    value={data.signDateManagement || `${day}/${month}/${year}`}
                                    onChange={(val) => onUpdate('signDateManagement', val)}
                                    className="text-center w-full"
                                />
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FitOutCompletionInspection;
