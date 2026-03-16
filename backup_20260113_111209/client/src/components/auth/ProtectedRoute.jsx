import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../ui/Button';

export const ProtectedRoute = ({ allowedRoles }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Unauthorized />;
    }

    return <Outlet />;
};

export const Unauthorized = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                <ShieldAlert size={40} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Access Denied</h1>
            <p className="text-slate-500 max-w-md mb-8">
                Bạn không có quyền truy cập vào trang này. Vui lòng liên hệ Admin nếu bạn nghĩ đây là sự nhầm lẫn.
            </p>
            <Button variant="outline" onClick={() => window.history.back()}>
                Quay lại
            </Button>
        </div>
    );
};
