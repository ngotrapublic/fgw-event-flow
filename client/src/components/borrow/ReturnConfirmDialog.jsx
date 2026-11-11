import React from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import AccessibleDialog from './AccessibleDialog';

export default function ReturnConfirmDialog({ request, submitting, onClose, onConfirm }) {
    if (!request) return null;

    return (
        <AccessibleDialog
            open={Boolean(request)}
            onClose={onClose}
            closeDisabled={submitting}
            titleId="confirm-return-dialog-title"
            layeredShadow={true}
        >
            <div className="hidden sm:flex gap-1" aria-hidden="true">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-500 border border-black inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-pink-500 border border-black inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-black inline-block" />
            </div>

            <div
                aria-hidden="true"
                className="w-14 h-14 bg-emerald-100 text-black border-2 border-black rounded-2xl flex items-center justify-center mx-auto shadow-[2px_2px_0_#000]"
            >
                <RotateCcw size={28} strokeWidth={2.5} className="text-emerald-700" />
            </div>

            <div className="text-center space-y-1.5">
                <h2
                    id="confirm-return-dialog-title"
                    className="text-base font-black text-black uppercase tracking-tight"
                >
                    Xác Nhận Báo Trả Thiết Bị
                </h2>
                <p className="text-xs font-bold text-slate-700">
                    Phiếu mượn: <strong className="text-indigo-700 font-mono">#{request.id}</strong>
                </p>
                <div className="p-3 bg-slate-50 border-2 border-slate-300 rounded-2xl text-left text-xs font-medium text-slate-700">
                    Sau khi bấm xác nhận, trạng thái sẽ đổi thành{' '}
                    <strong className="text-black">"Chờ kho kiểm tra"</strong>. Bạn hãy mang toàn
                    bộ thiết bị đến <strong>Phòng IT - Floor 2 - Campus HCM</strong> để kiểm tra và ký nhận.
                </div>
            </div>

            <div className="flex gap-2.5 pt-2">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="w-1/2 min-h-[44px] py-2.5 px-3 bg-white border-2 border-black rounded-xl text-xs font-black shadow-[2px_2px_0_#000] hover:bg-slate-100 transition-colors"
                >
                    Đóng
                </button>

                <button
                    type="button"
                    onClick={onConfirm}
                    disabled={submitting}
                    className="w-1/2 min-h-[44px] py-2.5 px-3 bg-indigo-600 text-white border-2 border-black rounded-xl text-xs font-black shadow-[2px_2px_0_#000] hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5"
                >
                    {submitting ? (
                        <>
                            <Loader2 size={14} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                            Đang xử lý...
                        </>
                    ) : (
                        'Xác Nhận Báo Trả'
                    )}
                </button>
            </div>
        </AccessibleDialog>
    );
}

