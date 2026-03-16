import React from 'react';
import EditableField from './EditableField';

const WorkingPermitPage2 = ({ data, onUpdate }) => {
    const handleArrayUpdate = (arrayName, index, field, value) => {
        if (!onUpdate) return;
        const list = data[arrayName] ? [...data[arrayName]] : [];
        while (list.length <= index) {
            list.push({});
        }
        list[index] = { ...list[index], [field]: value };
        onUpdate(arrayName, list);
    };

    const renderArrayField = (arrayName, index, field, value) => {
        return (
            <EditableField
                value={value}
                onChange={(newValue) => handleArrayUpdate(arrayName, index, field, newValue)}
            />
        );
    };

    const Header = () => (
        <div className="mb-2">
            <img src="/assets/forms/header-full-v3.jpg" alt="Header" className="w-full object-contain" />
        </div>
    );

    return (
        <div className="max-w-[210mm] print:max-w-none mx-auto print:mx-0 px-8 print:px-0 pb-8 pt-8 relative bg-white">
            <Header />

            {/* Table III: Lift Booking */}
            <div className="mb-6">
                <h3 className="font-bold italic mb-1">III. Đăng ký vận chuyển hàng hóa bằng thang máy/ Lift booking form:</h3>
                <table className="w-full border-collapse border border-black text-xs">
                    <thead>
                        <tr>
                            <th rowSpan="2" className="border border-black p-1 text-center w-24">Ngày/ Date</th>
                            <th rowSpan="2" className="border border-black p-1 text-center">Mô tả công việc<br /><span className="italic font-normal">Work Description</span></th>
                            <th colSpan="2" className="border border-black p-1 text-center">Thời gian/ Time</th>
                        </tr>
                        <tr>
                            <th className="border border-black p-1 text-center w-24">Giờ hành chính<br /><span className="italic font-normal">Business hours</span></th>
                            <th className="border border-black p-1 text-center w-24">Ngoài giờ<br /><span className="italic font-normal">Over time</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 5 }).map((_, index) => {
                            const item = (data.liftBookingList && data.liftBookingList[index]) || {};
                            return (
                                <tr key={index}>
                                    <td className="border border-black p-1 min-h-6">{renderArrayField('liftBookingList', index, 'date', item.date)}</td>
                                    <td className="border border-black p-1">{renderArrayField('liftBookingList', index, 'description', item.description)}</td>
                                    <td className="border border-black p-1">{renderArrayField('liftBookingList', index, 'businessHours', item.businessHours)}</td>
                                    <td className="border border-black p-1">{renderArrayField('liftBookingList', index, 'overtime', item.overtime)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Rules Summary */}
            <div className="text-xs text-justify">
                <h3 className="font-bold mb-2">Tóm tắt nội quy/ Summary:</h3>
                <ol className="list-decimal pl-4 space-y-2">
                    <li>
                        Thời gian thi công: Thứ Hai – Thứ Sáu: 8:30 – 12:00, 13:00 – 17:30; Thứ Bảy: 9:00 – 12:00 (Thi công không gây ồn)./ <span className="italic">Working time: Monday – Friday: 8:30 - 12:00, 13:00 – 17:30; Saturday: 9:00 – 12:00 (Noiseless construction)</span><br />
                        Thời gian thi công có tiếng ồn: Thứ Hai – Thứ Sáu: 09:00 – 11:00, 15:00 – 17:00; Thứ Bảy – Chủ Nhật – Lễ: Không được thi công./ <span className="italic">Working time with noise: Monday – Friday: 09:00 – 11:00; 15:00 – 17:00; Saturday - Sunday - Holiday: Not allowed.</span>
                    </li>
                    <li>
                        Mọi công nhân phải đăng ký tại Bàn Bảo vệ để tạm giao CMND/CCCD và nhận <b>Thẻ Ra Vào</b> mỗi ngày./ <span className="italic">All workers must register at the Security Check Point daily, collect a <b>Worker Pass</b> and hand over an ID card.</span>
                    </li>
                    <li>
                        Mọi công nhân phải đeo <b>Thẻ Ra Vào</b> tại mọi thời điểm thực hiện công việc./ <span className="italic">All workers must display the <b>Worker Pass</b> at all times while on site.</span>
                    </li>
                    <li>
                        <b>Thẻ Ra Vào</b> phải được giao lại cho Bàn Bảo vệ trước khi rời khỏi Tòa nhà. <span className="italic">Worker Pass must be returned to the Security Check Point before leaving the development.</span>
                    </li>
                    <li>
                        Mọi công nhân phải tuân thủ tất cả điều lệ và nội quy nêu rõ ở Mẫu đơn đăng ký thi công Trang trí / Lắp đặt nội thất và quy định của Tòa nhà./ <span className="italic">All workers must follow the rules and requirements as per the Undertaking for Decoration Fit-out form and building rules & regulation.</span>
                    </li>
                    <li>
                        Đối với <b>Thẻ Ra Vào</b> bị mất hoặc thất lạc, phí làm lại Thẻ là 100.000 VNĐ/1 thẻ./ <span className="italic">For replacement of a lost Work Access Pass, a handling charge of VND 100.000 for each card is payable.</span>
                    </li>
                    <li>
                        Phí sử dụng điều hoà ngoài giờ là: Diện tích &lt;300m²: 420.000 VNĐ/giờ, diện tích từ &gt;300m² đến &lt;600m²: 550.000 VNĐ/giờ, diện tích từ &gt;600m²: 700.000 VNĐ/giờ (chưa tính VAT). Riêng ngày Chủ Nhật phải tối thiểu 4 Giờ làm Việc/Khách Thuê/Tầng. Chi phí này được tính làm tròn theo đơn vị giờ. Điều hoà cung cấp ngoài giờ với nhu cầu ít nhất hai (2) giờ đồng hồ, và nhiều nhất trong năm (5) giờ đồng hồ trong ngày làm việc bình thường./ <span className="italic">Overtime air conditioning service is: Square meter &lt;300m2: 420.000VND/hour, square meter is from &gt;300 m² to &lt;600 m²: 550.000VND/hour, Square meter is from &gt;600 m²: 700.000VND/hour (exclusive VAT). Particularly on Sundays, the minimum time is not less than 4 hours/Unit. The charge will be assessed in hourly increments. Air condition will be provided minimum two (2) hours and maximum for five (5) hours in office working days.</span>
                    </li>
                    <li>
                        Phí vận chuyển hàng hóa bằng thang máy sau 20h là 70.000 VNĐ/Giờ (chưa tính VAT). Phí áp dụng cho ngày Chủ Nhật là 110.000 VNĐ/Giờ (chưa tính VAT)./ <span className="italic">Fee for using service lift after 20h in office working days is 70.000 VND/hour (not inclued VAT). Fee for Sunday is 110.000 VND/hour (not inclued VAT).</span>
                    </li>
                    <li>
                        Chi phí giám sát làm việc ngoài giờ (chưa VAT): (sau 19h từ thứ Hai Đến thứ Sáu; sau 12h thứ Bảy): <b>50.000 VNĐ/giờ/m²</b> / <span className="italic">Fee for over time working supervisor (after 19h from Monday to Friday; after 12h Saturday): <b>50.000 VND/ hour/m²</b> (not included VAT)</span>
                    </li>
                </ol>
            </div>
        </div>
    );
};

export default WorkingPermitPage2;
