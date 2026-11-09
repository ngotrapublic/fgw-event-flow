import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { borrowTokenStore } from '../../lib/borrow-token-store';
import { Loader2, Package } from 'lucide-react';

export default function BorrowManage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get('t');
        if (token && token.trim()) {
            borrowTokenStore.add(token.trim());
        }
        navigate('/borrow', { replace: true });
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
            <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-[4px_4px_0_#000] text-center space-y-3 max-w-xs w-full">
                <div className="w-12 h-12 bg-yellow-300 border-2 border-black rounded-xl flex items-center justify-center mx-auto shadow-[2px_2px_0_#000]">
                    <Package size={24} strokeWidth={2.5} />
                </div>
                <Loader2 size={24} className="animate-spin text-indigo-600 mx-auto" />
                <p className="text-xs font-black text-black uppercase tracking-wider">
                    Đang đồng bộ phiếu mượn...
                </p>
            </div>
        </div>
    );
}
