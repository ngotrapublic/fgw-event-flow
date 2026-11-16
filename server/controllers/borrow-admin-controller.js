const QRCode = require('qrcode');
const { borrowRequestsCollection } = require('../config/firebase');
const { getValidatedAppPublicUrl } = require('../config/borrow-security');
const HttpError = require('../utils/http-error');
const { transition } = require('../services/borrow-transition-service');
const borrowEmailService = require('../services/borrow-email-service');

/**
 * All statuses visible to admin/manager by default (excludes unverified & expired).
 */
const DEFAULT_ADMIN_STATUSES = [
    'pending',
    'approved',
    'handed_over',
    'return_pending',
    'returned',
    'returned_with_issue',
    'rejected',
    'cancelled'
];

/**
 * Serialize borrow request for admin/manager view.
 * Exposes full borrower info, history, but strictly excludes all *Hash fields.
 */
function toAdminView(doc) {
    if (!doc) return null;
    const data = typeof doc.data === 'function' ? doc.data() : doc;
    const id = doc.id || data.id;
    const out = { id, ...data };

    for (const key of Object.keys(out)) {
        if (key.endsWith('Hash') || key.endsWith('Hashes')) {
            delete out[key];
        }
    }
    return out;
}

/**
 * GET /api/borrow/admin/requests
 * List requests with optional status, overdue filter, pagination.
 */
async function getRequests(req, res, next) {
    try {
        const { status, overdue, limit = 50, cursor } = req.query;
        const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
        const isOverdueFilter = overdue === 'true';
        const nowIso = new Date().toISOString();

        let targetStatuses = DEFAULT_ADMIN_STATUSES;
        if (status) {
            const rawStatuses = String(status)
                .split(',')
                .map((s) => s.trim())
                .filter((s) => DEFAULT_ADMIN_STATUSES.includes(s) || s === 'unverified' || s === 'expired');
            if (rawStatuses.length > 0) {
                targetStatuses = Array.from(new Set(rawStatuses)).slice(0, 10);
            }
        }

        if (isOverdueFilter) {
            targetStatuses = targetStatuses.filter((s) => ['handed_over', 'return_pending'].includes(s));
            if (targetStatuses.length === 0) {
                targetStatuses = ['handed_over', 'return_pending'];
            }
        }

        let query = borrowRequestsCollection.where('status', 'in', targetStatuses);

        if (isOverdueFilter) {
            // Uses (status ASC, dueAt ASC) composite index
            query = query.where('dueAt', '<', nowIso).orderBy('dueAt', 'asc');
        } else {
            // Uses (status ASC, createdAt DESC) composite index
            query = query.orderBy('createdAt', 'desc');
        }

        if (cursor) {
            const cursorDoc = await borrowRequestsCollection.doc(cursor).get();
            if (!cursorDoc.exists) {
                throw new HttpError(400, 'Cursor không hợp lệ hoặc đã bị xoá');
            }
            query = query.startAfter(cursorDoc);
        }

        // Fetch limit + 1 to detect hasMore
        const snap = await query.limit(parsedLimit + 1).get();
        let docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        let nextCursor = null;
        if (docs.length > parsedLimit) {
            docs = docs.slice(0, parsedLimit);
            nextCursor = docs[docs.length - 1].id;
        }

        res.status(200).json({
            requests: docs.map(toAdminView),
            nextCursor
        });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/borrow/admin/requests/:id
 * Retrieve request detail by ID.
 */
async function getRequestById(req, res, next) {
    try {
        const snap = await borrowRequestsCollection.doc(req.params.id).get();
        if (!snap.exists) {
            throw new HttpError(404, 'Phiếu mượn không tồn tại');
        }
        res.status(200).json(toAdminView(snap));
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/borrow/admin/counts
 * Return aggregation counts for dashboard badges.
 */
async function getCounts(req, res, next) {
    try {
        const nowIso = new Date().toISOString();
        const [pendingSnap, approvedSnap, handedOverSnap, returnPendingSnap, overdueHOSnap, overdueRPSnap] =
            await Promise.all([
                borrowRequestsCollection.where('status', '==', 'pending').count().get(),
                borrowRequestsCollection.where('status', '==', 'approved').count().get(),
                borrowRequestsCollection.where('status', '==', 'handed_over').count().get(),
                borrowRequestsCollection.where('status', '==', 'return_pending').count().get(),
                borrowRequestsCollection
                    .where('status', '==', 'handed_over')
                    .where('dueAt', '<', nowIso)
                    .count()
                    .get(),
                borrowRequestsCollection
                    .where('status', '==', 'return_pending')
                    .where('dueAt', '<', nowIso)
                    .count()
                    .get()
            ]);

        const overdue =
            (overdueHOSnap.data()?.count || 0) + (overdueRPSnap.data()?.count || 0);

        res.status(200).json({
            pending: pendingSnap.data()?.count || 0,
            approved: approvedSnap.data()?.count || 0,
            handed_over: handedOverSnap.data()?.count || 0,
            return_pending: returnPendingSnap.data()?.count || 0,
            overdue
        });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/borrow/admin/requests/:id/approve
 * Transition: pending -> approved, deduct stock, send email.
 */
async function approveRequest(req, res, next) {
    try {
        const actor = {
            uid: req.user?.uid || null,
            email: req.user?.email || null,
            role: req.user?.role || 'admin'
        };

        const nowIso = new Date().toISOString();
        const updated = await transition(req.params.id, 'approved', {
            actor,
            expectFrom: ['pending'],
            patch: { approvedAt: nowIso }
        });

        let emailSent = true;
        try {
            await borrowEmailService.sendApproved(updated);
        } catch (mailErr) {
            console.error('[BORROW] Failed to send approved email:', mailErr.message);
            emailSent = false;
        }

        res.status(200).json({
            request: toAdminView(updated),
            emailSent
        });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/borrow/admin/requests/:id/reject
 * Transition: pending -> rejected, reason 3-500 chars, send email.
 */
async function rejectRequest(req, res, next) {
    try {
        const { reason } = req.body || {};
        if (!reason || typeof reason !== 'string' || reason.trim().length < 3 || reason.trim().length > 500) {
            throw new HttpError(400, 'Lý do từ chối phải từ 3 đến 500 ký tự');
        }

        const actor = {
            uid: req.user?.uid || null,
            email: req.user?.email || null,
            role: req.user?.role || 'admin'
        };

        const updated = await transition(req.params.id, 'rejected', {
            actor,
            patch: { rejectReason: reason.trim() }
        });

        let emailSent = true;
        try {
            await borrowEmailService.sendRejected(updated);
        } catch (mailErr) {
            console.error('[BORROW] Failed to send rejected email:', mailErr.message);
            emailSent = false;
        }

        res.status(200).json({
            request: toAdminView(updated),
            emailSent
        });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/borrow/admin/requests/:id/handover
 * Transition: approved -> handed_over.
 */
async function handoverRequest(req, res, next) {
    try {
        const actor = {
            uid: req.user?.uid || null,
            email: req.user?.email || null,
            role: req.user?.role || 'admin'
        };

        const updated = await transition(req.params.id, 'handed_over', {
            actor,
            expectFrom: ['approved']
        });

        res.status(200).json({
            request: toAdminView(updated)
        });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/borrow/admin/requests/:id/cancel
 * Transition: approved -> cancelled, reason 3-500 chars, restock, send email.
 */
async function cancelRequest(req, res, next) {
    try {
        const { reason } = req.body || {};
        if (!reason || typeof reason !== 'string' || reason.trim().length < 3 || reason.trim().length > 500) {
            throw new HttpError(400, 'Lý do huỷ phải từ 3 đến 500 ký tự');
        }

        const actor = {
            uid: req.user?.uid || null,
            email: req.user?.email || null,
            role: req.user?.role || 'admin'
        };

        const updated = await transition(req.params.id, 'cancelled', {
            actor,
            expectFrom: ['approved'],
            patch: { cancelReason: reason.trim() }
        });

        let emailSent = true;
        try {
            await borrowEmailService.sendCancelled(updated);
        } catch (mailErr) {
            console.error('[BORROW] Failed to send cancelled email:', mailErr.message);
            emailSent = false;
        }

        res.status(200).json({
            request: toAdminView(updated),
            emailSent
        });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/borrow/admin/requests/:id/confirm-return
 * Confirm device return:
 * - expectFrom: ['handed_over', 'return_pending']
 * - items must match exact set of resourceId, 0 <= receivedQty <= qty
 * - any receivedQty < qty OR non-empty returnNote -> returned_with_issue, else returned
 * - restock by receivedQty
 * - send email
 */
async function confirmReturn(req, res, next) {
    try {
        const { items, returnNote } = req.body || {};

        const snap = await borrowRequestsCollection.doc(req.params.id).get();
        if (!snap.exists) {
            throw new HttpError(404, 'Phiếu mượn không tồn tại');
        }

        const current = snap.data();
        if (!['handed_over', 'return_pending'].includes(current.status)) {
            throw new HttpError(409, 'Phiếu không ở trạng thái chờ trả');
        }

        const currentItems = current.items || [];
        if (!Array.isArray(items)) {
            throw new HttpError(400, 'Danh sách thiết bị trả không hợp lệ');
        }

        const submittedIds = items.map((it) => it && it.resourceId);
        const submittedSet = new Set(submittedIds);
        const isExactSet =
            submittedIds.length === currentItems.length &&
            submittedSet.size === currentItems.length &&
            currentItems.every((ci) => submittedSet.has(ci.resourceId));

        if (!isExactSet) {
            throw new HttpError(
                400,
                'Danh sách thiết bị trả không khớp với phiếu (thiếu, thừa hoặc trùng mã)'
            );
        }

        if (returnNote !== undefined && returnNote !== null && typeof returnNote !== 'string') {
            throw new HttpError(400, 'Ghi chú sự cố phải là chuỗi ký tự');
        }
        const noteStr = returnNote ? String(returnNote).trim() : '';
        if (noteStr.length > 500) {
            throw new HttpError(400, 'Ghi chú sự cố không được vượt quá 500 ký tự');
        }

        const origMap = new Map();
        for (const orig of currentItems) {
            origMap.set(orig.resourceId, orig);
        }

        const processedItems = [];
        let hasMissingQty = false;

        for (const item of items) {
            const orig = origMap.get(item.resourceId);
            const rQty = item.receivedQty;
            if (!Number.isInteger(rQty) || rQty < 0 || rQty > orig.qty) {
                throw new HttpError(
                    400,
                    `Số lượng nhận lại của ${orig.label || orig.resourceId} không hợp lệ (0 <= x <= ${orig.qty})`
                );
            }
            if (rQty < orig.qty) {
                hasMissingQty = true;
            }
            processedItems.push({
                ...orig,
                receivedQty: rQty
            });
        }

        const targetStatus = hasMissingQty || noteStr.length > 0 ? 'returned_with_issue' : 'returned';

        const actor = {
            uid: req.user?.uid || null,
            email: req.user?.email || null,
            role: req.user?.role || 'admin'
        };

        const updated = await transition(req.params.id, targetStatus, {
            actor,
            expectFrom: ['handed_over', 'return_pending'],
            patch: {
                items: processedItems,
                returnNote: noteStr,
                isOverdue: false
            }
        });

        let emailSent = true;
        try {
            await borrowEmailService.sendReturned(updated);
        } catch (mailErr) {
            console.error('[BORROW] Failed to send returned email:', mailErr.message);
            emailSent = false;
        }

        res.status(200).json({
            request: toAdminView(updated),
            emailSent
        });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/borrow/admin/qr-station
 * Generate PNG data URL QR code pointing to APP_PUBLIC_URL/borrow.
 */
async function getQrStation(req, res, next) {
    try {
        let baseUrl;
        try {
            baseUrl = getValidatedAppPublicUrl();
        } catch (err) {
            throw new HttpError(503, err.message);
        }
        const url = `${baseUrl}/borrow`;
        const qr = await QRCode.toDataURL(url, { width: 512, margin: 2 });
        res.status(200).json({ url, qr });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    toAdminView,
    getRequests,
    getRequestById,
    getCounts,
    approveRequest,
    rejectRequest,
    handoverRequest,
    cancelRequest,
    confirmReturn,
    getQrStation
};

