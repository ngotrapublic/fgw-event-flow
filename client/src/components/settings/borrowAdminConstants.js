import {
    Clock,
    CheckCircle2,
    Package,
    RotateCcw,
    AlertTriangle,
    XCircle,
    Mail
} from 'lucide-react';

export const ADMIN_STATUS_CONFIGS = {
    unverified: {
        label: 'Chưa xác nhận email',
        badgeBg: 'bg-amber-200 text-black border-2 border-black',
        icon: Mail
    },
    pending: {
        label: 'Chờ duyệt',
        badgeBg: 'bg-sky-300 text-black border-2 border-black',
        icon: Clock
    },
    approved: {
        label: 'Đã duyệt',
        badgeBg: 'bg-emerald-300 text-black border-2 border-black',
        icon: CheckCircle2
    },
    handed_over: {
        label: 'Đang mượn',
        badgeBg: 'bg-violet-300 text-black border-2 border-black',
        icon: Package
    },
    return_pending: {
        label: 'Chờ kho kiểm',
        badgeBg: 'bg-teal-300 text-black border-2 border-black',
        icon: RotateCcw
    },
    returned: {
        label: 'Đã hoàn tất trả',
        badgeBg: 'bg-slate-200 text-slate-800 border-2 border-black',
        icon: CheckCircle2
    },
    returned_with_issue: {
        label: 'Đã trả (có sự cố)',
        badgeBg: 'bg-orange-300 text-black border-2 border-black',
        icon: AlertTriangle
    },
    rejected: {
        label: 'Bị từ chối',
        badgeBg: 'bg-rose-300 text-black border-2 border-black',
        icon: XCircle
    },
    cancelled: {
        label: 'Đã huỷ',
        badgeBg: 'bg-slate-200 text-slate-700 border-2 border-black',
        icon: XCircle
    },
    expired: {
        label: 'Hết hạn xác nhận',
        badgeBg: 'bg-slate-200 text-slate-600 border-2 border-black',
        icon: Clock
    }
};

/**
 * Per Phase 03 reviewer note: always compute overdue status in UI directly from `dueAt`,
 * never relying solely on the background job's `isOverdue` flag (which isn't set on `return_pending`).
 */
export function isRequestOverdue(req) {
    if (!req) return false;
    if (!['handed_over', 'return_pending'].includes(req.status)) return false;
    if (!req.dueAt) return false;
    const dueMs = new Date(req.dueAt).getTime();
    return !Number.isNaN(dueMs) && dueMs < Date.now();
}

export function formatDateVi(isoOrDate) {
    if (!isoOrDate) return '—';
    const d = new Date(isoOrDate);
    if (Number.isNaN(d.getTime())) return String(isoOrDate);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

export function formatDateTimeVi(isoString) {
    if (!isoString) return '—';
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return String(isoString);
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${mins} • ${formatDateVi(isoString)}`;
}
