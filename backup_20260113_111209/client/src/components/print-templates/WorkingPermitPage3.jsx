import React from 'react';
import EditableField from './EditableField';

const WorkingPermitPage3 = ({ data, onUpdate }) => {
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
        <div className="max-w-[210mm] print:max-w-none mx-auto print:mx-0 px-8 print:px-0 pb-4 pt-4 relative bg-white">
            <Header />

            <div className="text-xs text-justify">
                <ol className="list-decimal pl-4 space-y-2" start="10">
                    <li value="10">
                        Chi phí giám sát làm việc ngoài giờ ngày Chủ Nhật (chưa VAT): <b>120.000 VNĐ/giờ/m²</b>./ <span className="italic">Fee for over time working supervisor on Sunday: <b>120.000 VND/ hour/m²</b> (not included VAT)</span>
                    </li>
                </ol>

                <p className="mt-4 font-bold italic">
                    * Chúng tôi đã đọc, hiểu rõ và đồng ý với các điều khoản trong mục tóm tắt nội quy./ We are agreed to the terms in this summary.
                </p>
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
    );
};

export default WorkingPermitPage3;
