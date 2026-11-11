const {
    admin,
    db,
    borrowRequestsCollection,
    borrowReminderOutboxCollection,
    borrowLinkCodesCollection,
    borrowIdempotencyCollection,
    borrowOtpsCollection
} = require('../config/firebase');
const { newToken, hash } = require('../services/borrow-token-service');
const { transition } = require('../services/borrow-transition-service');
const { LIMITS } = require('../services/borrow-constants');
const borrowEmailService = require('../services/borrow-email-service');
const notificationService = require('../services/notificationService');

class BorrowReminderJob {
    constructor(workerId = `worker_${process.pid}_${Math.random().toString(36).slice(2, 8)}`) {
        this.workerId = workerId;
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

    /**
     * Atomically claim an outbox lease (pending/failed -> sending) and, if needed,
     * mint & store a single-use link code inside the SAME Firestore transaction.
     */
    async claimOutboxSlot({
        outboxKey,
        requestId,
        reminderType,
        reqFieldSentAt,
        expectedStatus,
        markIsOverdue = false,
        issueLinkCode = false,
        nowMs = Date.now()
    }) {
        const outboxRef = borrowReminderOutboxCollection.doc(outboxKey);
        const reqRef = borrowRequestsCollection.doc(requestId);
        const nowIso = new Date(nowMs).toISOString();

        return db.runTransaction(async (tx) => {
            const [reqSnap, outboxSnap] = await Promise.all([
                tx.get(reqRef),
                tx.get(outboxRef)
            ]);

            if (!reqSnap.exists) return { claimed: false };
            const reqData = reqSnap.data() || {};
            if (reqData.status !== expectedStatus) return { claimed: false };

            if (reqFieldSentAt && reminderType !== 'overdue' && reqData[reqFieldSentAt]) {
                return { claimed: false };
            }

            if (reminderType === 'overdue' && reqData.overdueRemindedAt) {
                const lastSentMs = new Date(reqData.overdueRemindedAt).getTime();
                if (!isNaN(lastSentMs) && nowMs - lastSentMs <= LIMITS.DUE_SOON_MS) {
                    return { claimed: false };
                }
            }

            const outbox = outboxSnap.exists ? (outboxSnap.data() || {}) : null;
            if (outbox) {
                if (outbox.status === 'sent' && outbox.sentAt) {
                    return { claimed: false };
                }
                if (outbox.status === 'sending' && outbox.leaseExpiresAt && outbox.leaseExpiresAt > nowMs) {
                    return { claimed: false };
                }
                if (outbox.status === 'failed' && outbox.nextRetryAt) {
                    const retryMs = new Date(outbox.nextRetryAt).getTime();
                    if (!isNaN(retryMs) && retryMs > nowMs) {
                        return { claimed: false };
                    }
                }
            }

            if (markIsOverdue && !reqData.isOverdue) {
                tx.update(reqRef, { isOverdue: true, updatedAt: nowIso });
            }

            let linkCode = null;
            let linkCodeHash = null;
            if (issueLinkCode) {
                linkCode = newToken();
                linkCodeHash = hash(linkCode);
                tx.set(borrowLinkCodesCollection.doc(linkCodeHash), {
                    requestId,
                    purpose: 'manage',
                    createdAt: nowMs,
                    expiresAt: nowMs + LIMITS.LINK_CODE_TTL_MS,
                    consumedAt: null,
                    revokedAt: null
                });
            }

            tx.set(outboxRef, {
                id: outboxKey,
                requestId,
                reminderType,
                status: 'sending',
                leaseOwner: this.workerId,
                leaseExpiresAt: nowMs + LIMITS.REMINDER_LEASE_MS,
                sentAt: null,
                nextRetryAt: null,
                retryCount: outbox?.retryCount || 0,
                linkCodeHash,
                lastError: null,
                updatedAt: nowIso
            });

            return {
                claimed: true,
                outboxRef,
                reqRef,
                reqData: markIsOverdue ? { ...reqData, isOverdue: true } : reqData,
                linkCode,
                linkCodeHash
            };
        });
    }

    /**
     * Atomically finalize outbox slot and request sent timestamp in a single Firestore batch commit.
     * Note on delivery semantics: Lease claim prevents concurrent multi-worker sends; however, because
     * Nodemailer/SMTP lacks provider-side idempotency keys, delivery remains at-least-once if the
     * process crashes after the mail server accepts the message and before this batch commits.
     */
    async completeOutboxSlot({ outboxRef, reqRef, reqFieldSentAt }) {
        const sentAtIso = new Date(Date.now()).toISOString();
        const batch = db.batch();
        batch.update(outboxRef, {
            status: 'sent',
            sentAt: sentAtIso,
            leaseExpiresAt: null,
            nextRetryAt: null,
            lastError: null,
            updatedAt: sentAtIso
        });
        batch.update(reqRef, {
            [reqFieldSentAt]: sentAtIso,
            updatedAt: sentAtIso
        });
        await batch.commit();
    }

    async failOutboxSlot({ outboxRef, linkCodeHash, err }) {
        const failNowMs = Date.now();
        const failIso = new Date(failNowMs).toISOString();
        const nextRetryIso = new Date(failNowMs + LIMITS.REMINDER_RETRY_DELAY_MS).toISOString();

        await db.runTransaction(async (tx) => {
            const snap = await tx.get(outboxRef);
            const cur = snap.exists ? (snap.data() || {}) : {};
            const codeSnap = linkCodeHash
                ? await tx.get(borrowLinkCodesCollection.doc(linkCodeHash))
                : null;

            tx.set(outboxRef, {
                ...cur,
                status: 'failed',
                sentAt: null,
                leaseExpiresAt: null,
                retryCount: (cur.retryCount || 0) + 1,
                nextRetryAt: nextRetryIso,
                lastError: err?.message || 'Send failed',
                updatedAt: failIso
            });

            if (codeSnap && codeSnap.exists && !codeSnap.data()?.consumedAt) {
                tx.update(borrowLinkCodesCollection.doc(linkCodeHash), {
                    revokedAt: failNowMs
                });
            }
        });
    }

    async run() {
        if (this.running) {
            console.log('[BORROW REMINDER JOB] Previous run still in progress, skipping iteration.');
            return;
        }

        this.running = true;
        const nowMs = Date.now();

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
                            if (stepErr?.statusCode !== 409) {
                                console.error(
                                    `[BORROW REMINDER] Failed to expire request ${doc.id}:`,
                                    stepErr.message
                                );
                            }
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
                        let claim = null;
                        try {
                            claim = await this.claimOutboxSlot({
                                outboxKey: `approved_stale:${doc.id}`,
                                requestId: doc.id,
                                reminderType: 'approved_stale',
                                reqFieldSentAt: 'approvedStaleNotifiedAt',
                                expectedStatus: 'approved',
                                issueLinkCode: false,
                                nowMs
                            });
                            if (!claim.claimed) continue;

                            const adminUids = await notificationService.getUidsByRoles(['admin', 'manager']);
                            if (adminUids.length > 0) {
                                await notificationService.create({
                                    recipients: adminUids,
                                    type: 'warning',
                                    title: 'Phiếu đã duyệt 3 ngày chưa nhận',
                                    message: `Phiếu #${doc.id} của ${claim.reqData.borrower?.name || 'người mượn'} đã duyệt 3 ngày chưa nhận thiết bị`,
                                    data: { borrowRequestId: doc.id },
                                    sender: 'Mượn trả thiết bị'
                                });
                            }

                            await this.completeOutboxSlot({
                                outboxRef: claim.outboxRef,
                                reqRef: claim.reqRef,
                                reqFieldSentAt: 'approvedStaleNotifiedAt'
                            });
                        } catch (stepErr) {
                            if (claim?.claimed) {
                                await this.failOutboxSlot({
                                    outboxRef: claim.outboxRef,
                                    linkCodeHash: claim.linkCodeHash,
                                    err: stepErr
                                }).catch(() => {});
                            }
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
                        let claim = null;
                        try {
                            claim = await this.claimOutboxSlot({
                                outboxKey: `due_soon:${doc.id}:${data.dueDate || 'default'}`,
                                requestId: doc.id,
                                reminderType: 'due_soon',
                                reqFieldSentAt: 'dueSoonRemindedAt',
                                expectedStatus: 'handed_over',
                                issueLinkCode: true,
                                nowMs
                            });
                            if (!claim.claimed) continue;

                            await borrowEmailService.sendDueSoon(
                                { id: doc.id, ...claim.reqData },
                                claim.linkCode
                            );

                            await this.completeOutboxSlot({
                                outboxRef: claim.outboxRef,
                                reqRef: claim.reqRef,
                                reqFieldSentAt: 'dueSoonRemindedAt'
                            });
                        } catch (stepErr) {
                            if (claim?.claimed) {
                                await this.failOutboxSlot({
                                    outboxRef: claim.outboxRef,
                                    linkCodeHash: claim.linkCodeHash,
                                    err: stepErr
                                }).catch(() => {});
                            }
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
                        const lastRemindedMs = data.overdueRemindedAt
                            ? new Date(data.overdueRemindedAt).getTime()
                            : 0;
                        const shouldSend =
                            !data.overdueRemindedAt || nowMs - lastRemindedMs > repeatIntervalMs;

                        if (!shouldSend) {
                            if (!data.isOverdue) {
                                await doc.ref.update({
                                    isOverdue: true,
                                    updatedAt: new Date(nowMs).toISOString()
                                }).catch(() => {});
                            }
                            continue;
                        }

                        const windowIdx = Math.max(0, Math.floor((nowMs - dueMs) / repeatIntervalMs));
                        let claim = null;
                        try {
                            claim = await this.claimOutboxSlot({
                                outboxKey: `overdue:${doc.id}:w${windowIdx}`,
                                requestId: doc.id,
                                reminderType: 'overdue',
                                reqFieldSentAt: 'overdueRemindedAt',
                                expectedStatus: 'handed_over',
                                markIsOverdue: true,
                                issueLinkCode: true,
                                nowMs
                            });
                            if (!claim.claimed) continue;

                            await borrowEmailService.sendOverdue(
                                { id: doc.id, ...claim.reqData, isOverdue: true },
                                claim.linkCode
                            );

                            await this.completeOutboxSlot({
                                outboxRef: claim.outboxRef,
                                reqRef: claim.reqRef,
                                reqFieldSentAt: 'overdueRemindedAt'
                            });

                            try {
                                const adminUids = await notificationService.getUidsByRoles([
                                    'admin',
                                    'manager'
                                ]);
                                if (adminUids.length > 0) {
                                    await notificationService.create({
                                        recipients: adminUids,
                                        type: 'error',
                                        title: 'Phiếu mượn quá hạn',
                                        message: `Phiếu #${doc.id} của ${claim.reqData.borrower?.name || 'người mượn'} đã quá hạn trả thiết bị`,
                                        data: { borrowRequestId: doc.id },
                                        sender: 'Mượn trả thiết bị'
                                    });
                                }
                            } catch (notifErr) {
                                console.error(
                                    `[BORROW REMINDER] Step 4 notification error on ${doc.id}:`,
                                    notifErr.message
                                );
                            }
                        } catch (stepErr) {
                            if (claim?.claimed) {
                                await this.failOutboxSlot({
                                    outboxRef: claim.outboxRef,
                                    linkCodeHash: claim.linkCodeHash,
                                    err: stepErr
                                }).catch(() => {});
                            }
                            console.error(`[BORROW REMINDER] Step 4 error on ${doc.id}:`, stepErr.message);
                        }
                    }
                }
            } catch (err) {
                console.error('[BORROW REMINDER] Step 4 (overdue) error:', err.message);
            }

            // ==========================================
            // BƯỚC 5: DỌN DẸP IDEMPOTENCY & OTP HẾT HẠN
            // (Kết hợp tốt với Firestore TTL policy trên expiresAt / retainUntil Timestamp)
            // ==========================================
            try {
                const nowCleanupVal = admin?.firestore?.Timestamp?.fromMillis
                    ? admin.firestore.Timestamp.fromMillis(Date.now())
                    : new Date();

                if (borrowIdempotencyCollection) {
                    const expiredIdemSnap = await borrowIdempotencyCollection
                        .where('expiresAt', '<', nowCleanupVal)
                        .limit(100)
                        .get();
                    if (!expiredIdemSnap.empty) {
                        const idemBatch = db.batch();
                        expiredIdemSnap.docs.forEach((doc) => idemBatch.delete(doc.ref));
                        await idemBatch.commit();
                    }
                }

                if (borrowOtpsCollection) {
                    const expiredOtpSnap = await borrowOtpsCollection
                        .where('retainUntil', '<', nowCleanupVal)
                        .limit(100)
                        .get();
                    if (!expiredOtpSnap.empty) {
                        const otpBatch = db.batch();
                        expiredOtpSnap.docs.forEach((doc) => otpBatch.delete(doc.ref));
                        await otpBatch.commit();
                    }
                }
            } catch (err) {
                console.error('[BORROW REMINDER] Step 5 (expired idempotency/OTP cleanup) error:', err.message);
            }
        } finally {
            this.running = false;
        }
    }
}

const defaultInstance = new BorrowReminderJob();
defaultInstance.BorrowReminderJob = BorrowReminderJob;
module.exports = defaultInstance;
