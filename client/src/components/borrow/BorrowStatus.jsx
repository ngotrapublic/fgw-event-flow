import React from 'react';
import {
    Clock,
    Package,
    AlertTriangle,
    CheckCircle2,
    RotateCcw,
    Mail
} from 'lucide-react';

export const STATUS_CONFIGS = {
    unverified: {
        label: 'Chờ xác nhận email',
        badgeBg: 'bg-amber-300 text-black border-2 border-black shadow-[2px_2px_0_#000]',
        icon: Mail,
        helper: 'Việc cần làm: Mở email (kiểm tra cả Spam) và nhấp liên kết xác nhận trong 24 giờ.'
    },
    pending: {
        label: 'Chờ xét duyệt',
        badgeBg: 'bg-sky-300 text-black border-2 border-black shadow-[2px_2px_0_#000]',
        icon: Clock,
        helper: 'Yêu cầu đã gửi thành công; kho chỉ giữ thiết bị sau khi Quản trị viên duyệt.'
    },
    approved: {
        label: 'Đã duyệt — Tới nhận đồ',
        badgeBg: 'bg-emerald-300 text-black border-2 border-black shadow-[2px_2px_0_#000]',
        icon: CheckCircle2,
        helper: 'Việc cần làm: Mang mã phiếu tới Phòng IT - Floor 2 - Campus HCM để nhận thiết bị trong 3 ngày.'
    },
    handed_over: {
        label: 'Đang mượn',
        badgeBg: 'bg-violet-300 text-black border-2 border-black shadow-[2px_2px_0_#000]',
        icon: Package,
        helper: 'Thiết bị đang được bạn mượn sử dụng. Nhấn "Báo trả" khi sẵn sàng bàn giao lại kho.'
    },
    return_pending: {
        label: 'Chờ kho kiểm tra',
        badgeBg: 'bg-teal-300 text-black border-2 border-black shadow-[2px_2px_0_#000]',
        icon: RotateCcw,
        helper: 'Việc cần làm: Mang thiết bị đến Phòng IT - Floor 2 - Campus HCM để kiểm tra và ký nhận.'
    },
    returned: {
        label: 'Đã hoàn tất trả',
        badgeBg: 'bg-slate-200 text-slate-900 border-2 border-black shadow-[2px_2px_0_#000]',
        icon: CheckCircle2,
        helper: null
    },
    returned_with_issue: {
        label: 'Đã trả (có sự cố)',
        badgeBg: 'bg-orange-300 text-black border-2 border-black shadow-[2px_2px_0_#000]',
        icon: AlertTriangle,
        helper: null
    },
    rejected: {
        label: 'Bị từ chối',
        badgeBg: 'bg-rose-300 text-black border-2 border-black shadow-[2px_2px_0_#000]',
        icon: AlertTriangle,
        helper: null
    },
    cancelled: {
        label: 'Đã huỷ',
        badgeBg: 'bg-slate-200 text-slate-700 border-2 border-black shadow-[2px_2px_0_#000]',
        icon: AlertTriangle,
        helper: null
    },
    expired: {
        label: 'Hết hạn xác nhận',
        badgeBg: 'bg-slate-200 text-slate-700 border-2 border-black shadow-[2px_2px_0_#000]',
        icon: Clock,
        helper: null
    }
};

export const NON_RETURNABLE_HINTS = {
    pending: 'Phiếu đang chờ Quản trị viên duyệt — Chưa nhận thiết bị nên chưa thể báo trả.',
    approved: 'Phiếu đã duyệt! Vui lòng tới Phòng IT - Floor 2 - Campus HCM nhận thiết bị trước khi trả.',
    return_pending: 'Đã báo trả! Vui lòng mang thiết bị tới Phòng IT - Floor 2 - Campus HCM để kiểm tra và ký nhận.',
    unverified: 'Phiếu chưa xác nhận email! Vui lòng mở email và nhấn liên kết xác nhận.'
};

export function getStatusConfig(status) {
    return (
        STATUS_CONFIGS[status] || {
            label: status,
            badgeBg: 'bg-slate-200 text-slate-900 border-2 border-black shadow-[2px_2px_0_#000]',
            icon: Clock,
            helper: null
        }
    );
}

export function BorrowStatusBadge({ status }) {
    const config = getStatusConfig(status);
    const Icon = config.icon;
    return (
        <div
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider ${config.badgeBg}`}
        >
            <Icon size={14} strokeWidth={2.5} aria-hidden="true" />
            <span>{config.label}</span>
        </div>
    );
}

