import React from 'react';
import { MapPin } from 'lucide-react';
import AccessibleDialog from './AccessibleDialog';

export default function WarehouseInfoDialog({ open, onClose }) {
    return (
        <AccessibleDialog open={open} onClose={onClose} titleId="warehouse-modal-title">
            <div className="border-b-2 border-slate-100 pb-3 pr-12">
                <h2
                    id="warehouse-modal-title"
                    className="text-base font-black text-black uppercase tracking-tight flex items-center gap-2"
                >
                    <MapPin size={18} className="text-rose-600" aria-hidden="true" />
                    Thông Tin Kho Thiết Bị
                </h2>
            </div>

            <div className="space-y-3 text-xs font-medium text-slate-700">
                <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl space-y-1">
                    <p className="font-bold text-black">Vị trí kho thiết bị:</p>
                    <p className="text-slate-900 font-bold">Phòng IT - Floor 2 - Campus HCM</p>
                    <p className="text-slate-600">Greenwich Việt Nam — Cơ sở TP. Hồ Chí Minh</p>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl space-y-1">
                    <p className="font-bold text-emerald-950">Thời gian mở cửa đón tiếp:</p>
                    <p className="text-emerald-900">Sáng: 08:00 - 11:30</p>
                    <p className="text-emerald-900">Chiều: 13:30 - 17:30</p>
                </div>
            </div>

            <button
                type="button"
                onClick={onClose}
                className="w-full min-h-[44px] py-2.5 bg-black text-white font-black text-xs rounded-xl shadow-[2px_2px_0_#000] hover:bg-slate-800"
            >
                Đã Hiểu
            </button>
        </AccessibleDialog>
    );
}

