const { eventsCollection, db, resourcesCollection } = require('../config/firebase'); // Need db for role check if not in req.user
const emailService = require('../services/emailService');
const { checkConflict } = require('../utils/conflictChecker');
const { logAction } = require('../controllers/auditLogController');

// Helper: Check if user can modify event
const canModifyEvent = (user, event) => {
    // Admin and Manager can do anything
    if (user.role === 'admin' || user.role === 'manager') return true;

    // User can only modify their own events
    if (user.role === 'user' && event.createdBy === user.uid) return true;

    return false;
};

/**
 * Get all events
 */
exports.getAllEvents = async (req, res, next) => {
    try {
        const snapshot = await eventsCollection.get();
        const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(events);
    } catch (error) {
        next(error);
    }
};

/**
 * Get single event by ID
 */
exports.getEventById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const doc = await eventsCollection.doc(id).get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Event not found' });
        }

        res.json({ id: doc.id, ...doc.data() });
    } catch (error) {
        next(error);
    }
};

/**
 * Check for event conflicts
 */
exports.checkConflict = async (req, res, next) => {
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
        next(error);
    }
};

/**
 * Create a new event
 */
exports.createEvent = async (req, res, next) => {
    try {
        // req.user is set by verifyToken middleware (contains uid, and potentially we need to fetch role if not enabled in middleware completely,
        // but verifyToken only decodes token. Role is usually in Firestore.
        // However, we can assume 'user' role default or fetch it.
        // For 'createdBy', we just need uid.

        const { uid } = req.user;

        const newEvent = {
            ...req.body,
            createdBy: uid, // Track author
            createdAt: new Date().toISOString(),
            remindersSent: { oneDay: false, oneHour: false }
        };

        const docRef = await eventsCollection.add(newEvent);

        // Send notification via Email
        await emailService.sendEventNotification(newEvent, 'created');

        // [NEW] Send In-App Notification (Run this first or in parallel to ensure UI updates fast)
        try {
            const notificationService = require('../services/notificationService');

            // We await this, but catch errors so it doesn't block response
            await notificationService.create({
                recipients: [newEvent.createdBy],
                type: 'success',
                title: 'Event Registered',
                message: `You have successfully registered "${newEvent.eventName}".`,
                metadata: { eventId: docRef.id },
                sender: 'System'
            });

            // LOGGING
            const actor = req.user ? req.user.email : uid;
            const role = req.user ? req.user.role : 'user';

            await logAction({
                actor, role, action: 'CREATE', target: `Event: ${newEvent.eventName}`, details: { id: docRef.id, ...newEvent }, ip: req.ip
            });

        } catch (notifError) {
            console.error('Notification/Logging error:', notifError);
        }

        // Send notification via Email (Wrap in try-catch to not fail the request if email fails)
        try {
            await emailService.sendEventNotification(newEvent, 'created');
        } catch (emailError) {
            console.error('[CREATE EVENT] Email sending failed:', emailError.message);
            // We do NOT call next(error) here because we still want to return success to the UI
        }

        res.status(201).json({ id: docRef.id, ...newEvent });
    } catch (error) {
        next(error);
    }
};

/**
 * Update an event
 */
exports.updateEvent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { uid } = req.user;

        // Fetch Event
        const doc = await eventsCollection.doc(id).get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Event not found' });
        }
        const oldEvent = { id: doc.id, ...doc.data() };

        // Fetch User Role to verify permissions
        // Note: verifyToken gives us req.user from Auth token. 
        // We need to know the Role. 
        // Option 1: Pass role in Header (insecure).
        // Option 2: Verify against Firestore.
        const userDoc = await db.collection('users').doc(uid).get();
        const userData = userDoc.exists ? userDoc.data() : { role: 'user' };

        // Check Permissions
        if (!canModifyEvent({ uid, ...userData }, oldEvent)) {
            return res.status(403).json({ error: 'Permission denied: You can only edit your own events.' });
        }

        const updatedEvent = { ...oldEvent, ...req.body };

        await eventsCollection.doc(id).update(req.body);

        // LOGGING
        const actor = req.user ? req.user.email : 'Unknown';
        const role = req.user ? req.user.role : 'user';
        await logAction({
            actor, role, action: 'UPDATE', target: `Event: ${oldEvent.eventName || id}`, details: req.body, ip: req.ip
        });

        // Calculate changes
        const changes = emailService.detectChanges(oldEvent, updatedEvent);

        console.log(`[UPDATE] Event ID: ${id}`);
        console.log(`[UPDATE] Detected changes:`, changes);

        if (changes.length > 0) {
            updatedEvent.changes = changes;
            console.log('[UPDATE] Sending notification email...');
            await emailService.sendEventNotification(updatedEvent, 'updated');

            // [NEW] Send In-App Notification
            try {
                const notificationService = require('../services/notificationService');

                // Notify Creator that their event was updated (if they didn't do it themselves?)
                // Or just notify them always.
                // We might also want to notify the person who triggered the update if different? No need.

                // Recipients: 
                // 1. Creator (uid)
                // 2. Department Users? (Complex to find UIDs from Dep name without query)

                const recipients = [oldEvent.createdBy];

                await notificationService.create({
                    recipients,
                    type: 'info',
                    title: 'Event Updated',
                    message: `Event "${updatedEvent.eventName}" has been updated.`,
                    data: { eventId: id, changes },
                    sender: 'System'
                });
            } catch (notifError) {
                console.error('[UPDATE NOTIF ERROR]', notifError);
            }

        } else {
            console.log('[UPDATE] No significant changes detected, skipping email.');
        }

        res.json({ id, ...updatedEvent });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete an event
 */
exports.deleteEvent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { uid } = req.user;

        const doc = await eventsCollection.doc(id).get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Event not found' });
        }
        const deletedEvent = doc.data();

        // Fetch User Role
        const userDoc = await db.collection('users').doc(uid).get();
        const userData = userDoc.exists ? userDoc.data() : { role: 'user' };

        // Check Permissions
        if (!canModifyEvent({ uid, ...userData }, deletedEvent)) {
            return res.status(403).json({ error: 'Permission denied: You can only delete your own events.' });
        }

        await eventsCollection.doc(id).delete();

        // LOGGING
        const actor = req.user ? req.user.email : 'Unknown';
        const role = req.user ? req.user.role : 'user';
        await logAction({
            actor, role, action: 'DELETE', target: `Event: ${deletedEvent.eventName || id}`, details: {}, ip: req.ip
        });

        console.log(`[DELETE] Successfully deleted event: ${deletedEvent.eventName}`);
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        next(error);
    }
};

/**
 * Export events to CSV
 */
exports.exportEventsCsv = async (req, res, next) => {
    try {
        // Fetch events and resources in parallel
        const [eventsSnapshot, resourcesSnapshot] = await Promise.all([
            eventsCollection.get(),
            resourcesCollection.get()
        ]);

        const events = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Create Resource Map (ID -> Label)
        const resourceMap = {};
        if (!resourcesSnapshot.empty) {
            resourcesSnapshot.forEach(doc => {
                const data = doc.data();
                resourceMap[doc.id] = data.label || data.name || doc.id;
            });
        }

        // Sort by Date then Time
        events.sort((a, b) => {
            if (a.eventDate !== b.eventDate) return a.eventDate.localeCompare(b.eventDate);
            return a.startTime.localeCompare(b.startTime);
        });

        // Headers
        const headers = ['STT', 'THỨ', 'NGÀY', 'THỜI GIAN', 'TÊN SỰ KIỆN', 'ĐỊA ĐIỂM TỔ CHỨC', 'PHỤ TRÁCH', 'CSVC CẦN SỬ DỤNG', 'GHI CHÚ'];

        let csvContent = headers.join(',') + '\n';

        // Helper: Convert YYYY-MM-DD to DD/MM/YYYY
        const formatDate = (isoDate) => {
            if (!isoDate || typeof isoDate !== 'string') return '';
            try {
                const parts = isoDate.split('-');
                if (parts.length !== 3) return isoDate;
                const [y, m, d] = parts;
                return `${d}/${m}/${y}`;
            } catch (e) { return isoDate; }
        };

        // Helper: Get Day of Week
        const getDayOfWeek = (isoDate) => {
            if (!isoDate) return '';
            try {
                const date = new Date(isoDate);
                const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
                return days[date.getDay()] || '';
            } catch (e) { return ''; }
        };

        // Helper: Format Time
        const formatTime = (start, end) => {
            if (!start || !end) return '';
            try {
                const startHour = parseInt(start.split(':')[0]);
                if (isNaN(startHour)) return `${start} - ${end}`;

                let period = 'Sáng';
                if (startHour >= 12 && startHour < 18) period = 'Chiều';
                if (startHour >= 18) period = 'Tối';
                return `${period} (${start} - ${end})`;
            } catch (e) { return `${start} - ${end}`; }
        };

        // Helper: Format Resources (Grouped by Location)
        const formatResources = (event) => {
            // Prioritize facilitiesChecklist if available
            if (event.facilitiesChecklist && Object.keys(event.facilitiesChecklist).length > 0) {
                const locationMap = {};
                const generalItems = []; // For items without specific distribution

                Object.entries(event.facilitiesChecklist).forEach(([key, value]) => {
                    if (value.checked) {
                        const name = resourceMap[key] || key;
                        const total = value.quantity || 0;

                        // Check for specific distribution
                        if (value.distribution && Object.keys(value.distribution).length > 0) {
                            Object.entries(value.distribution).forEach(([loc, qty]) => {
                                if (parseInt(qty) > 0) {
                                    if (!locationMap[loc]) locationMap[loc] = [];
                                    locationMap[loc].push(`${name} (${qty})`);
                                }
                            });
                        } else {
                            // No detailed distribution, assign to "General" or main location
                            // If event has single location, put it there.
                            // If event has multiple locations but no distribution, put in first or "Chung".
                            let targetLoc = 'Chung';
                            if (event.location && !Array.isArray(event.location)) {
                                targetLoc = event.location;
                            } else if (Array.isArray(event.location) && event.location.length === 1) {
                                targetLoc = event.location[0];
                            } else if (Array.isArray(event.location) && event.location.length > 1) {
                                targetLoc = event.location.join(', '); // Or just "Chung"
                            }

                            if (!locationMap[targetLoc]) locationMap[targetLoc] = [];
                            locationMap[targetLoc].push(`${name} (${total})`);
                        }
                    }
                });

                // Format the output
                const parts = [];
                Object.entries(locationMap).forEach(([loc, items]) => {
                    if (items.length > 0) {
                        parts.push(`${loc}:\n${items.join('; ')}`);
                    }
                });

                return parts.join('\n\n');
            }

            // Fallback
            if (Array.isArray(event.resources)) {
                return event.resources.map(r => r.name || r).join('; ');
            }

            return event.facilitiesSummary || '';
        };

        // Escape CSV fields
        const escapeCsv = (str) => {
            if (!str) return '';
            const safeStr = String(str);
            if (/[,"\n]/.test(safeStr)) {
                return `"${safeStr.replace(/"/g, '""')}"`;
            }
            return safeStr;
        };

        events.forEach((event, index) => {
            const row = [
                index + 1,
                getDayOfWeek(event.eventDate),
                formatDate(event.eventDate),
                formatTime(event.startTime, event.endTime),
                event.eventName,
                event.location,
                event.department,
                formatResources(event),
                event.notes || ''
            ];

            csvContent += row.map(escapeCsv).join(',') + '\n';
        });

        // Add proper BOM for Excel to recognize UTF-8
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="events_export.csv"');
        res.send('\uFEFF' + csvContent); // BOM + Content

    } catch (error) {
        next(error);
    }
};
