import React from 'react';
import { Printer, AlertCircle, CheckCircle2 } from 'lucide-react';

const PrintGuide = () => {
    return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 mb-4">
            <div className="flex items-start gap-4">
                <div className="bg-blue-500 text-white p-3 rounded-full">
                    <Printer size={24} />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-blue-900 mb-2 flex items-center gap-2">
                        <AlertCircle size={20} />
                        Hướng dẫn in đúng chuẩn
                    </h3>
                    <p className="text-blue-800 mb-4 text-sm">
                        Để in form không bị lệch, vui lòng thiết lập như sau:
                    </p>

                    <div className="space-y-3">
                        {/* Step 1 */}
                        <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-100">
                            <div className="flex items-start gap-3">
                                <div className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                                    1
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-800 mb-1">Nhấn nút "In Hồ Sơ"</p>
                                    <p className="text-sm text-gray-600">Hộp thoại in của trình duyệt sẽ xuất hiện</p>
                                </div>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-100">
                            <div className="flex items-start gap-3">
                                <div className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                                    2
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-800 mb-1">Nhấn "More settings" (Tùy chọn khác)</p>
                                </div>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="bg-white rounded-lg p-4 shadow-sm border border-green-200 bg-green-50">
                            <div className="flex items-start gap-3">
                                <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                                    3
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-800 mb-2">Thiết lập 2 mục sau:</p>
                                    <div className="space-y-2 ml-4">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 size={16} className="text-green-600" />
                                            <span className="text-sm">
                                                <strong className="text-gray-800">Margins:</strong>
                                                <code className="mx-1 px-2 py-0.5 bg-green-100 text-green-800 rounded font-mono text-xs">None</code>
                                                (hoặc <code className="mx-1 px-2 py-0.5 bg-green-100 text-green-800 rounded font-mono text-xs">Minimum</code>)
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 size={16} className="text-green-600" />
                                            <span className="text-sm">
                                                <strong className="text-gray-800">Scale:</strong>
                                                <code className="mx-1 px-2 py-0.5 bg-green-100 text-green-800 rounded font-mono text-xs">100</code>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Step 4 */}
                        <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-100">
                            <div className="flex items-start gap-3">
                                <div className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                                    4
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-800 mb-1">Nhấn "Print" (In)</p>
                                    <p className="text-sm text-gray-600">Form sẽ in đúng chuẩn không bị lệch!</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Warning note */}
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-xs text-yellow-800">
                            <strong>⚠️ Lưu ý:</strong> Nếu để <code className="px-1 py-0.5 bg-yellow-100 rounded">Margins: Default</code>,
                            trình duyệt sẽ tự động thu nhỏ nội dung và tạo khoảng trống bên trái.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrintGuide;
