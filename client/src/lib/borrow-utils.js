const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const HOUR_MS = 3600 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WEEKDAYS_VI = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

export const MAX_DUE_DAYS = 365;
export const CLOSED_STATUSES = ['returned', 'returned_with_issue', 'rejected', 'cancelled', 'expired'];

export function normalizePhoneInput(raw) {
    if (!raw || typeof raw !== 'string') return '';
    let p = raw.replace(/[\s.\-_()]/g, '');
    if (p.startsWith('+84')) {
        p = '0' + p.slice(3);
    } else if (p.startsWith('84') && p.length > 9) {
        p = '0' + p.slice(2);
    }
    return p;
}

export function getVnOffsetDateStr(daysOffset = 0, nowMs = Date.now()) {
    const vnNow = new Date(nowMs + VN_OFFSET_MS);
    const target = new Date(
        Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate() + daysOffset)
    );
    return target.toISOString().slice(0, 10);
}

export function getVnMaxDueDateStr(nowMs = Date.now()) {
    return getVnOffsetDateStr(MAX_DUE_DAYS, nowMs);
}

export function extractVnDateOnly(value) {
    if (!value) return '';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
        return value.trim();
    }
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return new Date(d.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

export function formatVnDueDate(dueDateOrIso, { withTime = true, includeWeekday = true } = {}) {
    if (!dueDateOrIso) return '';
    const dateOnly = extractVnDateOnly(dueDateOrIso);
    if (!dateOnly) return String(dueDateOrIso);

    const [yStr, mStr, dStr] = dateOnly.split('-');
    const year = Number(yStr);
    const month = Number(mStr);
    const day = Number(dStr);

    const baseDate = `${dStr}/${mStr}/${yStr}`;
    let out = baseDate;
    if (includeWeekday) {
        const weekdayIdx = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay();
        out = `${WEEKDAYS_VI[weekdayIdx]}, ${baseDate}`;
    }
    return withTime ? `${out} · 23:59 giờ Việt Nam` : out;
}

export function formatVnDateShort(isoString) {
    return formatVnDueDate(isoString, { withTime: false, includeWeekday: false });
}

export function getCountdownBadge(dueAt, status, nowMs = Date.now(), dueDate = null) {
    if (!['handed_over', 'approved', 'return_pending'].includes(status)) return null;
    const effectiveIso =
        dueAt ||
        (typeof dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dueDate)
            ? `${dueDate}T16:59:59.000Z`
            : null);
    if (!effectiveIso) return null;

    const dueMs = new Date(effectiveIso).getTime();
    if (isNaN(dueMs)) return null;

    const diffMs = dueMs - nowMs;
    if (diffMs < 0) {
        const daysAgo = Math.max(1, Math.ceil(Math.abs(diffMs) / DAY_MS));
        return {
            text: `Quá hạn ${daysAgo} ngày!`,
            className: 'bg-rose-500 text-white animate-pulse motion-reduce:animate-none'
        };
    }
    if (diffMs <= DAY_MS) {
        const hoursLeft = Math.max(1, Math.ceil(diffMs / HOUR_MS));
        return {
            text: `Còn ${hoursLeft} giờ`,
            className: 'bg-amber-400 text-black'
        };
    }
    const daysLeft = Math.ceil(diffMs / DAY_MS);
    return {
        text: `Còn ${daysLeft} ngày`,
        className: 'bg-emerald-200 text-emerald-950'
    };
}
