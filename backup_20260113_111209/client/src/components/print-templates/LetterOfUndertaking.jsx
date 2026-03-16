import React from 'react';
import EditableField from './EditableField';

const LetterOfUndertaking = ({ data, onUpdate }) => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return ''; // Handle invalid dates safely
        return date.toLocaleDateString('en-GB'); // DD/MM/YYYY
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

    return (
        <>
            <style>{`
                #letter-of-undertaking {
                    font-family: "Times New Roman", Times, serif;
                    max-width: 210mm;
                    margin: 0 auto;
                    padding: 0 2rem 2rem 2rem;
                    background: white;
                    font-size: 0.875rem;
                    line-height: 1.375;
                    color: black;
                }
                
                @media print {
                    /* Force ZERO margins from browser */
                    @page {
                        size: A4 portrait;
                        margin: 0;
                    }
                    
                    html, body {
                        width: 100% !important;
                        height: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    
                    /* Reset container - use 100% instead of 210mm */
                    #letter-of-undertaking {
                        max-width: 100% !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 10mm 15mm !important;
                        box-sizing: border-box !important;
                    }
                    
                    /* Prevent ALL child elements from overflowing */
                    #letter-of-undertaking * {
                        max-width: 100% !important;
                        box-sizing: border-box !important;
                    }
                    
                    /* Images must not overflow */
                    #letter-of-undertaking img {
                        max-width: 100% !important;
                        width: 100% !important;
                        height: auto !important;
                    }
                    
                    /* Prevent text from creating overflow */
                    #letter-of-undertaking div,
                    #letter-of-undertaking p,
                    #letter-of-undertaking span {
                        max-width: 100% !important;
                        word-wrap: break-word !important;
                        overflow-wrap: break-word !important;
                    }
                }
            `}</style>
            <div id="letter-of-undertaking">
                {/* Header Image */}
                <div className="mb-2">
                    <img src="/assets/forms/header-full-v3.jpg" alt="Header" className="w-full object-contain" />
                </div>

                {/* Title */}
                <div className="flex justify-between items-end mb-6 border-b-2 border-transparent">
                    <div className="border border-black px-4 py-2 font-bold whitespace-nowrap">
                        MẪU / FORM: 01
                    </div>
                    <div className="text-center flex-1">
                        <h1 className="text-2xl font-bold uppercase">GIẤY CAM KẾT</h1>
                        <h2 className="text-lg font-bold italic">LETTER OF UNDERTAKING</h2>
                    </div>
                    <div className="w-32"></div> {/* Spacer for balance */}
                </div>

                {/* Recipient */}
                <div className="mb-4 font-bold">
                    Kính gửi: Văn phòng Ban Quản lý/ <span className="italic">To the Management Office</span>
                </div>

                {/* Form Fields */}
                <div className="space-y-2">
                    <div className="flex items-baseline">
                        <span className="whitespace-nowrap pr-2">Khách thuê/ <span className="italic">Company name:</span></span>
                        <span className="flex-1 border-b border-dotted border-black font-bold uppercase px-2">
                            {renderField(data.tenantName || 'TRUNG TÂM LIÊN KẾT FPT GREENWICH', 'tenantName')}
                        </span>
                    </div>

                    <div className="flex items-baseline">
                        <span className="whitespace-nowrap pr-2">Người đại diện/ <span className="italic">Representatives:</span></span>
                        <span className="flex-1 border-b border-dotted border-black font-bold px-2">{renderField(data.registrantName, 'registrantName')}</span>
                        <span className="whitespace-nowrap px-2">Di động/ <span className="italic">Mobile:</span></span>
                        <span className="w-32 border-b border-dotted border-black px-2">{renderField(data.contactPhone, 'contactPhone')}</span>
                    </div>

                    <div className="flex items-baseline">
                        <span className="whitespace-nowrap pr-2">Khu vực thuê / <span className="italic">Unit no:</span></span>
                        <span className="flex-1 border-b border-dotted border-black font-bold uppercase px-2">
                            {renderField(data.unitNo || 'TẦNG 1, 2, 3 TTTM', 'unitNo')}
                        </span>
                    </div>

                    <div className="flex items-baseline">
                        <span className="whitespace-nowrap pr-2">Nhà thầu thi công/ <span className="italic">Fitting-out Contractor:</span></span>
                        <span className="flex-1 border-b border-dotted border-black font-bold uppercase px-2">
                            {renderField(data.contractorName, 'contractorName', '', 'text-[13px] tracking-tight')}
                        </span>
                    </div>

                    <div className="flex items-baseline">
                        <span className="whitespace-nowrap pr-2">Người đại diện/ <span className="italic">Representatives:</span></span>
                        <span className="flex-1 border-b border-dotted border-black px-2">{renderField(data.contractorRep, 'contractorRep')}</span>
                        <span className="whitespace-nowrap px-2">Di động/ <span className="italic">Mobile:</span></span>
                        <span className="w-32 border-b border-dotted border-black px-2">{renderField(data.contractorPhoneRep, 'contractorPhoneRep')}</span>
                    </div>

                    <div className="flex items-baseline">
                        <span className="whitespace-nowrap pr-2">Từ ngày/ <span className="italic">From:</span></span>
                        <span className="flex-1 border-b border-dotted border-black px-2">
                            {renderField(formatDate(data.constructionTimeStart || data.eventDate), 'constructionTimeStart')}
                        </span>
                        <span className="whitespace-nowrap px-2">Đến ngày/ <span className="italic">To:</span></span>
                        <span className="w-40 border-b border-dotted border-black px-2">
                            {renderField(formatDate(data.constructionTimeEnd || data.eventDate), 'constructionTimeEnd')}
                        </span>
                    </div>
                </div>

                {/* Undertaking Content */}
                <div className="mt-6 mb-2">
                    <h3 className="font-bold mb-2">Chúng tôi cam kết/ <span className="italic">We hereby undertake:</span></h3>

                    <ul className="list-none space-y-2 text-justify">
                        <li className="flex gap-2">
                            <span>➢</span>
                            <span>
                                Tuân thủ đúng các nội quy về An toàn lao động, Vệ sinh môi trường, Phòng cháy chữa cháy, An ninh… trên công trường do Ban Quản lý Tòa nhà đưa ra./ <span className="italic">To comply with all regulations on Labour safety, Environmental sanitation, Fire control, Security etc on site that are laid down by the Management Office.</span>
                            </span>
                        </li>
                        <li className="flex gap-2">
                            <span>➢</span>
                            <span>
                                Phối hợp với Ban Quản lý Tòa nhà cùng giám sát việc thực hiện Nội quy thi công và giải quyết thỏa đáng các trường hợp vi phạm, chịu phạt và bồi thường những thiệt hại do công nhân và nhà thầu của chúng tôi gây ra theo đúng quy định của Ban Quản lý Tòa nhà./ <span className="italic">To co-operate with the Management Office in supervising the observance of the Site Rules and properly settling cases of violation hereof, to pay penalties and compensate for the damages and/or losses caused by our workers and contractors in accordance with the MO’s Rules and Regulations.</span>
                            </span>
                        </li>
                        <li className="flex gap-2">
                            <span>➢</span>
                            <span>
                                Tất cả công nhân của nhà thầu đã được hướng dẫn về An toàn lao động, Phòng cháy chữa cháy trên công trường cũng như đã được phổ biến Nội quy thi công mà Ban Quản lý Tòa nhà đưa ra./ <span className="italic">All workers have been given necessary guidance on labour safety, fire control, and acquainted with the MO’s Rules and Regulations.</span>
                            </span>
                        </li>
                        <li className="flex gap-2">
                            <span>➢</span>
                            <span>
                                Hoàn toàn chịu trách nhiệm trước pháp luật nếu nhà thầu hoặc nhân viên của chúng tôi vi phạm các Nội quy công trường gây thiệt hại cho Chủ đầu tư và Bên thứ 3./ <span className="italic">To be fully responsible before laws for any violation of the Site Rules causing damage to the Landlord or 3rd party or other Clients by our workers or contractors</span>
                            </span>
                        </li>
                    </ul>
                </div>

                {/* Signature */}
                <div className="mt-8 flex justify-end">
                    <div className="text-center">
                        <div className="italic mb-2 text-center whitespace-nowrap">
                            <EditableField
                                isInline={true}
                                value={data.signDateString || `TP. Hồ Chí Minh, ngày ${day} tháng ${month} năm ${year}`}
                                onChange={(val) => onUpdate('signDateString', val)}
                                className="text-center"
                            />
                        </div>
                        <h4 className="font-bold uppercase">Ký tên và đóng dấu</h4>
                        <p className="italic font-bold">Signed & sealed by</p>
                        <div className="h-26"></div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default LetterOfUndertaking;
