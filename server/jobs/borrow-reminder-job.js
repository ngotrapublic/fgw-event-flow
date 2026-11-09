const { borrowRequestsCollection } = require('../config/firebase');
const { transition } = require('../services/borrow-transition-service');
const { LIMITS } = require('../services/borrow-constants');
const borrowEmailService = require('../services/borrow-email-service');
const notificationService = require('../services/notificationService');

class BorrowReminderJob {
    constructor() {
        this.intervalId = null;
        this.running = false;
    }

    start() {
        if (this.intervalId) {
            return;
        }
        console.log('[BORROW REMINDER JOB] Starting background borrow reminder job... (interval: 15m)');
        this.run().catch((err) =>
            console.error('[BORROW REMINDER JOB] Initial run error:', err.message)
        );
        this.intervalId = setInterval(() => this.run(), 15 * 60 * 1000); // 15 minutes
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('[BORROW REMINDER JOB] Stopped');
        }
    }

    async run() {
        if (this.running) {
            console.log('[BORROW REMINDER JOB] Previous run still in progress, skipping iteration.');
            return;
        }

        this.running = true;
        const now = new Date();
        const nowMs = now.getTime();
        const nowIso = now.toISOString();

        try {
            // ==========================================
            // BƯỚC 1: HẾT HẠN XÁC NHẬN (unverified -> expired)
            // ==========================================
            try {
                const snap = await borrowRequestsCollection
                    .where('status', '==', 'unverified')
                    .get();

                for (const doc of snap.docs) {
                    const data = doc.data() || {};
                    if (data.verifyExpiresAt && new Date(data.verifyExpiresAt).getTime() < nowMs) {
                        try {
                            await transition(doc.id, 'expired', {
                                actor: { uid: null, email: 'system', role: 'system' }
                            });
                        } catch (stepErr) {
                            console.error(
                                `[BORROW REMINDER] Failed to expire request ${doc.id}:`,
                                stepErr.message
                            );
                        }
                    }
                }
            } catch (err) {
                console.error('[BORROW REMINDER] Step 1 (expired unverified) error:', err.message);
            }

            // ==========================================
            // BƯỚC 2: DUYỆT MÀ KHÔNG TỚI LẤY (> 3 ngày)
            // ==========================================
            try {
                const snap = await borrowRequestsCollection
                    .where('status', '==', 'approved')
                    .get();

                for (const doc of snap.docs) {
                    const data = doc.data() || {};
                    if (!data.approvedAt) continue;

                    const approvedMs = new Date(data.approvedAt).getTime();
                    if (
                        !isNaN(approvedMs) &&
                        nowMs - approvedMs > LIMITS.APPROVED_STALE_MS &&
                        !data.approvedStaleNotifiedAt
                    ) {
                        try {
                            // Ghi field reminder trước
                            await doc.ref.update({
                                approvedStaleNotifiedAt: nowIso,
                                updatedAt: nowIso
                            });

                            const adminUids = await notificationService.getUidsByRoles(['admin', 'manager']);
                            if (adminUids.length > 0) {
                                await notificationService.create({
                                    recipients: adminUids,
                                    type: 'warning',
                                    title: 'Phiếu đã duyệt 3 ngày chưa nhận',
                                    message: `Phiếu #${doc.id} của ${data.borrower?.name || 'người mượn'} đã duyệt 3 ngày chưa nhận thiết bị`,
                                    data: { borrowRequestId: doc.id },
                                    sender: 'Mượn trả thiết bị'
                                });
                            }
                        } catch (stepErr) {
                            console.error(`[BORROW REMINDER] Step 2 error on ${doc.id}:`, stepErr.message);
                        }
                    }
                }
            } catch (err) {
                console.error('[BORROW REMINDER] Step 2 (stale approved) error:', err.message);
            }

            // ==========================================
            // BƯỚC 3: SẮP TỚI HẠN (trong vòng 24h tới)
            // ==========================================
            try {
                const snap = await borrowRequestsCollection
                    .where('status', '==', 'handed_over')
                    .get();

                for (const doc of snap.docs) {
                    const data = doc.data() || {};
                    if (!data.dueAt) continue;

                    const dueMs = new Date(data.dueAt).getTime();
                    if (isNaN(dueMs)) continue;

                    // dueAt trong (now, now + DUE_SOON_MS] và chưa nhắc
                    if (dueMs > nowMs && dueMs <= nowMs + LIMITS.DUE_SOON_MS && !data.dueSoonRemindedAt) {
                        try {
                            // Ghi field reminder trước khi gửi email
                            await doc.ref.update({
                                dueSoonRemindedAt: nowIso,
                                updatedAt: nowIso
                            });

                            await borrowEmailService.sendDueSoon({ id: doc.id, ...data });
                        } catch (stepErr) {
                            console.error(`[BORROW REMINDER] Step 3 error on ${doc.id}:`, stepErr.message);
                        }
                    }
                }
            } catch (err) {
                console.error('[BORROW REMINDER] Step 3 (due soon) error:', err.message);
            }

            // ==========================================
            // BƯỚC 4: QUÁ HẠN (dueAt < now)
            // ==========================================
            try {
                const snap = await borrowRequestsCollection
                    .where('status', '==', 'handed_over')
                    .get();

                const repeatIntervalMs = LIMITS.DUE_SOON_MS; // 24h
                for (const doc of snap.docs) {
                    const data = doc.data() || {};
                    if (!data.dueAt) continue;

                    const dueMs = new Date(data.dueAt).getTime();
                    if (!isNaN(dueMs) && dueMs < nowMs) {
                        try {
                            const patch = {};
                            if (!data.isOverdue) {
                                patch.isOverdue = true;
                            }

                            const lastRemindedMs = data.overdueRemindedAt
                                ? new Date(data.overdueRemindedAt).getTime()
                                : 0;
                            const shouldSend =
                                !data.overdueRemindedAt || nowMs - lastRemindedMs > repeatIntervalMs;

                            if (shouldSend) {
                                patch.overdueRemindedAt = nowIso;
                            }

                            if (Object.keys(patch).length > 0) {
                                patch.updatedAt = nowIso;
                                await doc.ref.update(patch);
                            }

                            if (shouldSend) {
                                await borrowEmailService.sendOverdue({
                                    id: doc.id,
                                    ...data,
                                    isOverdue: true
                                });

                                const adminUids = await notificationService.getUidsByRoles([
                                    'admin',
                                    'manager'
                                ]);
                                if (adminUids.length > 0) {
                                    await notificationService.create({
                                        recipients: adminUids,
                                        type: 'error',
                                        title: 'Phiếu mượn quá hạn',
                                        message: `Phiếu #${doc.id} của ${data.borrower?.name || 'người mượn'} đã quá hạn trả thiết bị`,
                                        data: { borrowRequestId: doc.id },
                                        sender: 'Mượn trả thiết bị'
                                    });
                                }
                            }
                        } catch (stepErr) {
                            console.error(`[BORROW REMINDER] Step 4 error on ${doc.id}:`, stepErr.message);
                        }
                    }
                }
            } catch (err) {
                console.error('[BORROW REMINDER] Step 4 (overdue) error:', err.message);
            }
        } finally {
            this.running = false;
        }
    }
}

module.exports = new BorrowReminderJob();

