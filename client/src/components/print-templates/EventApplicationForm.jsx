import React from 'react';
import EditableField from './EditableField';

const EventApplicationForm = ({ data, onUpdate }) => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();

    const renderField = (value, fieldName, placeholder = '', className = 'text-center') => {
        return (
            <EditableField
                value={value}
                onChange={(newValue) => onUpdate && onUpdate(fieldName, newValue)}
                placeholder={placeholder}
                className={className}
            />
        );
    };

    const Header = () => (
        <div className="mb-2">
            <img src="/assets/forms/header-full-v3.jpg" alt="Header" className="w-full object-contain" />
        </div>
    );

    return (
        <div className="text-black leading-snug bg-white text-base print-break-before" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
            {/* Page 1 */}
            <div className="max-w-[210mm] print:max-w-none mx-auto print:mx-0 px-8 print:px-0 pb-8 pt-0 relative h-[297mm]">
                <Header />

                {/* Title */}
                <div className="flex justify-between items-start mb-4 border-b-2 border-transparent">
                    <div className="border border-black px-4 py-1 font-bold whitespace-nowrap h-fit">
                        MẪU / FORM: 15
                    </div>
                    <div className="text-center flex-1 px-2">
                        <h1 className="text-lg font-bold uppercase leading-tight">MẪU ĐĂNG KÝ SỰ KIỆN</h1>
                        <h2 className="text-sm font-bold italic">EVENT APPLICATION FORM</h2>
                    </div>
                    <div className="w-20"></div>
                </div>

                {/* Info Fields */}
                <div className="space-y-3 mb-4">
                    <div className="flex items-baseline">
                        <span className="whitespace-nowrap pr-2">Ngày nhận/ <span className="italic">Date of receipt:</span></span>
                        <span className="flex-1 border-b border-dotted border-black px-2">
                            {renderField(data.receiptDate || `${day}/${month}/${year}`, 'receiptDate')}
                        </span>
                    </div>
                    <div className="flex items-baseline">
                        <span className="whitespace-nowrap pr-2">Tên khách thuê/ <span className="italic">Company name:</span></span>
                        <span className="flex-1 border-b border-dotted border-black px-2 font-bold uppercase">
                            {renderField(data.tenantName || 'NGUYỄN THANH HUY', 'tenantName')}
                        </span>
                    </div>
                    <div className="flex items-baseline">
                        <span className="whitespace-nowrap pr-2">Khu vực thuê/ <span className="italic">Premises:</span> Số văn phòng/ <span className="italic">Unit no:</span></span>
                        <span className="w-32 border-b border-dotted border-black px-2 font-bold">
                            {renderField(data.unitNo || 'Tầng 1, 2, 3 TTTM', 'unitNo')}
                        </span>
                        <span className="whitespace-nowrap px-2">Tầng/ <span className="italic">Floor:</span></span>
                        <span className="flex-1 border-b border-dotted border-black px-2">{renderField(data.floor, 'floor')}</span>
                    </div>
                    <div className="flex items-baseline">
                        <span className="whitespace-nowrap pr-2">Ngày nộp/ <span className="italic">Date of submission:</span></span>
                        <span className="flex-1 border-b border-dotted border-black px-2">
                            {renderField(data.submissionDate || `${day}/${month}/${year}`, 'submissionDate')}
                        </span>
                    </div>
                </div>

                <div className="font-bold uppercase mb-4">MÔ TẢ CHI TIẾT SỰ KIỆN/ <span className="italic">DESCRIPTION OF EVENT</span></div>

                <div className="space-y-3 mb-4">
                    <div className="flex items-baseline">
                        <span className="whitespace-nowrap pr-2">Loại sự kiện/ <span className="italic">Type of event:</span></span>
                        <span className="flex-1 border-b border-dotted border-black px-2">{renderField(data.eventType, 'eventType')}</span>
                    </div>
                    <div className="flex items-baseline">
                        <span className="whitespace-nowrap pr-2">Địa điểm sự kiện/ <span className="italic">Location of event:</span></span>
                        <span className="flex-1 border-b border-dotted border-black px-2">{renderField(data.eventLocation, 'eventLocation')}</span>
                    </div>
                    <div className="flex items-baseline">
                        <span className="whitespace-nowrap pr-2">Ngày/ <span className="italic">Date:</span></span>
                        <span className="flex-1 border-b border-dotted border-black px-2">
                            {renderField(data.eventDate || (data.constructionStartDate ? formatDate(data.constructionStartDate) : ''), 'eventDate')}
                        </span>
                    </div>
                    <div className="flex items-baseline">
                        <span className="whitespace-nowrap pr-2">Chi tiết sự kiện/ <span className="italic">Details of event:</span></span>
                        <span className="flex-1 border-b border-dotted border-black px-2">
                            {renderField(data.eventDetails || data.eventName, 'eventDetails')}
                        </span>
                    </div>
                    <div className="border-b border-dotted border-black h-6">{renderField(data.eventDetails2, 'eventDetails2')}</div>
                    <div className="border-b border-dotted border-black h-6">{renderField(data.eventDetails3, 'eventDetails3')}</div>

                    <div className="pt-2">
                        <div className="whitespace-nowrap mb-1">Thời gian diễn ra sự kiện (bao gồm thời gian chuẩn bị/ dọn dẹp)./ <span className="italic">Time of event (including time for setup/ clean up):</span></div>
                        <div className="border-b border-dotted border-black h-6">
                            {renderField(data.eventTimeDetails || (data.constructionStartTime && data.constructionEndTime ? `${data.constructionStartTime} - ${data.constructionEndTime}` : data.eventTime || ''), 'eventTimeDetails')}
                        </div>
                    </div>
                </div>

                <div className="mb-4 text-justify space-y-4">
                    <p>
                        Nếu sự kiện diễn ra quá thời gian trên thì phí phát sinh sẽ áp dụng là <span className="inline-block w-20 border-b border-dotted border-black text-center">{renderField(data.overtimeFee || '.........', 'overtimeFee')}</span> VNĐ/ phút./ <span className="italic">If the event goes beyond set times, a charge shall be applied at the rate of VND <span className="inline-block w-20 border-b border-dotted border-black text-center">{renderField(data.overtimeFeeEn || '.........', 'overtimeFeeEn')}</span> per minute</span>
                    </p>
                    <p>
                        Yêu cầu sự kiện diễn ra không vi phạm nội quy, quy định của Tòa nhà và các quy định của Pháp luật; không ảnh hưởng đến an toàn, an ninh và các Khách thuê khác trong Tòa nhà; không gây cản trở lối đi lại, ra/vào của Tòa nhà, cũng như không gây cản trở liên quan đến công tác PCCC./ <span className="italic">When the event takes place, please do not violate the rules and regulations of the Building and the Law; do not affect the safety, security and other tenants in the Building; do not interfere the aisles, entrance/exit ways of the Building as well as obstruct the fire protection work.</span>
                    </p>
                    <p>
                        Yêu cầu hoàn trả lại mặt bằng như ban đầu trước khi đăng ký sự kiện và phải chịu khoản chi phí phát sinh nếu làm hư hại thiết bị Tòa nhà hoặc phí vệ sinh – dọn dẹp để hoàn trả mặt bằng./ <span className="italic">Please return the original premises as before signing up for the event and incur costs incurred for any damage to the building equipment or cleaning fees.</span>
                    </p>
                </div>
            </div>

            {/* Page Break */}
            <div className="print:break-before-page"></div>

            {/* Page 2 */}
            <div className="max-w-[210mm] print:max-w-none mx-auto print:mx-0 px-8 print:px-0 pb-8 pt-8 relative h-[297mm] flex flex-col">
                <Header />

                <div className="flex-1 flex flex-col justify-evenly">
                    <div className="space-y-6">
                        <div className="flex items-baseline">
                            <span className="whitespace-nowrap pr-2">Công ty hoặc đơn vị liên quan./ <span className="italic">Company(ies) involved:</span></span>
                            <span className="flex-1 border-b border-dotted border-black px-2">{renderField(data.involvedCompany, 'involvedCompany')}</span>
                        </div>
                        <div className="border-b border-dotted border-black h-6">{renderField(data.involvedCompany2, 'involvedCompany2')}</div>

                        <div>
                            Thông tin nhân viên/ <span className="italic">Staff details:</span> Sử dụng Phiếu: “Danh sách nhân viên thi công” đính kèm/ <span className="italic">Use attached “List of workers”</span>
                        </div>

                        <div>
                            <div className="flex items-baseline">
                                <span className="whitespace-nowrap pr-2">Yêu cầu dịch vụ hỗ trợ (nếu có)/ <span className="italic">Additional service request (if any):</span></span>
                            </div>
                            <div className="flex items-start mt-4 pl-0">
                                <span className="w-40">Điện/Electricity</span>
                                <div className="flex-1">
                                    <div className="flex items-center space-x-12 mb-1">
                                        <label className="flex items-center">
                                            <input type="checkbox" className="mr-2" checked={data.electricityYes} onChange={(e) => onUpdate('electricityYes', e.target.checked)} />
                                            CÓ (chi tiết mức cấp) <br />
                                            <span className="italic font-normal ml-1">YES (supplying details)</span>
                                        </label>
                                        <label className="flex items-center">
                                            <input type="checkbox" className="mr-2" checked={data.electricityNo} onChange={(e) => onUpdate('electricityNo', e.target.checked)} />
                                            KHÔNG <br />
                                            <span className="italic font-normal ml-1">NO</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-baseline">
                            <span className="whitespace-nowrap pr-2">Khác/ <span className="italic">Others:</span></span>
                            <span className="flex-1 border-b border-dotted border-black px-2">{renderField(data.otherService, 'otherService')}</span>
                        </div>

                        <div className="flex items-baseline">
                            <span className="whitespace-nowrap pr-2">Số người tham dự (ước tính)/: <span className="italic">No. of participant (approx)</span></span>
                            <span className="flex-1 border-b border-dotted border-black px-2">{renderField(data.attendeesCount, 'attendeesCount')}</span>
                        </div>

                        <div className="space-y-4">
                            <div className="mb-1 text-justify">
                                Công trình nhất thời/ tạm thời đòi hỏi bên ngoài phạm vi thuê của khách như bảng hiệu/ sân khấu/ khác.<br />
                                <span className="italic">Temporary erection of signage/ stages/ others which is need out of tenant’s premises.</span>
                            </div>
                            <div className="flex items-center space-x-12 mb-2">
                                <label className="flex items-center">
                                    <input type="checkbox" className="mr-2" checked={data.tempErectionYes} onChange={(e) => onUpdate('tempErectionYes', e.target.checked)} />
                                    Có/ <span className="italic font-normal ml-1">Yes</span>
                                </label>
                                <label className="flex items-center">
                                    <input type="checkbox" className="mr-2" checked={data.tempErectionNo} onChange={(e) => onUpdate('tempErectionNo', e.target.checked)} />
                                    Không/ <span className="italic font-normal ml-1">No</span>
                                </label>
                            </div>
                            <div className="flex items-baseline">
                                <span className="whitespace-nowrap pr-2">Nếu “Có”, mô tả chi tiết công việc/ <span className="italic">Work description if choose “Yes”:</span></span>
                                <span className="flex-1 border-b border-dotted border-black px-2">{renderField(data.workDescription, 'workDescription')}</span>
                            </div>
                            <div className="border-b border-dotted border-black h-6">{renderField(data.workDescription2, 'workDescription2')}</div>
                        </div>
                    </div>

                    <div className="mt-8 mb-4">
                        <div className="font-bold uppercase mb-4">TÀI LIỆU KÈM THEO/ <span className="italic">ATTACHMENTS TO BE SUBMITTED</span></div>
                        <div className="text-justify space-y-4 text-sm">
                            <div className="flex">
                                <span className="mr-2">1.</span>
                                <p>Khách thuê phải cung cấp trước mọi tài liệu/ thông tin cần hỗ trợ cho những khoản nêu trên. (Gồm bản vẻ chi tiết, phương án lắp đặt, sửa chữa)./ <span className="italic">The tenant must provide in advance all required supporting documentation/ imformation for the above items. (This way include detailed drawings and fixing methods)</span></p>
                            </div>
                            <div className="flex">
                                <span className="mr-2">2.</span>
                                <p>Giấy phép kinh doanh của các Công ty thầu/ sự kiện./ <span className="italic">Business License of Contractor/ Event companies</span></p>
                            </div>
                            <div className="flex">
                                <span className="mr-2">3.</span>
                                <p>Khi cần thiết, Khách thuê cần cung cấp bảo hiểm của bên tổ chức sự kiện phụ trách hoặc của bất kỳ nhà thầu có liên quan./ <span className="italic">If needed, The Tenant must provide the insurance cover of the assigned event organizer(s) and/ or any event sub-contractor(s)</span></p>
                            </div>
                            <div className="flex">
                                <span className="mr-2">4.</span>
                                <p>Bảng quy trình sự kiện được đóng dấu và ký tên bởi khách thuê và bên tổ chức sự kiện./ <span className="italic">Event Schedule stamped and signed by The Tenant and Event organizer.</span></p>
                            </div>
                            <div className="flex">
                                <span className="mr-2">5.</span>
                                <p>Văn bản xác nhận/ Cam kết trách nhiệm từ Khách thuê./ <span className="italic">Responsibility Confirmation Letter from the Tenant</span></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Page Break */}
            <div className="print:break-before-page"></div>

            {/* Page 3 */}
            <div className="max-w-[210mm] print:max-w-none mx-auto print:mx-0 px-8 print:px-0 pb-8 pt-8 relative h-[297mm]">
                <Header />

                <div className="mb-6">
                    <div className="text-justify space-y-2 text-sm">
                        <div className="flex">
                            <span className="mr-2">6.</span>
                            <p>Mẫu đăng ký “Danh sách nhân viên thi công”./ <span className="italic">Registration’s Form “List of workers”</span></p>
                        </div>
                    </div>
                </div>

                <div className="mb-4 text-sm font-bold uppercase">NOTE:</div>
                <div className="mb-4 text-justify text-sm">
                    <p className="mb-2">Trong một số trường hợp, Ban Quản lý sẽ yêu cầu phía khách thuê thanh toán chi phí trước thời gian sự kiện / hoạt động diễn ra. Ví dụ, hỗ trợ, bố trí, điện, vệ sinh…/ <span className="italic">Management may require fees payable the Tenant prior to certain events/ activities taking place.E.g., set up assistance, electricity, security, cleaning, and so on.</span></p>
                    <p className="italic font-bold">Khách thuê xác nhận và đồng ý các điều trên/ The Tenant confirms and accepts the above.</p>
                </div>

                <table className="w-full border-collapse border border-black mb-4">
                    <thead>
                        <tr>
                            <th className="border border-black p-2 w-1/2 align-top text-left">
                                <div>Người đăng ký/ Khách thuê</div>
                                <div className="italic font-normal">Applicant/ Tenant</div>
                            </th>
                            <th className="border border-black p-2 w-1/2 align-top text-left">
                                <div>Ban Quản lý Tòa nhà</div>
                                <div className="italic font-normal">Building Management</div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="h-32">
                            <td className="border border-black p-2 align-bottom">
                                <div className="flex items-end">
                                    <span className="whitespace-nowrap mr-2">Tên/Name:</span>
                                    <span className="flex-1 text-center font-bold">{data.registrantName}</span>
                                </div>
                            </td>
                            <td className="border border-black p-2 align-bottom">
                                <div className="flex items-end">
                                    <span className="whitespace-nowrap mr-2">Tên/Name:</span>
                                    <span className="flex-1"></span>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-black p-2">
                                <div className="flex items-center">
                                    <span className="whitespace-nowrap mr-2">Ngày/Date:</span>
                                    <div className="flex-1 flex justify-center items-center">
                                        <EditableField
                                            value={data.signDateTenant || `${day}/${month}/${year}`}
                                            onChange={(val) => onUpdate('signDateTenant', val)}
                                            placeholder=".../.../..."
                                            className="text-center w-full"
                                        />
                                    </div>
                                </div>
                            </td>
                            <td className="border border-black p-2">
                                <div className="flex items-center">
                                    <span className="whitespace-nowrap mr-2">Ngày/Date:</span>
                                    <div className="flex-1 flex justify-center items-center">
                                        <EditableField
                                            value={data.signDateManagement || ''}
                                            onChange={(val) => onUpdate('signDateManagement', val)}
                                            placeholder=".../.../..."
                                            className="text-center w-full"
                                        />
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default EventApplicationForm;
