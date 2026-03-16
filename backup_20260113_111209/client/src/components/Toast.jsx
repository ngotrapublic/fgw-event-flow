import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);

        setTimeout(() => {
            setToasts(prev => prev.filter(toast => toast.id !== id));
        }, 3000);
    }, []);

    const showSuccess = useCallback((message) => addToast(message, 'success'), [addToast]);
    const showError = useCallback((message) => addToast(message, 'error'), [addToast]);
    const showInfo = useCallback((message) => addToast(message, 'info'), [addToast]);
    const showWarning = useCallback((message) => addToast(message, 'warning'), [addToast]);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showSuccess, showError, showInfo, showWarning }}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </ToastContext.Provider>
    );
};

const ToastContainer = ({ toasts, removeToast }) => {
    return (
        <div className="fixed top-4 right-4 z-50 space-y-2">
            {toasts.map(toast => (
                <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
            ))}
        </div>
    );
};

const Toast = ({ id, message, type, onClose }) => {
    const icons = {
        success: <CheckCircle size={20} className="text-green-500" />,
        error: <XCircle size={20} className="text-red-500" />,
        warning: <AlertTriangle size={20} className="text-orange-500" />,
        info: <Info size={20} className="text-blue-500" />
    };

    const bgColors = {
        success: 'bg-green-50 border-green-200',
        error: 'bg-red-50 border-red-200',
        warning: 'bg-orange-50 border-orange-200',
        info: 'bg-blue-50 border-blue-200'
    };

    return (
        <div className={`flex items-center gap-3 min-w-[320px] px-4 py-3 rounded-xl border shadow-lg ${bgColors[type]} animate-in slide-in-from-right-5 duration-300`}>
            {icons[type]}
            <p className="flex-1 text-sm font-medium text-slate-800">{message}</p>
            <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 transition"
            >
                <X size={18} />
            </button>
        </div>
    );
};
