import React, { useState, useEffect, useRef } from 'react';

const EditableField = ({ value, onChange, placeholder, className = '', style = {}, isInline = false }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState(value);
    const inputRef = useRef(null);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleClick = () => {
        setIsEditing(true);
    };

    const handleBlur = () => {
        setIsEditing(false);
        if (onChange && localValue !== value) {
            onChange(localValue);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            inputRef.current.blur();
        }
    };

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="text"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className={`bg-indigo-50 outline-none px-1 rounded print:bg-transparent print:border-none print:p-0 print:text-black ${isInline ? 'inline-block w-auto' : 'w-full block'} ${className}`}
                style={{ ...style, minWidth: '50px' }}
            />
        );
    }

    const isEmpty = value === null || value === undefined || value === '';

    return (
        <span
            onClick={handleClick}
            className={`cursor-pointer min-h-[20px] border-b border-transparent hover:border-indigo-300 hover:bg-indigo-50 text-indigo-900 transition-all rounded px-1 -mx-1 ${isInline ? 'inline-block w-auto' : 'block w-full'} ${isEmpty ? 'text-slate-400 italic bg-slate-50 opacity-50 hover:opacity-100' : ''} ${className}`}
            style={style}
            title="Click to edit"
        >
            {value || <span className="print:hidden block w-full h-full text-center">{placeholder || 'Click to edit...'}</span>}
        </span>
    );
};

export default EditableField;
