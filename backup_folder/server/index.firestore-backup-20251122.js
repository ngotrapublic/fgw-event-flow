const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
require('dotenv').config();
const { admin, eventsCollection, departmentsCollection } = require('./firebase');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

console.log('🔥 Using Firebase Firestore for data storage');

// Email Configuration for Microsoft 365 (Outlook/Office 365)
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
    },
    tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false
    }
});

// Email Sending Helper
const sendEmail = async (recipients, subject, content) => {
    console.log(`\n[EMAIL SERVICE] Sending to: ${recipients.join(', ')}...`);

    const mailOptions = {
        from: `"Event Management System" <${EMAIL_USER}>`,
        to: recipients,
        subject: subject,
        text: content
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL SERVICE] Email sent: ${info.response}`);
    } catch (error) {
        console.error(`[EMAIL SERVICE] Error sending email:`, error);
    }
};

// Format Event Email Content
const formatEventEmail = (event) => {
    const timeString = (event.startTime && event.endTime)
        ? `${event.startTime} - ${event.endTime}`
        : event.eventSession;

    return `
    EVENT NOTIFICATION
    ------------------
    Event Name: ${event.eventName}
    Time: ${timeString} - ${event.eventDate} (${event.dayOfWeek || ''})
    Location: ${event.location}
    
    PREPARATION TASKS (CSVC):
    ${event.facilitiesSummary || 'None'}
    
    SETUP DETAILS:
    ${event.setup || 'None'}
    
    NOTES:
    ${event.notes || 'None'}
  `;
};

// Helper: Detect Changes
const getChanges = (oldEvent, newEvent) => {
    const changes = [];
    const fields = [
        { key: 'eventName', label: 'Event Name' },
        { key: 'eventDate', label: 'Date' },
        { key: 'startTime', label: 'Start Time' },
        { key: 'endTime', label: 'End Time' },
        { key: 'location', label: 'Location' },
        { key: 'facilitiesSummary', label: 'Facilities' },
        { key: 'notes', label: 'Notes' }
    ];

    fields.forEach(field => {
        if (oldEvent[field.key] !== newEvent[field.key]) {
            changes.push(`${field.label}: "${oldEvent[field.key] || ''}" -> "${newEvent[field.key] || ''}"`);
        }
    });
    return changes;
};

// Helper: Get Recipients (async - queries Firestore for department)
const getRecipients = async (event) => {
    const recipients = [];
    try {
        // 1. Query Department Emails from Firestore
        const snapshot = await departmentsCollection.where('name', '==', event.department).get();
        if (!snapshot.empty) {
            const dept = snapshot.docs[0].data();
            if (dept.emails && dept.emails.length > 0) {
                if (event.contactEmail) {
                    recipients.push(event.contactEmail);
                } else {
                    recipients.push(...dept.emails);
                }
            }
        }

        // 2. Registrant Email
        if (event.registrantEmail && !recipients.includes(event.registrantEmail)) {
            recipients.push(event.registrantEmail);
        }
    } catch (error) {
        console.error('Error getting recipients:', error);
    }
    return [...new Set(recipients)]; // Unique
};

// --- TIME HELPERS ---

const getEventStartTime = (event) => {
    const dateParts = event.eventDate.split('-');
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1;
    const day = parseInt(dateParts[2]);

    let hour = 7;
    let minute = 0;

    if (event.startTime) {
        const timeParts = event.startTime.split(':');
        hour = parseInt(timeParts[0]);
        minute = parseInt(timeParts[1]);
    } else {
        if (event.eventSession === 'Chiều') hour = 13;
        if (event.eventSession === 'Tối') hour = 18;
    }

    return new Date(year, month, day, hour, minute, 0);
};

const getEventEndTime = (event) => {
    const dateParts = event.eventDate.split('-');
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1;
    const day = parseInt(dateParts[2]);

    let hour = 11;
    let minute = 30;

    if (event.endTime) {
        const timeParts = event.endTime.split(':');
        hour = parseInt(timeParts[0]);
        minute = parseInt(timeParts[1]);
    } else {
        if (event.eventSession === 'Chiều') { hour = 17; minute = 30; }
        if (event.eventSession === 'Tối') { hour = 21; minute = 0; }
        if (event.eventSession === 'Cả ngày') { hour = 17; minute = 30; }
    }

    return new Date(year, month, day, hour, minute, 0);
};

// Helper: Check Conflict (async - queries Firestore for events)
const checkConflict = async (newEvent, excludeId = null) => {
    try {
        const snapshot = await eventsCollection
            .where('eventDate', '==', newEvent.eventDate)
            .where('location', '==', newEvent.location)
            .get();

        for (const doc of snapshot.docs) {
            const event = { id: doc.id, ...doc.data() };

            if (excludeId && event.id == excludeId) continue;

            const startA = getEventStartTime(newEvent);
            const endA = getEventEndTime(newEvent);
            const startB = getEventStartTime(event);
            const endB = getEventEndTime(event);

            if (startA < endB && endA > startB) {
                return event;
            }
        }
        return null;
    } catch (error) {
        console.error('Error checking conflict:', error);
        return null;
    }
};

// ==================== DEPARTMENT ENDPOINTS ====================

app.get('/api/departments', async (req, res) => {
    try {
        const snapshot = await departmentsCollection.get();
        const departments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(departments);
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ error: 'Failed to fetch departments' });
    }
});

app.post('/api/departments', async (req, res) => {
    try {
        const { name, email } = req.body;
        if (!name) return res.status(400).json({ message: 'Department name required' });

        const snapshot = await departmentsCollection.where('name', '==', name).get();
        if (!snapshot.empty) {
            return res.status(400).json({ message: 'Department already exists' });
        }

        const newDept = { name, emails: email ? [email] : [] };
        const docRef = await departmentsCollection.add(newDept);
        res.json({ id: docRef.id, ...newDept });
    } catch (error) {
        console.error('Error creating department:', error);
        res.status(500).json({ error: 'Failed to create department' });
    }
});

app.post('/api/departments/:name/emails', async (req, res) => {
    try {
        const { name } = req.params;
        const { email } = req.body;

        const snapshot = await departmentsCollection.where('name', '==', name).get();
        if (snapshot.empty) {
            return res.status(404).json({ message: 'Department not found' });
        }

        const doc = snapshot.docs[0];
        const dept = doc.data();

        if (email && !dept.emails.includes(email)) {
            dept.emails.push(email);
            await departmentsCollection.doc(doc.id).update({ emails: dept.emails });
        }

        res.json({ id: doc.id, ...dept });
    } catch (error) {
        console.error('Error adding email:', error);
        res.status(500).json({ error: 'Failed to add email' });
    }
});

app.put('/api/departments/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const { emails } = req.body;

        const snapshot = await departmentsCollection.where('name', '==', name).get();
        if (snapshot.empty) {
            return res.status(404).json({ message: 'Department not found' });
        }

        const doc = snapshot.docs[0];

        if (emails && Array.isArray(emails)) {
            await departmentsCollection.doc(doc.id).update({ emails });
        }

        const updated = await departmentsCollection.doc(doc.id).get();
        res.json({ id: doc.id, ...updated.data() });
    } catch (error) {
        console.error('Error updating department:', error);
        res.status(500).json({ error: 'Failed to update department' });
    }
});

app.put('/api/departments/:name/rename', async (req, res) => {
    try {
        const { name } = req.params;
        const { newName } = req.body;

        if (!newName) return res.status(400).json({ message: 'New name required' });

        const snapshot = await departmentsCollection.where('name', '==', name).get();
        if (snapshot.empty) {
            return res.status(404).json({ message: 'Department not found' });
        }

        const existingSnapshot = await departmentsCollection.where('name', '==', newName).get();
        if (!existingSnapshot.empty) {
            return res.status(400).json({ message: 'Department name already exists' });
        }

        const doc = snapshot.docs[0];
        await departmentsCollection.doc(doc.id).update({ name: newName });

        const updated = await departmentsCollection.doc(doc.id).get();
        res.json({ id: doc.id, ...updated.data() });
    } catch (error) {
        console.error('Error renaming department:', error);
        res.status(500).json({ error: 'Failed to rename department' });
    }
});

app.delete('/api/departments/:name', async (req, res) => {
    try {
        const { name } = req.params;

        const snapshot = await departmentsCollection.where('name', '==', name).get();
        if (snapshot.empty) {
            return res.status(404).json({ message: 'Department not found' });
        }

        const doc = snapshot.docs[0];
        await departmentsCollection.doc(doc.id).delete();

        res.json({ message: 'Department deleted' });
    } catch (error) {
        console.error('Error deleting department:', error);
        res.status(500).json({ error: 'Failed to delete department' });
    }
});

// ==================== EVENT ENDPOINTS ====================

app.get('/api/events', async (req, res) => {
    try {
        const snapshot = await eventsCollection.get();
        const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(events);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

app.post('/api/events/check-conflict', async (req, res) => {
    try {
        const { eventDate, startTime, endTime, location, excludeId } = req.body;
        const checkEvent = { eventDate, startTime, endTime, location, eventSession: 'Custom' };

        const conflict = await checkConflict(checkEvent, excludeId);

        if (conflict) {
            res.json({ conflict: true, conflictingEvent: conflict });
        } else {
            res.json({ conflict: false });
        }
    } catch (error) {
        console.error('Error checking conflict:', error);
        res.status(500).json({ error: 'Failed to check conflict' });
    }
});

app.post('/api/events', async (req, res) => {
    try {
        const newEvent = {
            ...req.body,
            remindersSent: { oneDay: false, oneHour: false }
        };

        const docRef = await eventsCollection.add(newEvent);

        // Send Notification
        const recipients = await getRecipients(newEvent);
        if (recipients.length > 0) {
            const subject = `New Event Registered: ${newEvent.eventName}`;
            const content = formatEventEmail(newEvent);
            await sendEmail(recipients, subject, content);
        }

        res.status(201).json({ id: docRef.id, ...newEvent });
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ error: 'Failed to create event' });
    }
});

app.put('/api/events/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const doc = await eventsCollection.doc(id).get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const oldEvent = { id: doc.id, ...doc.data() };
        const updatedEvent = { ...oldEvent, ...req.body };

        await eventsCollection.doc(id).update(req.body);

        // Calculate Diff
        const changes = getChanges(oldEvent, updatedEvent);

        if (changes.length > 0) {
            const recipients = await getRecipients(updatedEvent);
            if (recipients.length > 0) {
                const subject = `Event Updated: ${updatedEvent.eventName}`;
                const content = `
    EVENT UPDATED
    -------------
    The following changes were made:
    
    ${changes.map(c => `- ${c}`).join('\n')}
    
    ---------------------------------------------------
    CURRENT EVENT DETAILS:
    ${formatEventEmail(updatedEvent)}
        `;
                await sendEmail(recipients, subject, content);
            }
        }

        res.json({ id, ...updatedEvent });
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({ error: 'Failed to update event' });
    }
});

app.delete('/api/events/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[DELETE] Request to delete event ID: ${id}`);

        const doc = await eventsCollection.doc(id).get();
        if (!doc.exists) {
            console.log(`[DELETE] Event not found with ID: ${id}`);
            return res.status(404).json({ message: 'Event not found' });
        }

        const deletedEvent = doc.data();
        await eventsCollection.doc(id).delete();

        console.log(`[DELETE] Successfully deleted event: ${deletedEvent.eventName}`);
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ error: 'Failed to delete event' });
    }
});

app.post('/api/notify', async (req, res) => {
    try {
        const { recipients, email, eventName, event } = req.body;
        const targetEmails = recipients || [email];

        let content = '';
        let subject = '';

        if (event) {
            subject = req.body.subject || `New Event Registered: ${event.eventName}`;
            content = formatEventEmail(event);
        } else {
            subject = `Notification for Event: ${eventName}`;
            content = `Please check the dashboard for details regarding "${eventName}".`;
        }

        await sendEmail(targetEmails, subject, content);
        res.json({ message: 'Email sent successfully' });
    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({ error: 'Failed to send notification' });
    }
});

// ==================== BACKGROUND REMINDER JOB ====================

setInterval(async () => {
    const now = new Date();

    try {
        // Get all events from Firestore
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

            // 1. Check 1 Day Reminder (23h to 25h)
            if (timeDiffHours >= 23 && timeDiffHours <= 25 && !event.remindersSent.oneDay) {
                console.log(`[REMINDER] Sending 1-day reminder for "${event.eventName}"`);
                const recipients = await getRecipients(event);
                if (recipients.length > 0) {
                    const subject = `[NHẮC NHỞ] Sự kiện ngày mai: ${event.eventName}`;
                    const content = `
        Xin chào,
        
        Đây là email nhắc nhở tự động. Sự kiện sau đây sẽ diễn ra vào ngày mai:
        
        ${formatEventEmail(event)}
        
        Vui lòng kiểm tra công tác chuẩn bị.
          `;
                    await sendEmail(recipients, subject, content);

                    // Update flag in Firestore
                    await eventsCollection.doc(doc.id).update({
                        'remindersSent.oneDay': true
                    });
                }
            }

            // 2. Check 1 Hour Reminder (0.5h to 1.5h)
            if (timeDiffHours >= 0.5 && timeDiffHours <= 1.5 && !event.remindersSent.oneHour) {
                console.log(`[REMINDER] Sending 1-hour reminder for "${event.eventName}"`);
                const recipients = await getRecipients(event);
                if (recipients.length > 0) {
                    const subject = `[KHẨN] Nhắc nhở sự kiện sắp diễn ra: ${event.eventName}`;
                    const content = `
        Xin chào,
        
        Sự kiện sau đây sẽ diễn ra trong khoảng 1 giờ tới:
        
        ${formatEventEmail(event)}
        
        Vui lòng hoàn tất công tác chuẩn bị.
          `;
                    await sendEmail(recipients, subject, content);

                    // Update flag in Firestore
                    await eventsCollection.doc(doc.id).update({
                        'remindersSent.oneHour': true
                    });
                }
            }
        }
    } catch (error) {
        console.error('[REMINDER] Error in reminder job:', error);
    }
}, 60000); // Run every 60 seconds

// ==================== START SERVER ====================

app.listen(PORT, () => {
    console.log(`🔥 Firebase Firestore Backend`);
    console.log(`Server running on http://localhost:${PORT}`);
});
