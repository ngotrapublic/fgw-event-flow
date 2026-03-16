import React from 'react';
import EditableField from './EditableField';

const PenaltyForViolation = ({ data }) => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();

    const Header = () => (
        <div className="mb-2">
            <img src="/assets/forms/header-full-v3.jpg" alt="Header" className="w-full object-contain" />
        </div>
    );

    return (
        <div className="text-black leading-snug bg-white text-sm print-break-before" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
            <div className="max-w-[210mm] print:max-w-none mx-auto print:mx-0 px-8 print:px-0 pb-8 pt-0 relative">
                <Header />

                {/* Form Number */}
                <div className="mb-4">
                    <div className="border border-black px-4 py-1 font-bold whitespace-nowrap inline-block text-xs">
                        MẪU / FORM: 14
                    </div>
                </div>

                {/* Title */}
                <div className="text-center mb-4">
                    <h1 className="text-base font-bold uppercase leading-tight">PHẠT HÀNH CHÍNH VỀ VIỆC VI PHẠM CÁC QUY ĐỊNH</h1>
                    <h1 className="text-base font-bold uppercase leading-tight">VÀ NỘI QUY TẠI TÒA NHÀ CỘNG HÒA GARDEN</h1>
                </div>

                {/* Table */}
                <table className="w-full border-collapse border border-black text-[10px]">
                    <thead>
                        <tr>
                            <th className="border border-black p-[2px] text-center w-8 font-bold">STT</th>
                            <th className="border border-black p-[2px] text-center font-bold">DIỄN GIẢI</th>
                            <th className="border border-black p-[2px] text-center font-bold w-[45%]">HÌNH THỨC XỬ LÝ VI PHẠM</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Working Hours Row */}
                        <tr>
                            <td className="border border-black p-[2px] text-center"></td>
                            <td className="border border-black p-[2px] text-center">Giờ làm việc :</td>
                            <td className="border border-black p-[2px]">
                                <div>Thứ 2 – thứ 6 :08:00 – 12:00 & 13:00 -17:00</div>
                                <div>Thứ 7 :08:00 – 12:00 Không thi công gây ồn.</div>
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-black p-[2px] text-center"></td>
                            <td className="border border-black p-[2px] text-center">Công việc làm ồn :</td>
                            <td className="border border-black p-[2px]">
                                <div>Thứ 2 – thứ 6 :09:00 – 12:00 & 14:00 -17:00</div>
                                <div>Thứ 7,CN, Lễ :Không được thi công.</div>
                            </td>
                        </tr>

                        {/* Violations */}
                        <tr>
                            <td className="border border-black p-[2px] text-center">1</td>
                            <td className="border border-black p-[2px]">Không đeo “Thẻ nhà thầu” trong phạm vi Tòa nhà</td>
                            <td className="border border-black p-[2px]">
                                <div>Lần 1: Nhắc nhở;</div>
                                <div>Lần 2: Sẽ bị trục xuất khỏi Tòa nhà.</div>
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-black p-[2px] text-center">2</td>
                            <td className="border border-black p-[2px]">Hút thuốc lá trong Tòa nhà</td>
                            <td className="border border-black p-[2px]">200.000VNĐ cho mỗi vi phạm.</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-[2px] text-center">3</td>
                            <td className="border border-black p-[2px]">Sử dụng thang máy không đúng mục đích</td>
                            <td className="border border-black p-[2px]">300.000VNĐ cho mỗi vi phạm.</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-[2px] text-center">4</td>
                            <td className="border border-black p-[2px]">Đi vệ sinh không đúng nơi quy định</td>
                            <td className="border border-black p-[2px]">
                                <div>Lần 1: 500.000VNĐ cho mỗi vi phạm;</div>
                                <div>Lần 2: Sẽ bị trục xuất khỏi Tòa nhà.</div>
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-black p-[2px] text-center">5</td>
                            <td className="border border-black p-[2px]">Vi phạm vệ sinh Tòa nhà: Xả rác trong khu vực công cộng, không vệ sinh/thu gom rác tại nơi làm việc sạch sẽ trước khi rời khỏi Tòa nhà</td>
                            <td className="border border-black p-[2px]">
                                <div>1.000.000VNĐ cho mỗi vi phạm;</div>
                                <div>Phải trả thêm mọi chi phí vận chuyển rác phát sinh do phải nhờ nhà thầu vệ sinh bên ngoài.</div>
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-black p-[2px] text-center">6</td>
                            <td className="border border-black p-[2px]">Việc hoàn thiện và trang trí nội thất không được che chắn cẩn thận gây ra bụi trong Tòa nhà</td>
                            <td className="border border-black p-[2px]">
                                <div>1.000.000VNĐ cho mỗi vi phạm;</div>
                                <div>Nhà thầu phải ngưng thi công cho đến khi che chắn cẩn thận khu vực thi công.</div>
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-black p-[2px] text-center">7</td>
                            <td className="border border-black p-[2px]">Gây tiếng động ngoài thời gian quy định mà chưa được sự chấp thuận từ Ban Quản lý Tòa nhà</td>
                            <td className="border border-black p-[2px]">
                                <div>2.000.000VNĐ cho mỗi vi phạm;</div>
                                <div>Nhà thầu phải ngưng thi công việc ngay lập tức.</div>
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-black p-[2px] text-center">8</td>
                            <td className="border border-black p-[2px]">Vi phạm các quy định về PCCC</td>
                            <td className="border border-black p-[2px]">
                                <div>2.000.000VNĐ cho mỗi vi phạm;</div>
                                <div>Tùy theo tính chất nghiêm trọng của sự việc, nhà thầu sẽ bị đình chỉ thi công.</div>
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-black p-[2px] text-center">9</td>
                            <td className="border border-black p-[2px]">Gây trầy xước nền đá, sàn thang máy, buồng thang máy, làm dơ, hư hại các tiện ích chung của Tòa nhà</td>
                            <td className="border border-black p-[2px]">
                                <div>2.000.000VNĐ cho mỗi vi phạm;</div>
                                <div>Nhà thầu phải trả thêm các chi phí sửa chữa và vệ sinh phát sinh.</div>
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-black p-[2px] text-center">10</td>
                            <td className="border border-black p-[2px]">Thi công hoàn thiện và trang trí nội thất ngoài giờ quy định mà không có sự chấp thuận từ Ban Quản lý Tòa nhà.</td>
                            <td className="border border-black p-[2px]">
                                <div>1.000.000VNĐ cho mỗi vi phạm;</div>
                                <div>Nhà thầu phải ngưng thi công việc ngay lập tức cho đến khi có được sự chấp thuận của Ban Quản lý Tòa nhà.</div>
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-black p-[2px] text-center">11</td>
                            <td className="border border-black p-[2px]">Vi phạm liên quan đến cấu trúc Tòa nhà</td>
                            <td className="border border-black p-[2px]">5.000.000VNĐ hoặc 10.000.000VNĐ cho mỗi vi phạm.</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-[2px] text-center">12</td>
                            <td className="border border-black p-[2px]">Kích hoạt hệ thống báo cháy Tòa nhà đến phòng kiểm soát trung tâm hoặc toàn Tòa nhà</td>
                            <td className="border border-black p-[2px]">2.000.000VNĐ hoặc 5.000.000VNĐ cho mỗi vi phạm.</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-[2px] text-center">13</td>
                            <td className="border border-black p-[2px]">Tự ý sử dụng nguồn điện công cộng trong Tòa nhà</td>
                            <td className="border border-black p-[2px]">2.000.000VNĐ hoặc 5.000.000VNĐ cho mỗi vi phạm.</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-[2px] text-center">14</td>
                            <td className="border border-black p-[2px]">Tự ý di dời intercom mà chưa được sự phê duyệt đồng ý của Ban Quản lý Tòa nhà</td>
                            <td className="border border-black p-[2px]">2.000.000VNĐ hoặc 5.000.000VNĐ cho mỗi vi phạm.</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-[2px] text-center">15</td>
                            <td className="border border-black p-[2px]">Những vi phạm khác</td>
                            <td className="border border-black p-[2px]">Tùy theo tính chất và mức độ vi phạm.</td>
                        </tr>
                    </tbody>
                </table>

                {/* Footer Note */}
                <div className="mt-4 text-justify text-[10px] italic mb-4">
                    Chúng tôi đã đọc và tuân thủ tất cả các hình thức xử lý vi phạm hành chính trên của Tòa nhà. Chúng tôi sẽ tuân thủ tất cả các quy định của Tòa nhà Cộng Hòa Garden và Ban Quản lý Tòa nhà có thẩm quyền ngăn cấm hoặc yêu cầu bồi thường đối với các hành động không tuân thủ trong Tòa nhà.
                </div>

                {/* Signatures */}
                <div className="flex justify-between px-4 mt-6">
                    <div className="text-center">
                        <h4 className="font-bold text-xs uppercase">Nhà thầu/ <span className="italic">Contractor</span></h4>
                        <p className="italic text-[10px]">(Ký tên và đóng dấu / Signature & Stamp)</p>
                        <div className="h-20"></div>
                        <div className="flex items-end justify-center text-xs whitespace-nowrap">
                            <span>Ngày/Date: </span>
                            <span className="border-b border-black min-w-[60px] mx-1">
                                <EditableField
                                    isInline={true}
                                    value={data.signDateContractor || `${day}/${month}/${year}`}
                                    onChange={(val) => onUpdate && onUpdate('signDateContractor', val)}
                                    className="text-center w-full"
                                />
                            </span>
                        </div>
                    </div>
                    <div className="text-center">
                        <h4 className="font-bold text-xs uppercase">Xác nhận của Khách thuê/ <span className="italic">Confirmed by Tenant</span></h4>
                        <p className="italic text-[10px]">(Ký tên và đóng dấu / Signature & Stamp)</p>
                        <div className="h-20"></div>
                        <div className="flex items-end justify-center text-xs whitespace-nowrap">
                            <span>Ngày/Date: </span>
                            <span className="border-b border-black min-w-[60px] mx-1">
                                <EditableField
                                    isInline={true}
                                    value={data.signDateTenant || `${day}/${month}/${year}`}
                                    onChange={(val) => onUpdate && onUpdate('signDateTenant', val)}
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

export default PenaltyForViolation;
