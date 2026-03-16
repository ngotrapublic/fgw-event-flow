import React from 'react';
import EditableField from './EditableField';

const FitOutDepositRefund = ({ data, onUpdate }) => {
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
            <div className="max-w-[210mm] print:max-w-none mx-auto print:mx-0 px-8 print:px-0 pb-8 pt-0 relative">
                <Header />

                {/* Title */}
                {/* Form Number */}
                <div className="mb-2">
                    <div className="border border-black px-4 py-1 font-bold whitespace-nowrap inline-block">
                        MẪU / FORM: 13
                    </div>
                </div>

                {/* Title */}
                <div className="text-center mb-6">
                    <h1 className="text-lg font-bold uppercase leading-tight whitespace-nowrap">PHIẾU ĐỀ NGHỊ HOÀN TIỀN KÝ QUỸ TRANG TRÍ NỘI THẤT</h1>
                    <h2 className="text-sm font-bold italic">FIT OUT DEPOSIT REFUND</h2>
                </div>

                {/* Recipient */}
                <div className="mb-4 font-bold">
                    Kính gửi: Văn phòng Ban Quản lý / <span className="italic">To the Management Office</span>
                </div>

                {/* Form Fields */}
                <div className="space-y-2 mb-4">
                    <div className="flex items-baseline">
                        <span className="whitespace-nowrap pr-2">Tên Công Ty / <span className="italic">Company name:</span></span>
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
                        <span className="w-32 border-b border-dotted border-black px-2 font-bold">{renderField(data.contactPhone, 'contactPhone')}</span>
                    </div>
                    <div className="flex items-baseline">
                        <span className="whitespace-nowrap pr-2">Tên nhà thầu/Công ty/ <span className="italic">Contractor's Name/Company:</span></span>
                        <span className="flex-1 border-b border-dotted border-black px-2 font-bold">{renderField(data.contractorName, 'contractorName')}</span>
                    </div>
                    <div className="flex items-baseline">
                        <span className="whitespace-nowrap pr-2">Người đại diện/ <span className="italic">Representatives:</span></span>
                        <span className="flex-1 border-b border-dotted border-black px-2 font-bold">{renderField(data.contractorRepName, 'contractorRepName')}</span>
                        <span className="whitespace-nowrap px-2">ĐTDĐ/ <span className="italic">Mobile No.:</span></span>
                        <span className="w-32 border-b border-dotted border-black px-2 font-bold">{renderField(data.contractorRepPhone, 'contractorRepPhone')}</span>
                    </div>

                    <div className="flex items-baseline pt-2">
                        <span className="whitespace-nowrap pr-2">Căn cứ theo biên bản kiểm tra hoàn tất ngày</span>
                        <span className="w-10 border-b border-black text-center">{renderField(data.inspectionDay, 'inspectionDay')}</span>
                        <span className="px-1">/</span>
                        <span className="w-10 border-b border-black text-center">{renderField(data.inspectionMonth, 'inspectionMonth')}</span>
                        <span className="px-1">/ 202</span>
                        <span className="w-10 border-b border-black text-center">{renderField(data.inspectionYear, 'inspectionYear')}</span>
                    </div>
                    <div className="flex items-baseline italic">
                        <span className="whitespace-nowrap pr-2">Based on the Fit out completion inspection dated</span>
                        <span className="w-10 border-b border-black text-center"></span>
                        <span className="px-1">/</span>
                        <span className="w-10 border-b border-black text-center"></span>
                        <span className="px-1">/ 202</span>
                        <span className="w-10 border-b border-black text-center"></span>
                    </div>
                </div>

                {/* Refund Request */}
                <div className="mb-4">
                    <p className="text-justify mb-2">
                        Đề nghị Ban Quản lý Tòa nhà thực hiện hoàn trả tiền ký quỹ trang trí nội thất bằng chuyển khoản vào tài khoản sau / <span className="italic">We would like to request the Management Office to refund the fit out deposit without interest by transferring to the bank account as follow:</span>
                    </p>
                    <div className="space-y-2 pl-4">
                        <div className="flex items-baseline">
                            <span className="w-48 whitespace-nowrap">- Chủ tài khoản/ <span className="italic">Beneficial name:</span></span>
                            <span className="flex-1 border-b border-dotted border-black px-2 font-bold">{renderField(data.bankAccountName, 'bankAccountName')}</span>
                        </div>
                        <div className="flex items-baseline">
                            <span className="w-48 whitespace-nowrap">- Số tài khoản/ <span className="italic">Account No:</span></span>
                            <span className="flex-1 border-b border-dotted border-black px-2 font-bold">{renderField(data.bankAccountNumber, 'bankAccountNumber')}</span>
                        </div>
                        <div className="flex items-baseline">
                            <span className="w-48 whitespace-nowrap">- Ngân hàng/ <span className="italic">Bank:</span></span>
                            <span className="flex-1 border-b border-dotted border-black px-2 font-bold">{renderField(data.bankName, 'bankName')}</span>
                        </div>
                    </div>
                </div>

                {/* Attachments */}
                <div className="mb-6">
                    <div className="font-bold mb-2">Hồ sơ đính kèm (nếu có) / <span className="italic font-normal">Attached documents:</span></div>
                    <div className="space-y-2 pl-4">
                        <div className="flex items-baseline">
                            <span className="pr-2">1.</span>
                            <span className="flex-1 border-b border-dotted border-black px-2">{renderField(data.attachment1, 'attachment1')}</span>
                        </div>
                        <div className="flex items-baseline">
                            <span className="pr-2">2.</span>
                            <span className="flex-1 border-b border-dotted border-black px-2">{renderField(data.attachment2, 'attachment2')}</span>
                        </div>
                        <div className="flex items-baseline">
                            <span className="pr-2">3.</span>
                            <span className="flex-1 border-b border-dotted border-black px-2">{renderField(data.attachment3, 'attachment3')}</span>
                        </div>
                    </div>
                </div>

                {/* Signatures Table */}
                <div className="border border-black">
                    <div className="grid grid-cols-2 divide-x divide-black">
                        {/* Tenant */}
                        <div className="text-center p-4">
                            <h4 className="font-bold">Xác nhận của Khách thuê</h4>
                            <h4 className="font-bold italic">Confirmed by Tenant</h4>
                            <p className="italic text-xs mb-16">(Ký tên và đóng dấu / Signature & Stamp)</p>
                            <div className="flex items-end justify-center">
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
                        {/* Management Office */}
                        <div className="text-center p-4">
                            <h4 className="font-bold">Ban Quản lý</h4>
                            <h4 className="font-bold italic">Management Office</h4>
                            <p className="italic text-xs mb-16">(Ký tên và đóng dấu / Signature & Stamp)</p>
                            <div className="flex items-end justify-center">
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
        </div>
    );
};

export default FitOutDepositRefund;
