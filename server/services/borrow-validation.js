const HttpError = require('../utils/http-error');
const { LIMITS } = require('./borrow-constants');

function getVietnamNow() {
    return new Date(Date.now() + 7 * 60 * 60 * 1000);
}

function normalizePhone(rawPhone) {
    if (!rawPhone || typeof rawPhone !== 'string') return '';
    let p = rawPhone.replace(/[\s.\-_()]/g, '');
    if (p.startsWith('+84')) {
        p = '0' + p.slice(3);
    } else if (p.startsWith('84') && p.length > 9) {
        p = '0' + p.slice(2);
    }
    return p;
}

function validatePhone(phone) {
    const normalized = normalizePhone(phone);
    if (!/^0\d{9}$/.test(normalized)) {
        throw new HttpError(
            400,
            'Số điện thoại không hợp lệ (phải gồm 10 số, bắt đầu bằng số 0)',
            { field: 'phone' }
        );
    }
    return normalized;
}

function validateName(name) {
    if (typeof name !== 'string') {
        throw new HttpError(400, 'Họ và tên không được để trống', { field: 'name' });
    }
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 80) {
        throw new HttpError(400, 'Họ và tên phải từ 2 đến 80 ký tự', { field: 'name' });
    }
    return trimmed;
}

function validateEmail(email) {
    if (typeof email !== 'string') {
        throw new HttpError(400, 'Email không được để trống', { field: 'email' });
    }
    const trimmed = email.trim().toLowerCase();
    if (trimmed.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
        throw new HttpError(400, 'Email không hợp lệ', { field: 'email' });
    }
    return trimmed;
}

function validateDueDate(dueDate) {
    if (!dueDate || typeof dueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
        throw new HttpError(400, 'Định dạng hạn trả phải là YYYY-MM-DD', { field: 'dueDate' });
    }

    const vnNow = getVietnamNow();
    const tomorrowDate = new Date(Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate() + 1));
    const tomorrowStr = tomorrowDate.toISOString().slice(0, 10);

    const maxDate = new Date(Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate() + LIMITS.MAX_DUE_DAYS));
    const maxStr = maxDate.toISOString().slice(0, 10);

    if (dueDate < tomorrowStr) {
        throw new HttpError(400, 'Hạn trả phải từ ngày mai trở đi', { field: 'dueDate' });
    }
    if (dueDate > maxStr) {
        throw new HttpError(400, `Hạn trả không được vượt quá ${LIMITS.MAX_DUE_DAYS} ngày`, { field: 'dueDate' });
    }

    // Vietnam 23:59:59 is UTC 16:59:59
    const dueAt = `${dueDate}T16:59:59.000Z`;
    return { dueDate, dueAt };
}

function validateItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
        throw new HttpError(400, 'Danh sách thiết bị không được để trống', { field: 'items' });
    }
    if (items.length > LIMITS.MAX_ITEMS) {
        throw new HttpError(400, `Danh sách thiết bị không được vượt quá ${LIMITS.MAX_ITEMS} món`, { field: 'items' });
    }

    const merged = new Map();
    for (const item of items) {
        if (!item || typeof item !== 'object') {
            throw new HttpError(400, 'Thiết bị không hợp lệ', { field: 'items' });
        }
        const resourceId = typeof item.resourceId === 'string' ? item.resourceId.trim() : '';
        if (!resourceId) {
            throw new HttpError(400, 'Thiếu mã thiết bị (resourceId)', { field: 'items' });
        }
        const qty = parseInt(item.qty, 10);
        if (!Number.isInteger(qty) || qty < 1) {
            throw new HttpError(400, 'Số lượng mượn phải là số nguyên dương (ít nhất 1)', { field: 'items' });
        }
        if (qty > LIMITS.MAX_QTY) {
            throw new HttpError(400, `Số lượng mượn cho mỗi thiết bị tối đa là ${LIMITS.MAX_QTY}`, { field: 'items' });
        }

        const current = merged.get(resourceId) || 0;
        const total = current + qty;
        if (total > LIMITS.MAX_QTY) {
            throw new HttpError(400, `Tổng số lượng mượn cho mỗi thiết bị tối đa là ${LIMITS.MAX_QTY}`, { field: 'items' });
        }
        merged.set(resourceId, total);
    }

    return Array.from(merged.entries()).map(([resourceId, qty]) => ({
        resourceId,
        qty
    }));
}

function validateNote(note) {
    if (!note) return '';
    if (typeof note !== 'string') return '';
    const trimmed = note.trim();
    if (trimmed.length > 500) {
        throw new HttpError(400, 'Ghi chú không được vượt quá 500 ký tự', { field: 'note' });
    }
    return trimmed;
}

function validateBorrowRequest(body = {}, user = null) {
    const phone = validatePhone(body.phone);
    const { dueDate, dueAt } = validateDueDate(body.dueDate);
    const items = validateItems(body.items);
    const note = validateNote(body.note);

    let name = '';
    let email = '';

    if (user) {
        email = user.email || '';
        name = user.profile?.name || user.name || user.email || '';
        // If user submitted an override name, validate it
        if (body.name && typeof body.name === 'string' && body.name.trim().length >= 2) {
            name = body.name.trim().slice(0, 80);
        }
    } else {
        name = validateName(body.name);
        email = validateEmail(body.email);
    }

    return {
        name,
        email,
        phone,
        items,
        dueDate,
        dueAt,
        note
    };
}

module.exports = {
    normalizePhone,
    validatePhone,
    validateName,
    validateEmail,
    validateDueDate,
    validateItems,
    validateNote,
    validateBorrowRequest
};

