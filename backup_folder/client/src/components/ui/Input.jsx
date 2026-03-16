import React from 'react';
import { cn } from '../../lib/utils';

const Input = React.forwardRef(({ className, type, error, startIcon: StartIcon, endIcon: EndIcon, ...props }, ref) => {
    return (
        <div className="relative w-full group">
            {StartIcon && (
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 z-10 pointer-events-none">
                    <StartIcon size={18} strokeWidth={2.5} />
                </div>
            )}
            <input
                type={type}
                className={cn(
                    "flex h-11 w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:border-black focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-150 hover:border-black",
                    StartIcon && "pl-10",
                    EndIcon && "pr-10",
                    error && "border-rose-400 focus:border-rose-500 focus:shadow-[2px_2px_0px_0px_rgba(225,29,72,0.5)]",
                    className
                )}
                ref={ref}
                {...props}
            />
            {EndIcon && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 z-10 pointer-events-none">
                    <EndIcon size={18} strokeWidth={2.5} />
                </div>
            )}
            {error && (
                <span className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1.5 bg-rose-50 px-2 py-1 rounded-md border border-rose-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    {error.message || error}
                </span>
            )}
        </div>
    );
});

Input.displayName = "Input";

export { Input };
