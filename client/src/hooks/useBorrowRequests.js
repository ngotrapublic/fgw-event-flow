import { useCallback, useEffect, useMemo, useState } from 'react';
import { borrowApi } from '../api/borrow';
import { borrowTokenStore } from '../lib/borrow-token-store';
import { partitionBorrowRequests } from '../lib/borrow-utils';

export function useBorrowRequests({ userUid, authLoading = false, onError, ignore401 = false } = {}) {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    const fetchRequests = useCallback(async () => {
        if (authLoading) return;
        setLoading(true);
        setFetchError(null);
        try {
            borrowTokenStore.purgeLegacy();
            const res = await borrowApi.getMy();
            const data = res.data || {};
            setRequests(data.requests || []);
        } catch (err) {
            console.error('[BORROW HOOK] Error loading requests:', err);
            if (!(ignore401 && err.response?.status === 401)) {
                const msg = 'Không thể tải danh sách phiếu mượn. Vui lòng kiểm tra kết nối và thử lại.';
                setFetchError(msg);
                onError?.(msg);
            }
        } finally {
            setLoading(false);
        }
    }, [authLoading, ignore401, onError]);

    useEffect(() => {
        if (!authLoading) {
            setRequests([]);
            fetchRequests();
        }
    }, [userUid, authLoading, fetchRequests]);

    const partitioned = useMemo(() => partitionBorrowRequests(requests), [requests]);

    return {
        requests,
        setRequests,
        loading,
        fetchError,
        refetch: fetchRequests,
        ...partitioned
    };
}

