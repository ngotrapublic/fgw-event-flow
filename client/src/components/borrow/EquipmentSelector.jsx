import React from 'react';
import { AlertCircle, Check, Loader2, Minus, Plus, RefreshCw } from 'lucide-react';

export default function EquipmentSelector({
    categories,
    selectedCategory,
    onSelectCategory,
    loadingResources,
    resourcesError,
    onRetry,
    filteredResources,
    selectedItems,
    onToggleResource,
    onIncrementQty,
    onDecrementQty,
    itemsError,
    firstButtonRef
}) {
    const firstAvailableIndex = filteredResources.findIndex((r) => r.availableQty > 0);

    return (
        <section
            aria-labelledby="section-equipment-title"
            aria-invalid={Boolean(itemsError)}
            aria-describedby={itemsError ? 'borrow-items-error' : undefined}
            className="bg-white border-2 border-black rounded-3xl p-4 sm:p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4"
        >
            <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                    <span
                        aria-hidden="true"
                        className="w-6 h-6 rounded-lg bg-yellow-300 border-2 border-black font-black text-xs flex items-center justify-center shadow-[1px_1px_0_#000]"
                    >
                        1
                    </span>
                    <h2 id="section-equipment-title" className="text-sm font-black text-black uppercase tracking-wider">
                        Chọn Thiết Bị Cần Dùng <span className="text-rose-600">*</span>
                    </h2>
                </div>
            </div>

            {categories.length > 2 && !loadingResources && !resourcesError && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => onSelectCategory(cat)}
                            aria-pressed={selectedCategory === cat}
                            className={`min-h-[44px] px-3.5 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0_#000] transition-colors whitespace-nowrap ${
                                selectedCategory === cat
                                    ? 'bg-black text-white font-black'
                                    : 'bg-white text-slate-800 hover:bg-slate-100'
                            }`}
                        >
                            {cat === 'all' ? 'Tất cả' : cat}
                        </button>
                    ))}
                </div>
            )}

            {loadingResources ? (
                <div role="status" className="py-10 text-center space-y-2">
                    <Loader2 size={28} className="animate-spin motion-reduce:animate-none text-indigo-600 mx-auto" aria-hidden="true" />
                    <p className="text-xs font-bold text-slate-600">
                        Đang kiểm tra tồn kho thiết bị...
                    </p>
                </div>
            ) : resourcesError ? (
                <div
                    role="alert"
                    className="p-5 bg-rose-50 border-2 border-black rounded-2xl text-center space-y-3"
                >
                    <AlertCircle size={28} className="text-rose-700 mx-auto" aria-hidden="true" />
                    <p className="text-sm font-bold text-rose-950">{resourcesError}</p>
                    <button
                        type="button"
                        onClick={onRetry}
                        className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-black rounded-xl text-xs font-black shadow-[2px_2px_0_#000] hover:bg-slate-100"
                    >
                        <RefreshCw size={14} aria-hidden="true" />
                        Thử lại
                    </button>
                </div>
            ) : filteredResources.length === 0 ? (
                <div className="p-6 text-center text-xs font-bold text-slate-600">
                    Không có thiết bị nào trong phân loại này.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-2.5">
                    {filteredResources.map((res, idx) => {
                        const isAvailable = res.availableQty > 0;
                        const isSelected = Boolean(selectedItems[res.id]);
                        const currentQty = selectedItems[res.id] || 0;
                        const isFirstTarget =
                            idx === firstAvailableIndex || (firstAvailableIndex === -1 && idx === 0);

                        return (
                            <div
                                key={res.id}
                                className={`p-3 rounded-2xl border-2 transition-colors flex items-center justify-between gap-2.5 ${
                                    isSelected
                                        ? 'bg-violet-50 border-black shadow-[3px_3px_0_#000]'
                                        : isAvailable
                                        ? 'bg-white border-slate-300 hover:border-black'
                                        : 'bg-slate-100 border-slate-300'
                                }`}
                            >
                                <button
                                    ref={isFirstTarget ? firstButtonRef : undefined}
                                    type="button"
                                    role="checkbox"
                                    aria-checked={isSelected}
                                    disabled={!isAvailable}
                                    onClick={() => onToggleResource(res.id, res.availableQty)}
                                    className={`min-h-[44px] flex items-center gap-3 flex-1 min-w-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-xl ${
                                        isAvailable ? 'cursor-pointer' : 'cursor-not-allowed'
                                    }`}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`w-6 h-6 rounded-lg border-2 border-black flex items-center justify-center flex-shrink-0 transition-colors shadow-[1px_1px_0_#000] ${
                                            isSelected
                                                ? 'bg-violet-600 text-white'
                                                : isAvailable
                                                ? 'bg-white'
                                                : 'bg-slate-200 border-slate-500'
                                        }`}
                                    >
                                        {isSelected && <Check size={14} strokeWidth={3} />}
                                    </span>

                                    <span className="min-w-0 block flex-1">
                                        <span className="text-sm font-black text-black truncate flex items-center gap-2">
                                            <span className="truncate">{res.label}</span>
                                            {!isAvailable && (
                                                <span className="flex-shrink-0 inline-block px-2 py-0.5 bg-rose-100 text-rose-900 border border-rose-400 rounded-md text-xs font-black">
                                                    Hết hàng
                                                </span>
                                            )}
                                        </span>
                                        <span className="text-xs font-bold text-slate-600 block mt-0.5">
                                            {res.category || 'Thiết bị'} • Còn sẵn:{' '}
                                            <strong className={isAvailable ? 'text-emerald-800' : 'text-rose-700'}>
                                                {res.availableQty}
                                            </strong>
                                        </span>
                                    </span>
                                </button>

                                {isSelected && isAvailable && (
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => onDecrementQty(res.id)}
                                            aria-label={`Giảm số lượng ${res.label}`}
                                            className="w-11 h-11 rounded-xl bg-white border-2 border-black font-black flex items-center justify-center shadow-[2px_2px_0_#000] hover:bg-slate-100 transition-colors"
                                        >
                                            <Minus size={16} strokeWidth={3} aria-hidden="true" />
                                        </button>
                                        <span
                                            aria-label={`Số lượng đã chọn cho ${res.label}: ${currentQty}`}
                                            className="w-10 h-11 flex items-center justify-center font-mono font-black text-sm bg-white border-2 border-black rounded-xl"
                                        >
                                            {currentQty}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => onIncrementQty(res.id, res.availableQty)}
                                            disabled={currentQty >= res.availableQty}
                                            aria-label={`Tăng số lượng ${res.label}`}
                                            className="w-11 h-11 rounded-xl bg-yellow-300 border-2 border-black font-black flex items-center justify-center shadow-[2px_2px_0_#000] hover:bg-yellow-400 transition-colors disabled:opacity-40"
                                        >
                                            <Plus size={16} strokeWidth={3} aria-hidden="true" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {itemsError && (
                <p id="borrow-items-error" role="alert" className="text-xs font-bold text-rose-700">
                    {itemsError}
                </p>
            )}
        </section>
    );
}

