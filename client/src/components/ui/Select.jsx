import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

const Select = ({
    options,
    value = '',
    onChange,
    placeholder = "Select...",
    icon: Icon,
    error,
    ...props
}) => {
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
        onChange(optionValue);
        setIsOpen(false);
    };

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className="relative" ref={containerRef}>
            {/* Trigger Button - Neubrutalism */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "h-11 w-full px-3 bg-white cursor-pointer flex items-center gap-2 transition-colors duration-150 border-2 rounded-lg",
                    isOpen
                        ? "border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        : "border-slate-200 hover:border-black",
                    error && "border-rose-400"
                )}
            >
                {Icon && (
                    <Icon size={18} strokeWidth={2.5} className="text-slate-500 shrink-0" />
                )}
                <span className={cn(
                    "flex-1 text-sm font-bold truncate",
                    selectedOption ? "text-slate-700" : "text-slate-400"
                )}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown
                    size={18}
                    strokeWidth={2.5}
                    className={cn(
                        "text-slate-500 transition-transform duration-200 shrink-0",
                        isOpen && "rotate-180 text-black"
                    )}
                />
            </div>

            {/* Dropdown Menu - Neubrutalism */}
            {isOpen && (
                <div
                    className="absolute top-full left-0 w-full mt-2 bg-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50 max-h-80 overflow-y-auto"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#94a3b8 #f1f5f9' }}
                >
                    {options.map(option => {
                        const isSelected = value === option.value;
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

export default Select;
