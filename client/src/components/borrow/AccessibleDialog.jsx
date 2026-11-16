import React, { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
].join(', ');

export default function AccessibleDialog({
    open,
    onClose,
    titleId,
    closeDisabled = false,
    showHeaderClose = true,
    backdropClassName = 'max-w-sm',
    layeredShadow = false,
    children
}) {
    const dialogRef = useRef(null);
    const previousFocusRef = useRef(null);
    const onCloseRef = useRef(onClose);
    const closeDisabledRef = useRef(closeDisabled);
    const shouldReduceMotion = useReducedMotion();

    onCloseRef.current = onClose;
    closeDisabledRef.current = closeDisabled;

    useEffect(() => {
        if (!open) return undefined;

        previousFocusRef.current =
            typeof document !== 'undefined' ? document.activeElement : null;

        const container = dialogRef.current;
        if (container) {
            const focusables = container.querySelectorAll(FOCUSABLE_SELECTOR);
            if (focusables.length > 0) {
                focusables[0].focus();
            } else {
                container.focus();
            }
        }

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (!closeDisabledRef.current && onCloseRef.current) {
                    e.stopPropagation();
                    onCloseRef.current();
                }
                return;
            }

            if (e.key === 'Tab' && container) {
                const focusables = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));
                if (focusables.length === 0) {
                    e.preventDefault();
                    return;
                }
                const first = focusables[0];
                const last = focusables[focusables.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === first || !container.contains(document.activeElement)) {
                        e.preventDefault();
                        last.focus();
                    }
                } else if (document.activeElement === last || !container.contains(document.activeElement)) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            const prev = previousFocusRef.current;
            if (prev && typeof prev.focus === 'function' && document.contains(prev)) {
                prev.focus();
            }
        };
    }, [open]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget && !closeDisabled && onClose) {
                    onClose();
                }
            }}
        >
            <div className={`relative w-full ${backdropClassName}`}>
                {layeredShadow && (
                    <>
                        <div
                            className="hidden sm:block absolute inset-0 rounded-3xl pointer-events-none"
                            aria-hidden="true"
                            style={{ background: '#ec4899', transform: 'translate(8px, 8px)' }}
                        />
                        <div
                            className="hidden sm:block absolute inset-0 rounded-3xl pointer-events-none"
                            aria-hidden="true"
                            style={{ background: '#8b5cf6', transform: 'translate(4px, 4px)' }}
                        />
                    </>
                )}

                <motion.div
                    ref={dialogRef}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={titleId}
                    tabIndex={-1}
                    initial={shouldReduceMotion ? false : { scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={shouldReduceMotion ? undefined : { scale: 0.95, opacity: 0 }}
                    transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.15 }}
                    className="relative bg-white border-[3px] border-black rounded-3xl p-6 shadow-2xl w-full space-y-4 focus:outline-none"
                >
                    {showHeaderClose && (
                        <button
                            type="button"
                            onClick={() => !closeDisabled && onClose?.()}
                            disabled={closeDisabled}
                            aria-label="Đóng"
                            className="absolute top-3.5 right-3.5 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl border-2 border-black bg-white hover:bg-slate-100 text-black font-black transition-colors disabled:opacity-50"
                        >
                            <X size={18} strokeWidth={2.5} aria-hidden="true" />
                        </button>
                    )}
                    {children}
                </motion.div>
            </div>
        </div>
    );
}
