import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

const Button = React.forwardRef(({
    className,
    variant = 'primary',
    size = 'default',
    isLoading = false,
    children,
    disabled,
    type = 'button',
    ...props
}, ref) => {

    const variants = {
        primary: 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm hover:shadow focus-visible:ring-primary-500',
        secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm hover:shadow focus-visible:ring-slate-400',
        outline: 'border border-primary-600 text-primary-600 hover:bg-primary-50 focus-visible:ring-primary-500',
        ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400',
        danger: 'bg-danger text-white hover:bg-red-600 shadow-sm focus-visible:ring-red-500',
        link: 'text-primary-600 underline-offset-4 hover:underline p-0 h-auto font-normal',
    };

    const sizes = {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-md px-8 text-lg',
        icon: 'h-10 w-10',
    };

    return (
        <button
            ref={ref}
            type={type}
            disabled={disabled || isLoading}
            className={cn(
                'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {children}
        </button>
    );
});

Button.displayName = 'Button';

export { Button };
