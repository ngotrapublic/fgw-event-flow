import React from 'react';
import EditableField from './EditableField';

const EquipmentMovingPermit = ({ data, onUpdate }) => {
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
        const list = data.equipmentInOut ? [...data.equipmentInOut] : [];
        while (list.length <= index) {
            list.push({});
        }
        list[index] = { ...list[index], [field]: value };
        onUpdate('equipmentInOut', list);
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

    const Header = () => (
        <div className="mb-2">
            <img src="/assets/forms/header-full-v3.jpg" alt="Header" className="w-full object-contain" />
        </div>
    );

    // Pagination Logic
    const equipment = data.equipmentInOut || [];
    const PAGE_1_MAX = 12;  // Max rows on first page (fits with header + signatures)
    const PAGE_N_MAX = 20;  // Max rows on subsequent pages (more space available)

    // Smart pagination: page 1 always has 12 rows, overflow creates new pages
    const pages = [];
    if (equipment.length <= PAGE_1_MAX) {
        // Single page: display all items (render 12 rows for consistent layout)
        pages.push(equipment);
    } else {
        // Multi-page: split data across pages
        pages.push(equipment.slice(0, PAGE_1_MAX));
        let remaining = equipment.slice(PAGE_1_MAX);
        while (remaining.length > 0) {
            pages.push(remaining.slice(0, PAGE_N_MAX));
            remaining = remaining.slice(PAGE_N_MAX);
        }
    }

    return (
        <div className="text-black text-[13px]" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
            {pages.map((pageData, pageIndex) => (
                <div key={pageIndex} className="max-w-[210mm] print:max-w-none mx-auto print:mx-0 px-8 print:px-0 pb-4 pt-2 bg-white print-break-before">
                    <Header />

                    {/* Title & Static Info - Page 1 Only */}
                    {pageIndex === 0 && (
                        <>
                            <div className="flex justify-between items-start mb-1 border-b-2 border-transparent">
                                <div className="border border-black px-4 py-1 font-bold whitespace-nowrap h-fit text-xs">
                                    MẪU / FORM: 09
                                </div>
                                <div className="text-center flex-1 px-2">
                                    <h1 className="text-lg font-bold uppercase leading-tight">PHIẾU ĐĂNG KÝ DI CHUYỂN TÀI SẢN</h1>
                                    <h2 className="text-sm font-bold italic">EQUIPMENT/GOODS MOVING APPLICATION FORM</h2>
                                </div>
                                <div className="w-20"></div>
                            </div>

                            <div className="mb-1 font-bold">
                                Kính gửi: Văn phòng Ban Quản lý/ <span className="italic">To the Management Office</span>
                            </div>

                            <div className="space-y-0.5 mb-1">
                                <div className="flex items-baseline">
                                    <span className="whitespace-nowrap pr-2">Tên Công Ty/ <span className="italic">Company name:</span></span>
                                    <span className="flex-1 border-b border-dotted border-black font-bold uppercase px-2">
                                        {renderField(data.companyName || 'TRUNG TÂM LIÊN KẾT FPT GREENWICH', 'companyName')}
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
                                    <span className="w-24 border-b border-dotted border-black px-2">{renderField(data.contactPhone, 'contactPhone')}</span>
                                </div>
                                <div className="mt-1 text-justify text-[11px] leading-tight">
                                    Đề nghị được sử dụng thang máy chuyển hàng để vận chuyển hàng hóa/ vật liệu/ thiết bị theo danh sách dưới đây/ <span className="italic">I would like to ask for using lifts for moving goods and equipment as the list below:</span>
                                </div>

                                <div className="flex justify-between mt-1 mb-1 text-[11px] leading-tight">
                                    <div className="w-[45%]">
                                        <div className="flex items-center mb-0.5">
                                            <div className="w-3.5 h-3.5 border border-black mr-2"></div>
                                            <span className="font-bold">Vận chuyển ra/ <span className="italic">Move out</span></span>
                                        </div>
                                        <div className="space-y-0">
                                            <div>Thời gian vận chuyển dự kiến:</div>
                                            <div className="italic">Estimating time for using cargo lifts:</div>
                                            <div className="border-b border-dotted border-black w-full min-h-[0.9rem] mt-0.5">
                                                {renderField(data.estimatedTimeOut, 'estimatedTimeOut')}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-[53%]">
                                        <div className="flex items-center mb-0.5">
                                            <div className="w-3.5 h-3.5 border border-black mr-2"></div>
                                            <span className="font-bold">Vận chuyển vào/ <span className="italic">Move in</span></span>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-baseline">
                                                <span className="whitespace-nowrap pr-1">Từ/ <span className="italic">From</span></span>
                                                <span className="w-10 border-b border-black text-center px-1">
                                                    {renderField(data.moveInStartHour || (data.constructionStartTime?.split(':')[0] || ''), 'moveInStartHour', '', 'text-center')}
                                                </span>
                                                <span className="whitespace-nowrap px-1">giờ</span>
                                                <span className="w-10 border-b border-black text-center px-1">
                                                    {renderField(data.moveInStartMinute || (data.constructionStartTime?.split(':')[1] || ''), 'moveInStartMinute', '', 'text-center')}
                                                </span>
                                                <span className="whitespace-nowrap px-1">phút, ngày/date</span>
                                                <span className="flex-1 border-b border-black text-center px-1">
                                                    {renderField(data.moveInStartDate || formatDate(data.constructionStartDate), 'moveInStartDate', '', 'text-center')}
                                                </span>
                                            </div>
                                            <div className="flex items-baseline">
                                                <span className="whitespace-nowrap pr-1">Đến/ <span className="italic">To</span></span>
                                                <span className="ml-[6px] w-10 border-b border-black text-center px-1">
                                                    {renderField(data.moveInEndHour || (data.constructionEndTime?.split(':')[0] || ''), 'moveInEndHour', '', 'text-center')}
                                                </span>
                                                <span className="whitespace-nowrap px-1">giờ</span>
                                                <span className="w-10 border-b border-black text-center px-1">
                                                    {renderField(data.moveInEndMinute || (data.constructionEndTime?.split(':')[1] || ''), 'moveInEndMinute', '', 'text-center')}
                                                </span>
                                                <span className="whitespace-nowrap px-1">phút, ngày/date</span>
                                                <span className="flex-1 border-b border-black text-center px-1">
                                                    {renderField(data.moveInEndDate || formatDate(data.constructionEndDate), 'moveInEndDate', '', 'text-center')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {pageIndex > 0 && (
                        <div className="mb-2">
                        </div>
                    )}

                    {/* Table */}
                    <div className="mb-2">
                        <table className="w-full border-collapse border border-black text-xs">
                            <thead>
                                <tr>
                                    <th className="border border-black p-0.5 text-center w-10 bg-gray-200">TT</th>
                                    <th className="border border-black p-0.5 text-center bg-gray-200">
                                        Tên hàng hóa/ Vật dụng vận chuyển<br /><span className="italic font-normal">Items/ Good descriptions</span>
                                    </th>
                                    <th className="border border-black p-0.5 text-center w-24 bg-gray-200">
                                        Quy cách<br /><span className="italic font-normal">Specification</span>
                                    </th>
                                    <th className="border border-black p-0.5 text-center w-24 bg-gray-200">
                                        Số lượng<br /><span className="italic font-normal">Amount</span>
                                    </th>
                                    <th className="border border-black p-0.5 text-center w-32 bg-gray-200">
                                        Ghi chú <span className="italic font-normal">Notes</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {(pageIndex === 0 ? Array.from({ length: PAGE_1_MAX }) : pageData).map((_, rowIndex) => {
                                    const realIndex = pageIndex === 0 ? rowIndex : PAGE_1_MAX + (pageIndex - 1) * SUBSEQUENT_PAGE_MAX + rowIndex;
                                    const item = pageData[rowIndex] || {};

                                    return (
                                        <tr key={rowIndex}>
                                            <td className="border border-black p-0.5 h-6 text-center">{realIndex + 1}</td>
                                            <td className="border border-black p-0.5">{renderArrayField(realIndex, 'name', item.name)}</td>
                                            <td className="border border-black p-0.5 text-center">{renderArrayField(realIndex, 'specification', item.specification)}</td>
                                            <td className="border border-black p-0.5 text-center">{renderArrayField(realIndex, 'quantity', item.quantity)}</td>
                                            <td className="border border-black p-0.5">{renderArrayField(realIndex, 'notes', item.notes)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>


                    {/* Final Confirmation Blocks (Match Image) */}
                    {pageIndex === pages.length - 1 && (
                        <div className="border border-black text-[10.5px] leading-tight mt-1">
                            {/* Row 1: Undertaking & Registered By */}
                            <div className="flex border-b border-black">
                                <div className="w-2/3 border-r border-black p-2">
                                    <div className="font-bold underline mb-1">Chúng tôi cam kết/ <span className="italic font-normal">We undertake:</span></div>
                                    <ol className="list-decimal pl-4 space-y-1">
                                        <li>Tuân thủ các quy định và hướng dẫn của nhân viên tại Tòa nhà./ <span className="italic font-normal">To comply with regulations and directions of Building's staffs.</span></li>
                                        <li>Chịu trách nhiệm bồi thường, sửa chữa, khắc phục các hư hỏng/ Thiệt hại gây ra do việc vận chuyển;/ <span className="italic font-normal">shall be responsible for any damage caused during the above time delivery and for the service lift.</span></li>
                                    </ol>
                                    <div className="font-bold underline mt-2 mb-1">Ghi chú/ <span className="italic font-normal">Note:</span></div>
                                    <ul className="list-disc pl-4">
                                        <li>Phiếu này cần được gửi đến Ban Quản lý tòa nhà ít nhất 04 tiếng trước khi cần chuyển hàng ra/ vào Tòa nhà./ <span className="italic font-normal">This form</span></li>
                                    </ul>
                                </div>
                                <div className="w-1/3 p-2 text-center flex flex-col justify-between min-h-[80px]">
                                    <div>
                                        <h4 className="font-bold uppercase text-[12px]">NGƯỜI ĐĂNG KÝ</h4>
                                        <p className="italic text-[11px]">Registered by</p>
                                    </div>
                                    <div className="mt-4 text-[11px]">
                                        <span>Ngày/Date: </span>
                                        <EditableField isInline={true} value={data.signDateRegistered || `${day}/${month}/${year}`} onChange={(val) => onUpdate('signDateRegistered', val)} />
                                    </div>
                                </div>
                            </div>

                            {/* Row 2: Building Rules & Management Confirmation */}
                            <div className="flex border-b border-black">
                                <div className="w-2/3 border-r border-black p-2 pb-4">
                                    <div className="italic text-[10px] mb-2 pl-4">
                                        should be applied for Management Office at least 4 hours before moving in/out.
                                    </div>
                                    <ul className="list-disc pl-4 space-y-2">
                                        <li>
                                            <strong>Không được sử dụng thang máy khách/cư dân để chuyển hàng hóa/ vật liệu/ thiết bị khi chưa có sự đồng ý trước của Ban Quản lý tòa nhà.</strong>/ <span className="italic font-normal">Do not using residents' lifts if there is not allowance of M.O.</span>
                                        </li>
                                        <li>
                                            <strong>Không chuyển hàng vào các mốc thời gian: 07h00-8h30; 11h30-14h00; 16h00-18h00 ; 21h30-06h00.</strong>/ <span className="italic font-normal">Do not move goods at timelines: 07h00 – 08h30, 11h30 – 14h00, 16h00 – 18h00, 21h30 – 06h00</span>
                                        </li>
                                    </ul>
                                </div>
                                <div className="w-1/3 p-2 text-center flex flex-col justify-between min-h-[80px]">
                                    <div>
                                        <h4 className="font-bold uppercase text-[12px]">BAN QUẢN LÝ XÁC NHẬN</h4>
                                        <p className="italic text-[11px]">Confirmed by The Management Office</p>
                                    </div>
                                    <div className="mt-4 text-[11px]">
                                        <span>Ngày/Date: </span>
                                        <EditableField isInline={true} value={data.signDateManagement || `${day}/${month}/${year}`} onChange={(val) => onUpdate('signDateManagement', val)} />
                                    </div>
                                </div>
                            </div>

                            {/* Row 3: Security & Captain Confirmation */}
                            <div className="flex">
                                <div className="w-2/3 border-r border-black p-2 text-center flex flex-col justify-between min-h-[70px]">
                                    <div className="text-left mb-1 font-normal text-[11px]">
                                        - Chuyển hàng theo đúng số lượng đã đăng ký/ <span className="italic">Moving the goods in accordance with the quantity specified registered.</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold uppercase text-[12px]">NHÂN VIÊN BẢO VỆ XÁC NHẬN</h4>
                                        <p className="italic text-[11px]">Confirmed by Security</p>
                                    </div>
                                    <div className="mt-6 text-[11px] font-normal">
                                        <span>Ngày/Date: </span>
                                        <EditableField isInline={true} value={data.signDateSecurity || `${day}/${month}/${year}`} onChange={(val) => onUpdate('signDateSecurity', val)} />
                                    </div>
                                </div>
                                <div className="w-1/3 p-2 text-center flex flex-col justify-between min-h-[70px]">
                                    <div>
                                        <h4 className="font-bold uppercase text-[12px]">ĐỘI TRƯỞNG BẢO VỆ XÁC NHẬN</h4>
                                        <p className="italic text-[11px]">Confirmed by Captian Security</p>
                                    </div>
                                    <div className="mt-6 text-[11px] font-normal">
                                        <span>Ngày/Date: </span>
                                        <EditableField isInline={true} value={data.signDateCaptain || `${day}/${month}/${year}`} onChange={(val) => onUpdate('signDateCaptain', val)} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default EquipmentMovingPermit;
