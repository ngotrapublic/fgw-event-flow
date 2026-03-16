import React from 'react';
import EditableField from './EditableField';

const NoticeOfCompletion = ({ data, onUpdate }) => {
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
                <div className="flex justify-between items-start mb-6 border-b-2 border-transparent">
                    <div className="border border-black px-4 py-2 font-bold whitespace-nowrap h-fit">
                        MẪU / FORM: 11
                    </div>
                    <div className="text-center flex-1 px-2">
                        <h1 className="text-lg font-bold uppercase leading-tight">THÔNG BÁO HOÀN TẤT THIẾT KẾ VÀ THI CÔNG</h1>
                        <h2 className="text-sm font-bold italic">NOTICE OF COMPLETING FIT-OUT WORKS</h2>
                    </div>
                    <div className="w-20"></div>
                </div>

                {/* Recipient */}
                <div className="mb-6 font-bold">
                    Kính gửi: Văn phòng Ban Quản lý/ <span className="italic">To the Management Office</span>
                </div>

                {/* Form Fields */}
                <div className="space-y-4 mb-6">
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
                        <span className="w-40 border-b border-dotted border-black px-2">{renderField(data.contactPhone, 'contactPhone')}</span>
                    </div>
                </div>

                {/* Section 1: Tenant */}
                <div className="mb-6">
                    <div className="font-bold italic mb-4">1. Phần dành cho Khách thuê / <span className="italic">Completed by the Tenant</span></div>

                    <div className="space-y-4 text-justify leading-relaxed">
                        <p>
                            Chúng tôi xin thông báo việc thi công trang bị văn phòng của chúng tôi đã hoàn tất vào ngày <span className="inline-block w-32 border-b border-dotted border-black">{renderField(data.completionDate, 'completionDate', '', 'text-center')}</span> và chúng tôi sẽ bắt đầu đi vào hoạt động ngày <span className="inline-block w-32 border-b border-dotted border-black">{renderField(data.businessCommenceDate, 'businessCommenceDate', '', 'text-center')}</span>
                        </p>
                        <p className="italic">
                            We hereby give you notice that our Fit-out works had been completed on <span className="inline-block w-32 border-b border-dotted border-black">{renderField(data.completionDate, 'completionDate', '', 'text-center')}</span> and bussiness commence on <span className="inline-block w-32 border-b border-dotted border-black">{renderField(data.businessCommenceDate, 'businessCommenceDate', '', 'text-center')}</span>
                        </p>
                        <p>
                            Xin vui lòng sắp xếp để cùng chúng tôi kiểm tra tổng thể về việc hoàn tất thi công và hoàn trả tiền cọc sau khi tiến hành khảo sát và trừ các khoản bồi hoàn (nếu có) / <span className="italic">Please arrange to make inspection of our completed works and refund the Fi-out Deposit less deduction (if any) to us.</span>
                        </p>
                    </div>
                </div>

                {/* Page 1 Signature */}
                <div className="flex justify-end mt-12">
                    <div className="text-center w-1/2">
                        <div className="mb-2 italic">
                            <EditableField
                                isInline={true}
                                value={data.signDateString || `Tp. Hồ Chí Minh, ngày ${day} tháng ${month} năm ${year}`}
                                onChange={(val) => onUpdate('signDateString', val)}
                                className="text-center w-full"
                            />
                        </div>
                        <h4 className="font-bold uppercase">ĐẠI DIỆN KHÁCH THUÊ</h4>
                        <p className="italic text-xs">Ký tên và đóng dấu / Signature & Stamp</p>
                        <div className="h-32"></div>
                    </div>
                </div>
            </div>

            {/* Page Break */}
            <div className="print:break-before-page"></div>

            {/* Page 2 */}
            <div className="max-w-[210mm] print:max-w-none mx-auto print:mx-0 px-8 print:px-0 pb-8 pt-8 relative">
                <Header />

                {/* Section 2: Management Office */}
                <div className="mb-6">
                    <div className="font-bold italic mb-4">2. Phần dành cho Ban Quản lý Tòa nhà/ <span className="italic">Completed by the Management Office</span></div>

                    {/* Subsection a */}
                    <div className="mb-6">
                        <div className="mb-2">
                            <span className="font-bold mr-2">a.</span>
                            Kết quả nhận xét của Kỹ thuật Tòa nhà sau khi khảo sát./ <span className="italic">Comments from Technician department after inspection:</span>
                        </div>
                        <div className="space-y-1">
                            <div className="border-b border-dotted border-black">{renderField(data.technicianComment1, 'technicianComment1')}</div>
                            <div className="border-b border-dotted border-black">{renderField(data.technicianComment2, 'technicianComment2')}</div>
                            <div className="border-b border-dotted border-black">{renderField(data.technicianComment3, 'technicianComment3')}</div>
                            <div className="border-b border-dotted border-black">{renderField(data.technicianComment4, 'technicianComment4')}</div>
                        </div>
                    </div>

                    {/* Subsection b */}
                    <div className="mb-6">
                        <div className="mb-2">
                            <span className="font-bold mr-2">b.</span>
                            Kế toán xác nhận số tiền đặt cọc hoàn trả./ <span className="italic">Accountant verify for Fit-out deposit Refund Amount</span>
                        </div>
                        <div className="space-y-1">
                            <div className="border-b border-dotted border-black">{renderField(data.accountantComment1, 'accountantComment1')}</div>
                            <div className="border-b border-dotted border-black">{renderField(data.accountantComment2, 'accountantComment2')}</div>
                            <div className="border-b border-dotted border-black">{renderField(data.accountantComment3, 'accountantComment3')}</div>
                        </div>
                    </div>

                    {/* Subsection c */}
                    <div className="mb-8">
                        <div className="mb-2">
                            <span className="font-bold mr-2">c.</span>
                            Ý kiến quyết định của Ban Quản lý Tòa nhà./ <span className="italic">Comment from The Property Manager</span>
                        </div>
                        <div className="space-y-1">
                            <div className="border-b border-dotted border-black">{renderField(data.managerComment1, 'managerComment1')}</div>
                            <div className="border-b border-dotted border-black">{renderField(data.managerComment2, 'managerComment2')}</div>
                            <div className="border-b border-dotted border-black">{renderField(data.managerComment3, 'managerComment3')}</div>
                        </div>
                    </div>

                    {/* Page 2 Signatures */}
                    <div className="flex justify-between text-center mt-12">
                        <div className="w-1/3 px-2">
                            <h4 className="font-bold">Xác nhận của KTTN</h4>
                            <p className="italic text-xs">Confirmed by Technical Team</p>
                            <p className="italic text-xs">( Ký tên / Signature)</p>
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
                        <div className="w-1/3 px-2">
                            <h4 className="font-bold">Kế toán</h4>
                            <p className="italic text-xs">Acconting department</p>
                            <p className="italic text-xs">(Ký tên / Signature)</p>
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
                        <div className="w-1/3 px-2">
                            <h4 className="font-bold">Ban Quản lý</h4>
                            <p className="italic text-xs">Management Office</p>
                            <p className="italic text-xs">(Ký tên và đóng dấu / Signature & Stamp)</p>
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
        </div>
    );
};

export default NoticeOfCompletion;
