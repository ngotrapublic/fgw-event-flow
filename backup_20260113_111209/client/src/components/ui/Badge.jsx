import React from 'react';
import { cn } from '../../lib/utils';

const Badge = ({ className, variant = "default", ...props }) => {
    const variants = {
        default: "border-transparent bg-primary-100 text-primary-900 hover:bg-primary-200",
        secondary: "border-transparent bg-slate-100 text-slate-900 hover:bg-slate-200",
        destructive: "border-transparent bg-red-100 text-red-900 hover:bg-red-200",
        outline: "text-slate-950 border-slate-200",
        success: "border-transparent bg-emerald-100 text-emerald-900 hover:bg-emerald-200",
        warning: "border-transparent bg-amber-100 text-amber-900 hover:bg-amber-200",
    };

    return (
        <div
            className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2",
                variants[variant],
                className
            )}
            {...props}
        />
    );
};

export { Badge };
