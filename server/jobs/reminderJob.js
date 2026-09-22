const { eventsCollection } = require('../config/firebase');
const emailService = require('../services/emailService');
const { getEventStartTime } = require('../utils/timeHelpers');

class ReminderJob {
    constructor() {
        this.intervalId = null;
    }

    start() {
        console.log('[REMINDER JOB] Starting background reminder job... (interval: 15m)');
        // Run immediately on start so upcoming reminders are not delayed by 15-30m
        this.run().catch(err => console.error('[REMINDER JOB] Initial run error:', err));
        this.intervalId = setInterval(() => this.run(), 900000); // Every 15 minutes
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('[REMINDER JOB] Stopped');
        }
    }

    async run() {
        const now = new Date();
        const tzOffset = 7 * 60 * 60 * 1000;
        const nowLocal = new Date(now.getTime() + tzOffset);
        
        // Fetch Today, Tomorrow, and the Day After Tomorrow (to cover 24h+ boundaries safely)
        const datesToFetch = [];
        for (let i = 0; i <= 2; i++) {
            const d = new Date(nowLocal.getTime() + i * 24 * 60 * 60 * 1000);
            datesToFetch.push(d.toISOString().split('T')[0]);
        }

        try {
            // [FIX] No limit() so we don't accidentally truncate tomorrow's events if today is busy!
            // Query exactly the 3-day window we care about for 1h and 24h reminders.
            const snapshot = await eventsCollection
                .where('eventDate', 'in', datesToFetch)
                .get();

            for (const doc of snapshot.docs) {
                const event = { id: doc.id, ...doc.data() };

                // Ensure flags exist
                if (!event.remindersSent) {
                    event.remindersSent = { oneDay: false, oneHour: false };
                }

                // [FIX] Anti-Spam for Multi-Day Events (Series)
                // If this is a child event in a series (not the first day), SKIP all reminders
                if (event.groupId && !event.isSeriesStart) {
                    continue; // Do not send 1-day or 1-hour reminders for days 2, 3, 4... etc.
                }

                const eventStart = getEventStartTime(event);
                const timeDiffMs = eventStart - now;
                const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

                // 1. 1-Hour Reminder: Triggered when event is starting within 1.5 hours (and not already in the past)
                if (timeDiffHours > 0 && timeDiffHours <= 1.5 && !event.remindersSent.oneHour) {
                    console.log(`[REMINDER] Queueing 1-hour reminder email for "${event.eventName}"`);
                    const emailQueue = require('../services/emailQueue');
                    await emailQueue.enqueue(event, 'reminder_1hour');

                    console.log(`[REMINDER] Sending 1-hour in-app reminder for "${event.eventName}"`);

                    // [NEW] In-App Reminder (Creator + Admin)
                    const notificationService = require('../services/notificationService');
                    const adminUids = await notificationService.getAdminUids();
                    await notificationService.create({
                        recipients: [event.createdBy, ...adminUids].filter(Boolean),
                        type: 'warning',
                        title: 'Event Starting Soon (1h)',
                        message: `"${event.eventName}" will start in 1 hour. Get ready!`,
                        data: { eventId: event.id },
                        sender: 'System'
                    });

                    // Update flags safely preserving existing map
                    await eventsCollection.doc(doc.id).set({
                        remindersSent: {
                            ...(event.remindersSent || {}),
                            oneDay: true,
                            oneHour: true
                        }
                    }, { merge: true });
                }
                // 2. 1-Day Reminder: Triggered when event is within 24h (and > 1.5h away)
                else if (timeDiffHours > 1.5 && timeDiffHours <= 24 && !event.remindersSent.oneDay) {
                    console.log(`[REMINDER] Queueing 1-day reminder for "${event.eventName}"`);
                    const emailQueue = require('../services/emailQueue');
                    await emailQueue.enqueue(event, 'reminder_1day');

                    // [NEW] In-App Reminder (Creator + Admin)
                    const notificationService = require('../services/notificationService');
                    const adminUids = await notificationService.getAdminUids();
                    await notificationService.create({
                        recipients: [event.createdBy, ...adminUids].filter(Boolean),
                        type: 'warning',
                        title: 'Upcoming Event (24h)',
                        message: `"${event.eventName}" is scheduled for tomorrow.`,
                        data: { eventId: event.id },
                        sender: 'System'
                    });

                    // Update flags safely preserving existing map
                    await eventsCollection.doc(doc.id).set({
                        remindersSent: {
                            ...(event.remindersSent || {}),
                            oneDay: true
                        }
                    }, { merge: true });
                }
            }

            // ==========================================
            // [FIX] Separate Welcome Notification Query
            // ==========================================
            // Previously, welcome emails were bundled in the date query. 
            // If an event was imported for next month, the welcome email wouldn't send until next month!
            const welcomeSnapshot = await eventsCollection
                .where('needsWelcomeNotification', '==', true)
                .limit(50)
                .get();

            for (const doc of welcomeSnapshot.docs) {
                const event = { id: doc.id, ...doc.data() };
                const createdAt = event.createdAt ? new Date(event.createdAt) : null;
                const fiveMinsAgo = new Date(now.getTime() - 5 * 60 * 1000);

                if (createdAt && createdAt <= fiveMinsAgo) {
                    console.log(`[REMINDER] Sending delayed Welcome notification for imported event "${event.eventName}"`);

                    // 1. Send Email
                    await emailService.sendEventNotification(event, 'created');

                    // 2. Send In-App Notification
                    const notificationService = require('../services/notificationService');
                    await notificationService.create({
                        recipients: [event.createdBy],
                        type: 'success',
                        title: 'Event Imported & Verified',
                        message: `"${event.eventName}" has been successfully processed.`,
                        data: { eventId: event.id },
                        sender: 'System'
                    });

                    // 3. Clear Flag
                    await eventsCollection.doc(doc.id).update({
                        needsWelcomeNotification: false
                    });
                }
            }
        } catch (error) {
            console.error('[REMINDER] Error in reminder job:', error);
        }
    }
}

module.exports = new ReminderJob();
