import { useState, useEffect } from 'react';

/**
 * Delays updating the returned value until after `delay` ms have passed
 * since the last change to `value`. Use for search inputs to avoid
 * firing expensive filtering on every keystroke.
 *
 * @param {any} value - The value to debounce.
 * @param {number} delay - Delay in milliseconds (default 300ms).
 * @returns The debounced value.
 */
export function useDebounce(value, delay = 300) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}
