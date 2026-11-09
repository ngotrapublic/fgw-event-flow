import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { borrowTokenStore } from '../../lib/borrow-token-store';
import { Loader2 } from 'lucide-react';

export default function BorrowManage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get('t');
        if (token && token.trim()) {
            borrowTokenStore.add(token.trim());
        }
        // Redirect immediately to /borrow so requests automatically load
        navigate('/borrow', { replace: true });
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="text-center space-y-2">
                <Loader2 size={32} className="animate-spin text-indigo-600 mx-auto" />
                <p className="text-sm font-medium text-slate-600">Đang đồng bộ phiếu mượn của bạn...</p>
            </div>
        </div>
    );
}

