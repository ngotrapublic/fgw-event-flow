import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '../../lib/utils';

const MultiSelect = ({ options, value = [], onChange, placeholder = "Select items..." }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Handle clicking outside to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionValue) => {
        const safeValue = Array.isArray(value) ? value : [];
        if (safeValue.includes(optionValue)) {
            onChange(safeValue.filter(v => v !== optionValue));
        } else {
            onChange([...safeValue, optionValue]);
        }
    };

    const removeValue = (e, val) => {
        e.stopPropagation();
        const safeValue = Array.isArray(value) ? value : [];
        onChange(safeValue.filter(v => v !== val));
    };

    const displayValues = Array.isArray(value) ? value : [];

    return (
        <div className="relative group" ref={containerRef}>
            {/* Trigger Button - Neubrutalism */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "min-h-[2.75rem] w-full px-3 py-2 bg-white cursor-pointer flex flex-wrap gap-2 items-center transition-colors duration-150 border-2 rounded-lg",
                    isOpen
                        ? "border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        : "border-slate-200 hover:border-black"
                )}
            >
                {displayValues.length === 0 && (
                    <span className="text-slate-400 text-sm font-medium ml-1">{placeholder}</span>
                )}
                {displayValues.map(val => (
                    <span key={val} className="bg-violet-100 text-violet-700 border-2 border-black px-2 py-0.5 rounded-md text-xs font-bold flex items-center gap-1.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                        {val}
                        <button
                            type="button"
                            onClick={(e) => removeValue(e, val)}
                            className="hover:text-violet-900 rounded-full p-0.5 hover:bg-violet-200 transition-colors"
                        >
                            <X size={12} strokeWidth={3} />
                        </button>
                    </span>
                ))}
                <div className="flex-1" />
                <ChevronDown size={18} strokeWidth={2.5} className={cn("text-slate-500 transition-transform duration-200", isOpen && "rotate-180 text-black")} />
            </div>

            {/* Dropdown Menu - Neubrutalism */}
            {isOpen && (
                <div
                    className="absolute top-full left-0 w-full mt-2 bg-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50 max-h-80 overflow-y-auto"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#94a3b8 #f1f5f9' }}
                >
                    {options.map(option => {
                        const isSelected = displayValues.includes(option.value);
                        return (
                            <div
                                key={option.value}
                                onClick={() => handleSelect(option.value)}
                                className={cn(
                                    "px-4 py-2.5 text-sm cursor-pointer flex items-center justify-between transition-colors font-medium border-b border-slate-100 last:border-b-0",
                                    isSelected
                                        ? "bg-violet-50 text-violet-900"
                                        : "hover:bg-slate-50 text-slate-700"
                                )}
                            >
                                <span className="font-bold">{option.label}</span>
                                {isSelected && (
                                    <div className="w-5 h-5 bg-violet-500 rounded border-2 border-black flex items-center justify-center">
                                        <Check size={12} strokeWidth={3} className="text-white" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {options.length === 0 && (
                        <div className="px-4 py-3 text-sm text-slate-400 italic text-center">
                            No options available
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MultiSelect;

