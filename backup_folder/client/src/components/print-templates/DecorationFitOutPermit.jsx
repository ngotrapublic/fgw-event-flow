import React from 'react';
import EditableField from './EditableField';

const DecorationFitOutPermit = ({ data, onUpdate }) => {
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
                        MẪU / FORM: 07
                    </div>
                    <div className="text-center flex-1 px-2">
                        <h1 className="text-lg font-bold uppercase leading-tight whitespace-nowrap">PHIẾU ĐĂNG KÝ THI CÔNG TRANG TRÍ, LẮP ĐẶT NỘI THẤT</h1>
                        <h2 className="text-sm font-bold italic whitespace-nowrap">UNDERTAKING FOR DECORATION/ FIT-OUT WORK</h2>
                    </div>
                    <div className="w-20"></div>
                </div>

                {/* Note Box */}
                <div className="mb-2 italic font-bold text-xs">
                    <p>Khách hàng cần đăng ký trước khi khởi công ít nhất 03 - 07 ngày làm việc.</p>
                    <p>Application should be made 03-07 working days prior to the commencement of work.</p>
                </div>

                {/* Recipient */}
                <div className="mb-1 font-bold">
                    Kính gửi: Văn phòng Ban Quản lý/ <span className="italic">To the Management Office</span>
                </div>

                {/* Form Fields */}
                <div className="space-y-0 mb-2">
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
                        <span className="whitespace-nowrap pr-2">Người đại diện/ <span className="italic">Representative:</span></span>
                        <span className="flex-1 border-b border-dotted border-black px-2">{renderField(data.registrantName, 'registrantName')}</span>
                        <span className="whitespace-nowrap px-2">ĐTDĐ/ <span className="italic">Mobile No.:</span></span>
                        <span className="w-32 border-b border-dotted border-black px-2">{renderField(data.contactPhone, 'contactPhone')}</span>
                    </div>
                    <div className="flex items-baseline">
                        <span className="whitespace-nowrap pr-2">Tên nhà thầu/Công ty/ <span className="italic">Contractor's Name/Company:</span></span>
                        <span className="flex-1 border-b border-dotted border-black font-bold uppercase px-2">
                            {renderField(data.contractorName, 'contractorName', '', 'text-[13px] tracking-tight')}
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

                    {/* Working Period */}
                    <div className="flex items-baseline mt-1">
                        <span className="whitespace-nowrap pr-1 font-bold">Thời gian thi công/ <span className="italic">Working Period:</span></span>
                        <span className="whitespace-nowrap px-1">Từ/ <span className="italic">From</span></span>
                        <span className="w-16 border-b border-black text-center px-1">{renderField(data.valTimeStart || '', 'valTimeStart', '', 'text-center')}</span>
                        <span className="whitespace-nowrap px-1">giờ/ <span className="italic">phút, ngày/ date</span></span>
                        <span className="w-24 border-b border-black text-center px-1">{renderField(formatDate(data.constructionTimeStart || data.eventDate), 'constructionTimeStart')}</span>
                    </div>
                    <div className="flex items-baseline">
                        <span className="w-48"></span>
                        <span className="whitespace-nowrap px-1">Đến/ <span className="italic">To</span></span>
                        <span className="w-16 border-b border-black text-center px-1">{renderField(data.valTimeEnd || '', 'valTimeEnd', '', 'text-center')}</span>
                        <span className="whitespace-nowrap px-1">giờ/ <span className="italic">phút, ngày/ date</span></span>
                        <span className="w-24 border-b border-black text-center px-1">{renderField(formatDate(data.constructionTimeEnd || data.eventDate), 'constructionTimeEnd')}</span>
                    </div>
                </div>

                {/* Table 1: Work Description */}
                <div className="mb-2">
                    <table className="w-full border-collapse border border-black text-xs">
                        <thead>
                            <tr>
                                <th className="border border-black p-1 text-center w-10">STT<br /><span className="italic font-normal">No</span></th>
                                <th className="border border-black p-1 text-center">Hạng mục thực hiện<br /><span className="italic font-normal">Work Category</span></th>
                                <th className="border border-black p-1 text-center w-24">Bắt đầu<br /><span className="italic font-normal">Start</span></th>
                                <th className="border border-black p-1 text-center w-24">Kết thúc<br /><span className="italic font-normal">End</span></th>
                                <th className="border border-black p-1 text-center w-32">Ghi chú<br /><span className="italic font-normal">Note</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                const minRows = 8;
                                const items = data.workItems && data.workItems.length > 0 ? data.workItems : [];
                                const rowsToRender = [...items];
                                while (rowsToRender.length < minRows) {
                                    rowsToRender.push({});
                                }
                                return rowsToRender.map((item, index) => {
                                    const workItem = item || {};
                                    return (
                                        <tr key={index}>
                                            <td className="border border-black p-1 text-center h-6">{index + 1}</td>
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

                {/* Document Checklist Header */}
                <div className="mb-1 text-xs italic font-bold">
                    Vui lòng cung cấp đầy đủ các tài liệu sau cùng đơn đăng ký này/ Please provide the below documents with this form upon the submission.
                </div>

                {/* Table 2: Documents (Part 1) */}
                <div className="mb-2">
                    <table className="w-full border-collapse border border-black text-xs">
                        <thead>
                            <tr>
                                <th className="border border-black p-1 text-center w-10">STT</th>
                                <th className="border border-black p-1 text-center">Tài liệu / Documents</th>
                                <th className="border border-black p-1 text-center w-16">Có / Yes</th>
                                <th className="border border-black p-1 text-center w-32">Ghi chú / Note</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border border-black p-1 text-center">1</td>
                                <td className="border border-black p-1">Giấy cam kết thi công/ <span className="italic">Letter of Undertaking (01 original)</span></td>
                                <td className="border border-black p-1"></td>
                                <td className="border border-black p-1"></td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-center">2</td>
                                <td className="border border-black p-1">Phạt hành chính về việc vi phạm các quy định và nội quy tại Tòa nhà Cộng Hòa Garden ( 01 bản )</td>
                                <td className="border border-black p-1"></td>
                                <td className="border border-black p-1"></td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-center">3</td>
                                <td className="border border-black p-1">Đăng ký danh sách công nhân thi công (01 bản)/ <span className="italic">Registration for fitting - out workers (01 copy)</span></td>
                                <td className="border border-black p-1"></td>
                                <td className="border border-black p-1"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ================= PAGE 2 ================= */}
            <div className="max-w-[210mm] print:max-w-none mx-auto print:mx-0 px-8 print:px-0 pb-4 pt-4 relative print:break-before-page" style={{ pageBreakBefore: 'always' }}>
                <Header />

                {/* Table 2: Documents (Part 2) */}
                <div className="mb-4">
                    <table className="w-full border-collapse border border-black text-xs">
                        <tbody>
                            <tr>
                                <td className="border border-black p-1 text-center w-10">4</td>
                                <td className="border border-black p-1">Bộ bản vẽ thi công có chữ ký của Khách hàng + Nhà thầu (03 bản)/ <span className="italic">Drawings with owner’s signature + contractor’s signature (3 copies)</span></td>
                                <td className="border border-black p-1 w-16"></td>
                                <td className="border border-black p-1 w-32"></td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-center">5</td>
                                <td className="border border-black p-1">Phiếu đăng ký di chuyển tài sản/ <span className="italic">Equipment/Goods moving application form</span></td>
                                <td className="border border-black p-1"></td>
                                <td className="border border-black p-1"></td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-center">6</td>
                                <td className="border border-black p-1">Văn Bản Khác/ <span className="italic">Other</span></td>
                                <td className="border border-black p-1"></td>
                                <td className="border border-black p-1"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Declaration Section */}
                <div className="text-xs text-justify">
                    <h3 className="font-bold uppercase mb-2">PHẦN KHAI & THỎA THUẬN CỦA CHỦ NHÀ & NHÀ THẦU/ DECLARATION OF OWNER & CONTRACTORS</h3>

                    <ol className="list-decimal pl-4 space-y-2">
                        <li>
                            Chúng tôi sẽ thanh toán một khoản ĐẶT CỌC THI CÔNG NỘI THẤT Cho các Phần I Quy trình thiết kế và thi công. Mục 4 Chi Phí Thi Công Hoặc 4.1 Chi phí đặt cọc thi công với số tiền như sau:<br />
                            <ul className="list-disc pl-6 mt-1 mb-1">
                                <li>Đăng ký mới: 220.000 VNĐ/m²</li>
                                <li>Đăng ký lại: 50.000.000 VNĐ</li>
                            </ul>
                            Ban Quản lý Tòa nhà xác nhận đảm bảo việc đơn vị thực hiện mọi chi phí bồi thường sửa chữa các sự cố sửa chữa những thiệt hại (nếu có) xảy ra do việc thi công trong phạm vi Dự Án. Chi phí sửa chữa/thiệt hại này, nếu xảy ra, sẽ không giới hạn trong khoản Ký quỹ trên (tùy theo mức độ thiệt hại thực tế).<br />
                            <span className="italic">We would issue a refundable FITTING OUT DEPOSIT of</span>
                            <ul className="list-disc pl-6 mt-1 mb-1 italic">
                                <li>220.000 VNĐ/m²</li>
                                <li>50.000.000 VNĐ</li>
                            </ul>
                            <span className="italic">To Property Management to ensure the proper disposal of debris and making good of any damage of any common/commercial factors during Decoration/ Fit-Out Work. The damages, if occurred, will not be limited to this amount and shall be according to actual restoration/ repair cost.</span>
                        </li>
                        <li>
                            Chúng tôi nhất trí rằng trong trường hợp công việc đang thi công không có xác duyệt trước của Người Quản Lý, hoặc có chứng minh cho thấy là công việc trái phép, hoặc vi phạm các điều khoản trong Quy Định Hoàn Thiện và Trang trí nội thất/ hoặc Quy Định của Dự Án, thì Người Quản Lý hoàn toàn có quyền cho ngưng thi công và yêu cầu Nhà Thầu/ Nhà trang trí nội thất phải tháo dỡ các hạng mục đã thi công. Trong thời gian thi công, Ban Quản lý Tòa nhà có nghĩa vụ chứng kiến việc giám sát thi công.<br />
                            <span className="italic">We agree that the Manager can investigate any work and require the contractor/ decorator to leave the development at any time should they be found to be carrying out any works not approved by the Manager or should they be found in breach of any laws, the provision of the building Handbook and/or Rules & Regulations in respect of the building.</span>
                        </li>
                        <li>
                            Chúng tôi sẽ cung cấp bản vẽ mặt bằng, chi tiết, cắt dọc, sơ đồ điện... cho Người Quản Lý xét duyệt trước khi khởi công (cho phép 03 - 07 ngày làm việc).<br />
                            <span className="italic">We shall submit detailed plans, section, schematics, and drawings to the Manager for approval prior to the commencement of work (allow up to seven 03 - 07 working days).</span>
                        </li>
                        <li>
                            Chúng tôi cam kết chỉ thuê thợ điện và thợ ống nước có chứng chỉ và đăng ký cho bất kỳ công việc liên quan đến lắp đặt điện và đường ống nước. Chúng tôi hiểu rằng bất kỳ việc đấu nối điện và nước trái phép vào hệ thống cung cấp tham quan không hợp lệ hoặc bất cứ sự sai sót nào trong việc thi công gây hậu quả nghiêm trọng cho Tòa nhà. Chúng tôi đồng ý chịu trách nhiệm bồi thường cho các khoản chi phí sửa chữa và khắc phục các sự cố phát sinh do vi phạm các quy định của Tòa nhà. Người Quản Lý và Nhân viên Bảo vệ có quyền kiểm tra mọi việc thi công. Đang diễn ra (kể cả nơi duyệt trước hay không) trong thời gian hay nơi làm việc/ nghỉ được duyệt.<br />
                            <span className="italic">We shall employ only certified and registered electricians and plumbers for any works involving electrical and plumbing installations. We understand that any unauthorized tapping/ connection of electrical power, plumbing & drainage pipe or improper disposal of decoration debris at public areas are in breach of the fit out rules and regulations. We agree to be responsible to any cost incurred of necessary measures and checking arising from an act contrary to the Fit-out Rules and Regulations. The Manager and the security officers have the right to enter all premises, particularly during fit-out period, to check that addition and alteration works being undertaken have prior approval and also conform to the approved plans.</span>
                        </li>
                    </ol>
                </div>
            </div>

            {/* ================= PAGE 3 ================= */}
            <div className="max-w-[210mm] print:max-w-none mx-auto print:mx-0 px-8 print:px-0 pb-4 pt-4 relative print:break-before-page" style={{ pageBreakBefore: 'always' }}>
                <Header />

                {/* Terms Continued */}
                <div className="text-xs text-justify mb-4">
                    <ol className="list-decimal pl-4 space-y-2" start="5">
                        <li>
                            Việc thi công chỉ được thực hiện trong thời gian từ 8:30 - 11:30 sáng và 13:30 đến 17:00 chiều từ Thứ Hai đến Thứ Sáu (trừ các ngày Lễ & Tết).<br />
                            <span className="italic">The work should be carried out from 8:30 - 11:30 and from 1:30PM to 5:00PM from Monday to Friday (except Public Holiday).</span>
                        </li>
                        <li>
                            Công nhân phải đăng ký tại Phòng Quản Lý hoặc Ban Bảo Vệ vào mỗi ngày bắt đầu thi công. Công nhân phải xuất trình thẻ ra vào, thẻ thi công cho các bộ phận kiểm soát hoặc nhân viên Tòa nhà khi được yêu cầu.<br />
                            <span className="italic">Workers must register at the Management Office or Security Office daily for Work Permit. Worker must present the Work Permit at all times while on the development if asked. You must return to required to be returned to Security Office before leaving the development.</span>
                        </li>
                        <li>
                            Đối với Thẻ Thi Công bị mất hoặc thất lạc, phí làm lại Thẻ là 100.000 VNĐ/1 thẻ.<br />
                            <span className="italic">For replacement of a lost Work Access Card, a handling charge of VND 100,000 for each card is payable.</span>
                        </li>
                    </ol>
                </div>

                {/* Site Requirements */}
                <div className="text-xs text-justify">
                    <h3 className="font-bold uppercase mb-2 underline">YÊU CẦU TẠI KHU VỰC THI CÔNG/ SITE REQUIREMENTS</h3>
                    <ol className="list-decimal pl-4 space-y-2">
                        <li>
                            Những khu vực công cộng như hành lang, thang máy, và cầu thang bộ phải được dọn dẹp sạch sẽ. Không được sử dụng khu vực chung như sảnh thang máy, và cầu thang bộ để thi công (trừ việc dùng cho công việc chuyển).<br />
                            <span className="italic">Protection work must first be erected/ installed for the common area facilities such as lift lobbies and staircase. Common areas can not be used by the contractor to spread/ occupy or carrying out work.</span>
                        </li>
                        <li>
                            Việc sử dụng thang vận chuyển để vận chuyển vật liệu và rác phế thải phải theo hướng dẫn của Người Quản Lý (Sử dụng thang đúng tải vận chuyển).<br />
                            <span className="italic">Usage of lift for delivery of material or debris removal must follow the instructions of the Manager strictly.</span>
                        </li>
                        <li>
                            Mọi nguyên vật liệu và phế liệu trong quá trình trang trí/ lắp đặt nội thất phải được bao bọc kỹ và di dời ra khỏi khuôn viên dự án.<br />
                            <span className="italic">All renovation/ fit-out materials and waste must be removed out immediately.</span>
                        </li>
                        <li>
                            Không được đổ xà bần, phế liệu và rác thải vào đường ống nước. Nhà thầu sẽ phải chịu mọi trách nhiệm sửa chữa đường ống khi xảy ra tắc nghẽn.<br />
                            <span className="italic">Construction concrete, materials and waste should never be poured into the drain pipe. The contractor will be responsible for any necessary repair if the drain pipes were found blocked.</span>
                        </li>
                        <li>
                            Nhà thầu/ nhà trang trí nội thất chịu mọi trách nhiệm đối với mọi hành vi, thái độ và sự cẩn trọng của công nhân của họ đang thi công tại căn hộ, và phải đảm bảo không gây phiền toái cho các cư dân khác. Nhà thầu hoàn toàn chịu trách nhiệm đối với mọi hành vi không đúng đắn và cẩu thả của công nhân và việc gây ra hư hỏng, tổn thất, thiệt hại hoặc gây thương tích cho bất cứ người nào trong quá trình thực hiện thi công trong tòa nhà.<br />
                            <span className="italic">The contractor/ decorator are responsible for the conduct of their workers and must ensure the workers do not cause any nuisance to the other residents. The contractor is fully responsible for any misconduct and carelessness of the workers or resulting in damage, inconvenience, and injury to any person during the course of fit out work.</span>
                        </li>
                        <li>
                            Mọi công nhân phải mặc đồng phục, mang giày và có Thẻ Tên/mã số khi ở khu làm việc.<br />
                            <span className="italic">Workers must wear proper clothes and proper footwear and Contractor Card at all times.</span>
                        </li>
                        <li>
                            Cấm mọi hình thức quảng cáo, tiếp thị trong Tòa nhà.<br />
                            <span className="italic">No advertising leaflets are allowed to be distributed in the development.</span>
                        </li>
                        <li>
                            Người Quản Lý hoặc Nhân viên được chỉ định hoặc Nhân viên bảo vệ có quyền kiểm tra khu vực thi công để xem công việc đang diễn ra để có sự duyệt trước hay không và có phù hợp với kế hoạch đã được duyệt hay không.<br />
                            <span className="italic">The Manager or appointed staff or security guards have the right to enter all premises particularly during the fit-out period, to check that addition and alteration works being undertaken have prior approval and also conform to the approved plans.</span>
                        </li>
                        <li>
                            Trong trường hợp có chứng minh cho thấy công việc đang thi công không có xét duyệt trước từ Người Quản Lý, là trái phép, vi phạm các quy định của Dự Án/ quy tắc ứng xử/ các quy định liên quan khác trong sổ tay hướng dẫn cho Khách thuê, thì Người Quản Lý hoàn toàn có quyền cho ngưng việc thi công và yêu cầu Nhà thầu/ Nhà trang trí nội thất rời khỏi khu vực thi công ngay lập tức.<br />
                            <span className="italic">The Manager reserves the rights to stop any work and require the decorator/ contractor to leave the development at any time should they be found to be carrying out any works not approved by the Manager or should they be found in breach of any laws, the provisions of the building Handbook and/or Rules & Regulations in respect of the building.</span>
                        </li>
                        <li>
                            Mặc dù được Ban Quản lý, Quản lý Tòa nhà ban hành/ xem xét các Bản Bản Quản lý phê duyệt, Quý chủ sở hữu vẫn chịu trách nhiệm hoàn toàn về thiết kế và quá trình thi công, bao gồm cả chất lượng, tiến trình thực hiện và đảm...
                        </li>
                    </ol>
                </div>
            </div>

            {/* ================= PAGE 4 ================= */}
            <div className="max-w-[210mm] print:max-w-none mx-auto print:mx-0 px-8 print:px-0 pb-4 pt-4 relative print:break-before-page" style={{ pageBreakBefore: 'always' }}>
                <Header />

                {/* Final Terms & Signatures */}
                <div className="text-xs text-justify">
                    <p className="mb-4 italic">
                        ...bảo an toàn đối với tất cả các vật tư và trang thiết bị lắp đặt sẵn trong căn hộ.<br />
                        <span className="italic">Despite having the approval of Management Office/ Building manager on Management Board's representative, owners remain fully responsible for designs and construction process, included both quality and operational procedure, and ensuring safety for all the supplies and equipment available/ installed in the apartment.</span>
                    </p>

                    <p className="mb-8 font-bold italic">
                        Chúng tôi đã đọc, hiểu và hoàn toàn tuân theo tất cả nội quy và quy định của Tòa nhà và quy định về hoàn thiện và trang trí nội thất của Phòng Quản Lý.<br />
                        <span className="font-normal">We have read, fully understand and agree to observe and comply with all rules, regulations and fit-out regulations set by the Management Office.</span>
                    </p>

                    {/* Signatures */}
                    <div className="flex justify-between text-center">
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
        </div>
    );
};

export default DecorationFitOutPermit;
