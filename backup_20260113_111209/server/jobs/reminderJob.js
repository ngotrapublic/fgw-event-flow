const { eventsCollection } = require('../config/firebase');
const emailService = require('../services/emailService');
const { getEventStartTime } = require('../utils/timeHelpers');

class ReminderJob {
    constructor() {
        this.intervalId = null;
    }

    start() {
        console.log('[REMINDER JOB] Starting background reminder job...');
        this.intervalId = setInterval(() => this.run(), 60000); // Every 60 seconds
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

        try {
            const snapshot = await eventsCollection.get();

            for (const doc of snapshot.docs) {
                const event = { id: doc.id, ...doc.data() };

                // Ensure flags exist
                if (!event.remindersSent) {
                    event.remindersSent = { oneDay: false, oneHour: false };
                }

                const eventStart = getEventStartTime(event);
                const timeDiffMs = eventStart - now;
                const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

                // 1 Day Reminder (23h to 25h)
                if (timeDiffHours >= 23 && timeDiffHours <= 25 && !event.remindersSent.oneDay) {
                    console.log(`[REMINDER] Sending 1-day reminder for "${event.eventName}"`);
                    await emailService.sendEventNotification(event, 'reminder_1day');

                    // [NEW] In-App Reminder
                    const notificationService = require('../services/notificationService');
                    await notificationService.create({
                        recipients: [event.createdBy],
                        type: 'warning',
                        title: 'Upcoming Event (24h)',
                        message: `"${event.eventName}" is scheduled for tomorrow.`,
                        data: { eventId: event.id },
                        sender: 'System'
                    });

                    await eventsCollection.doc(doc.id).update({
                        'remindersSent.oneDay': true
                    });
                }

                // 1 Hour Reminder (0.5h to 1.5h)
                if (timeDiffHours >= 0.5 && timeDiffHours <= 1.5 && !event.remindersSent.oneHour) {
                    console.log(`[REMINDER] Sending 1-hour reminder for "${event.eventName}"`);
                    await emailService.sendEventNotification(event, 'reminder_1hour');

                    // [NEW] In-App Reminder
                    const notificationService = require('../services/notificationService');
                    await notificationService.create({
                        recipients: [event.createdBy],
                        type: 'warning',
                        title: 'Event Starting Soon (1h)',
                        message: `"${event.eventName}" will start in 1 hour. Get ready!`,
                        data: { eventId: event.id },
                        sender: 'System'
                    });

                    await eventsCollection.doc(doc.id).update({
                        'remindersSent.oneHour': true
                    });
                }

                // [NEW] Background Welcome Notification for Imports (5-10 min delay)
                const createdAt = event.createdAt ? new Date(event.createdAt) : null;
                const fiveMinsAgo = new Date(now.getTime() - 5 * 60 * 1000);

                if (event.needsWelcomeNotification && createdAt && createdAt <= fiveMinsAgo) {
                    console.log(`[REMINDER] Sending delayed Welcome notification for "${event.eventName}"`);

                    // 1. Send Email (Ticket)
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
