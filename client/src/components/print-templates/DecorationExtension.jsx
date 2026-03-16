import React from 'react';
import EditableField from './EditableField';

const DecorationExtension = ({ data, onUpdate }) => {
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

    const handleArrayUpdate = (index, field, value) => {
        if (!onUpdate) return;
        const list = data.extensionWorkList ? [...data.extensionWorkList] : [];
        // Ensure list is long enough
        while (list.length <= index) {
            list.push({});
        }
        list[index] = { ...list[index], [field]: value };
        onUpdate('extensionWorkList', list);
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
                <div className="flex justify-between items-start mb-2 border-b-2 border-transparent">
                    <div className="border border-black px-4 py-2 font-bold whitespace-nowrap h-fit">
                        MẪU / FORM: 10
                    </div>
                    <div className="text-center flex-1 px-2">
                        <h1 className="text-lg font-bold uppercase leading-tight">PHIẾU ĐĂNG KÝ GIA HẠN THI CÔNG TRANG TRÍ/ LẮP ĐẶT NỘI THẤT</h1>
                        <h2 className="text-sm font-bold italic">DECORATION FIT- OUT EXTENSION REGISTRATION FORM</h2>
                    </div>
                    <div className="w-20"></div>
                </div>

                {/* Recipient */}
                <div className="mb-2 font-bold">
                    Kính gửi: Văn phòng Ban Quản lý/ <span className="italic">To the Management Office</span>
                </div>

                {/* Form Fields */}
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
                        <span className="flex-1 border-b border-dotted border-black px-2">{renderField(data.constructionContent || data.eventName, 'constructionContent')}</span>
                    </div>
                    <div className="flex items-baseline">
                        <span className="whitespace-nowrap pr-2">Nhà thầu thi công / <span className="italic">Fitting-out Contractor:</span></span>
                        <span className="flex-1 border-b border-dotted border-black px-2">{renderField(data.contractorName, 'contractorName')}</span>
                    </div>
                    <div className="flex items-baseline">
                        <span className="whitespace-nowrap pr-2">Người đại diện/ <span className="italic">Representatives:</span></span>
                        <span className="flex-1 border-b border-dotted border-black px-2">{renderField(data.registrantName, 'registrantName')}</span>
                        <span className="whitespace-nowrap px-2">ĐTDĐ / <span className="italic">Mobile No.:</span></span>
                        <span className="w-32 border-b border-dotted border-black px-2">{renderField(data.contactPhone, 'contactPhone')}</span>
                    </div>
                </div>

                {/* Extension Details */}
                <div className="mb-2">
                    <div className="italic font-bold mb-1">Chi tiết gia hạn thi công/ <span className="italic">Extension details:</span></div>

                    <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                        {/* Fitting out Period */}
                        <div className="col-span-2 flex items-center">
                            <span className="w-40 whitespace-nowrap">Thời gian thi công:</span>
                            <div className="flex-1 flex items-center">
                                <span className="whitespace-nowrap mr-2">Từ ngày:</span>
                                <div className="w-32 border-b border-dotted border-black text-center px-1">
                                    {renderField(data.fittingOutFrom, 'fittingOutFrom')}
                                </div>
                                <span className="whitespace-nowrap mx-2 ml-12">Đến ngày:</span>
                                <div className="w-32 border-b border-dotted border-black text-center px-1">
                                    {renderField(data.fittingOutTo, 'fittingOutTo')}
                                </div>
                            </div>
                        </div>
                        <div className="col-span-2 flex items-center italic text-xs mb-1">
                            <span className="w-40">Fitting out Period:</span>
                            <div className="flex-1 flex items-center">
                                <span className="w-[170px]">From:</span>
                                <span className="ml-12">To:</span>
                            </div>
                        </div>

                        {/* Extension Period */}
                        <div className="col-span-2 flex items-center">
                            <span className="w-40 whitespace-nowrap">Thời gian gia hạn thi công:</span>
                            <div className="flex-1 flex items-center">
                                <span className="whitespace-nowrap mr-2">Từ ngày:</span>
                                <div className="w-32 border-b border-dotted border-black text-center px-1">
                                    {renderField(data.extensionFrom, 'extensionFrom')}
                                </div>
                                <span className="whitespace-nowrap mx-2 ml-12">Đến ngày:</span>
                                <div className="w-32 border-b border-dotted border-black text-center px-1">
                                    {renderField(data.extensionTo, 'extensionTo')}
                                </div>
                            </div>
                        </div>
                        <div className="col-span-2 flex items-center italic text-xs">
                            <span className="w-40">Extension Period:</span>
                            <div className="flex-1 flex items-center">
                                <span className="w-[170px]">From:</span>
                                <span className="ml-12">To:</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Work Items Table */}
                <div className="mb-2">
                    <div className="font-bold mb-1">Hạng mục gia hạn thi công / <span className="italic">Extension works Items:</span></div>
                    <table className="w-full border-collapse border border-black">
                        <thead>
                            <tr>
                                <th className="border border-black p-1 text-center w-12">STT<br /><span className="italic font-normal">No.</span></th>
                                <th className="border border-black p-1 text-center">Tóm tắt chi tiết công việc:<br /><span className="italic font-normal">Description of working plan:</span></th>
                                <th className="border border-black p-1 text-center w-32">Số lượng<br /><span className="italic font-normal">Amount</span></th>
                                <th className="border border-black p-1 text-center w-40">Ghi chú<br /><span className="italic font-normal">Notes</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: 6 }).map((_, index) => {
                                const item = (data.extensionWorkList && data.extensionWorkList[index]) || {};
                                return (
                                    <tr key={index}>
                                        <td className="border border-black p-1 h-6 text-center">{index + 1}</td>
                                        <td className="border border-black p-1">{renderArrayField(index, 'description', item.description)}</td>
                                        <td className="border border-black p-1 text-center">{renderArrayField(index, 'amount', item.amount)}</td>
                                        <td className="border border-black p-1">{renderArrayField(index, 'note', item.note)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Blueprint Attached */}
                <div className="flex items-center justify-end space-x-8 mb-4">
                    <span className="font-bold italic mr-auto">Bản vẽ chi tiết đính kèm/ <span className="italic">Blueprint Attached</span></span>
                    <div className="flex items-center">
                        <div className="w-4 h-4 border border-black mr-2"></div>
                        <span>Có/ <span className="italic">Yes:</span></span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-4 h-4 border border-black mr-2"></div>
                        <span>Không/ <span className="italic">No:</span></span>
                    </div>
                </div>

                {/* Signatures */}
                <div className="flex justify-between text-center">
                    <div className="w-1/3">
                        <h4 className="font-bold">Nhà thầu</h4>
                        <p className="italic text-xs">Contractor</p>
                        <p className="italic text-xs">(Ký tên và đóng dấu/</p>
                        <p className="italic text-xs">Signature & Stamp)</p>
                        <div className="h-16"></div>
                        <div className="text-xs">
                            <span>Ngày/Date: </span>
                            <EditableField isInline={true} value={data.signDateContractor || `${day}/${month}/${year}`} onChange={(v) => onUpdate('signDateContractor', v)} className="min-w-[70px] border-b border-black text-center" />
                        </div>
                    </div>
                    <div className="w-1/3">
                        <h4 className="font-bold">Xác nhận của Khách thuê</h4>
                        <p className="italic text-xs">Confirmed by Tenant</p>
                        <p className="italic text-xs">(Ký tên và đóng dấu/</p>
                        <p className="italic text-xs">Signature & Stamp)</p>
                        <div className="h-16"></div>
                        <div className="text-xs">
                            <span>Ngày/Date: </span>
                            <EditableField isInline={true} value={data.signDateTenant || `${day}/${month}/${year}`} onChange={(v) => onUpdate('signDateTenant', v)} className="min-w-[70px] border-b border-black text-center" />
                        </div>
                    </div>
                    <div className="w-1/3">
                        <h4 className="font-bold">Ban Quản lý</h4>
                        <p className="italic text-xs">Management Office</p>
                        <p className="italic text-xs">(Ký tên và đóng dấu/</p>
                        <p className="italic text-xs">Signature & Stamp)</p>
                        <div className="h-16"></div>
                        <div className="text-xs">
                            <span>Ngày/Date: </span>
                            <EditableField isInline={true} value={data.signDateManagement || `${day}/${month}/${year}`} onChange={(v) => onUpdate('signDateManagement', v)} className="min-w-[70px] border-b border-black text-center" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DecorationExtension;
