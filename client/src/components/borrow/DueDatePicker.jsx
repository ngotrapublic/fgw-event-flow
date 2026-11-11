import React, { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';
import { formatVnDueDate, getVnOffsetDateStr } from '../../lib/borrow-utils';

const QUICK_DATE_OPTIONS = [
    { days: 1, label: 'Ngày mai (+1d)' },
    { days: 2, label: '2 ngày (+2d)' },
    { days: 3, label: '3 ngày (+3d)' },
    { days: 7, label: '1 tuần (+7d)' }
];

const DueDatePicker = forwardRef(function DueDatePicker(
    { dueDate, minDate, maxDate, error, onChangeDueDate, onQuickSelect },
    ref
) {
    return (
        <div className="space-y-4">
            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <label
                        htmlFor="borrow-due-date"
                        className="text-xs font-black uppercase tracking-wider text-slate-700"
                    >
                        Ngày hẹn trả thiết bị <span className="text-rose-600">*</span>
                    </label>
                    <span className="text-xs font-bold text-indigo-700">Chọn nhanh:</span>
                </div>

                <div className="flex items-center gap-2 mb-2.5 overflow-x-auto pb-1 text-xs font-bold">
                    {QUICK_DATE_OPTIONS.map((opt) => {
                        const active = dueDate === getVnOffsetDateStr(opt.days);
                        return (
                            <button
                                key={opt.days}
                                type="button"
                                onClick={() => onQuickSelect(opt.days)}
                                aria-pressed={active}
                                className={`min-h-[44px] px-3.5 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0_#000] whitespace-nowrap transition-colors ${
                                    active
                                        ? 'bg-yellow-300 text-black font-black'
                                        : 'bg-white text-slate-800 hover:bg-slate-50'
                                }`}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>

                <input
                    ref={ref}
                    id="borrow-due-date"
                    name="dueDate"
                    type="date"
                    required
                    aria-required="true"
                    aria-invalid={Boolean(error)}
                    aria-describedby={
                        error ? 'borrow-due-error borrow-due-preview' : 'borrow-due-preview'
                    }
                    min={minDate}
                    max={maxDate}
                    value={dueDate}
                    onChange={(e) => onChangeDueDate(e.target.value)}
                    className={`w-full h-11 px-3.5 text-sm font-bold border-2 rounded-xl bg-white shadow-[3px_3px_0_#000] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 transition-all cursor-pointer ${
                        error ? 'border-rose-600 bg-rose-50' : 'border-black'
                    }`}
                />
                {error && (
                    <p id="borrow-due-error" role="alert" className="text-xs font-bold text-rose-700 mt-1.5">
                        {error}
                    </p>
                )}
                {dueDate && (
                    <p id="borrow-due-preview" className="text-xs font-medium text-slate-600 mt-1.5">
                        Hạn trả dự kiến: <strong>{formatVnDueDate(dueDate)}</strong>
                    </p>
                )}
            </div>

            <div className="p-3 bg-amber-50 border-2 border-black/25 rounded-2xl text-xs font-medium text-slate-700 flex items-start gap-2">
                <AlertCircle size={15} className="text-amber-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                    Gửi yêu cầu không đồng nghĩa đã giữ thiết bị — kho chỉ giữ thiết bị sau khi Quản trị viên duyệt.
                </span>
            </div>
        </div>
    );
});

export default DueDatePicker;

