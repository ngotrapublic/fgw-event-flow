const { eventsCollection, db, resourcesCollection } = require('../config/firebase');
const admin = require('firebase-admin');
const emailService = require('../services/emailService');
const conflictService = require('../services/conflictService');
const auditService = require('../services/auditService');
const { logAction } = require('../controllers/auditLogController');
const { randomUUID } = require('crypto');
const cacheService = require('../services/cacheService');

// Helper: Check if user can modify event
const canModifyEvent = (user, event) => {
    // Admin and Manager can do anything
    if (user.role === 'admin' || user.role === 'manager') return true;

    // User can only modify their own events
    if (user.role === 'user' && event.createdBy === user.uid) return true;

    return false;
};

/**
 * Get events with optional date-range query and cursor-based pagination.
 * Supports:
 *   - Date-range mode: startDate & endDate (cursor pagination)
 *   - All events mode: no date params (cursor pagination — scales to any collection size)
 */
exports.getAllEvents = async (req, res, next) => {
    try {
        const { startDate, endDate, limit = 12, lastDocId, department, location, dateFilter } = req.query;
        const parsedLimit = Math.min(parseInt(limit) || 12, 100);

        // ──────────────────────────────────────────────────────────────
        // OPTIMIZED QUERY: Use isUniqueEvent index to fetch exactly N
        // unique events with zero over-fetching. Cost: parsedLimit + 1 reads.
        // ──────────────────────────────────────────────────────────────
        let baseQuery = eventsCollection.where('isUniqueEvent', '==', true);

        if (department) {
            baseQuery = baseQuery.where('department', '==', department);
        }

        if (location) {
            baseQuery = baseQuery.where('location', '==', location);
        }

        // dateFilter: 'today' | 'upcoming' | 'past' (Vietnam timezone UTC+7)
        if (dateFilter && dateFilter !== 'all') {
            const now = new Date();
            const tzOffset = 7 * 60 * 60 * 1000;
            const todayLocal = new Date(now.getTime() + tzOffset);
            const todayStr = todayLocal.toISOString().split('T')[0];

            if (dateFilter === 'today') {
                baseQuery = baseQuery.where('eventDate', '==', todayStr);
            } else if (dateFilter === 'upcoming') {
                baseQuery = baseQuery.where('eventDate', '>=', todayStr);
            } else if (dateFilter === 'past') {
                baseQuery = baseQuery.where('eventDate', '<', todayStr);
            }
        } else if (startDate && endDate) {
            // MODE 1: Optional Date-range filter (explicit range takes priority)
            baseQuery = baseQuery
                .where('eventDate', '>=', startDate)
                .where('eventDate', '<=', endDate);
        }

        baseQuery = baseQuery.orderBy('eventDate', 'desc');

        // Cursor-based pagination
        let paginatedQuery = baseQuery;
        if (lastDocId) {
            const lastDoc = await eventsCollection.doc(lastDocId).get();
            if (lastDoc.exists) {
                paginatedQuery = paginatedQuery.startAfter(lastDoc);
            }
        }

        // Fetch exactly limit + 1 to detect hasMore (no over-fetch needed)
        const snapshot = await paginatedQuery.limit(parsedLimit + 1).get();
        const allDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const hasMore = allDocs.length > parsedLimit;
        const finalEvents = hasMore ? allDocs.slice(0, parsedLimit) : allDocs;
        const lastReturnedDoc = snapshot.docs[finalEvents.length - 1] || null;

        // ──────────────────────────────────────────────────────────────
        // ACCURATE TOTAL: Use aggregation query when filters are active,
        // otherwise use the fast global metadata counter.
        // ──────────────────────────────────────────────────────────────
        const hasFilters = department || location || dateFilter || (startDate && endDate);
        let totalUnique;
        try {
            if (hasFilters) {
                const countSnapshot = await baseQuery.count().get();
                totalUnique = countSnapshot.data().count;
            } else {
                const statsDoc = await db.collection('metadata').doc('stats').get();
                totalUnique = statsDoc.exists ? statsDoc.data().totalUniqueEvents || 0 : 0;
            }
        } catch (countErr) {
            console.error('[getAllEvents] Count fallback:', countErr.message);
            totalUnique = finalEvents.length;
        }

        const meta = {
            total: totalUnique,
            count: finalEvents.length,
            lastId: lastReturnedDoc ? lastReturnedDoc.id : null,
            hasMore
        };

        if (startDate && endDate) {
            meta.range = { startDate, endDate };
        }

        res.json({ events: finalEvents, meta });
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
 * Get events for Logistics Kanban
 * Optimized for Phase 3 Step 2C: 3-day operational window
 */
exports.getLogisticsEvents = async (req, res, next) => {
    try {
        const result = await cacheService.getOrFetch('logistics', async () => {
            const today = new Date();
            const formatDate = (d) => d.toISOString().split('T')[0];

            const current = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

            const yesterday = new Date(current);
            yesterday.setUTCDate(current.getUTCDate() - 1);

            const tomorrow = new Date(current);
            tomorrow.setUTCDate(current.getUTCDate() + 1);

            const dateRange = [formatDate(yesterday), formatDate(current), formatDate(tomorrow)];

            const snapshot = await eventsCollection
                .where('eventDate', 'in', dateRange)
                .limit(50) // Performance Guardrail
                .get();

            const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            console.log(`[Kanban API - FRESH] Served ${events.length} events for ${dateRange.join(', ')}`);
            return events;
        }, 5); // Cache for 5 minutes

        res.json(result);
    } catch (error) {
        next(error);
    }
};

/**
 * Get dashboard stats: today, tomorrow, next 7 days, happening now.
 * Avoids complex composite index by querying `eventDate` directly using IN.
 */
exports.getStats = async (req, res, next) => {
    try {
        const { department } = req.query;
        const cacheKey = department ? `stats_${department}` : 'stats';
        const result = await cacheService.getOrFetch(cacheKey, async () => {
            const now = new Date();
            const tzOffset = 7 * 60 * 60 * 1000; // UTC+7
            const todayLocal = new Date(now.getTime() + tzOffset);

            // Generate dates for today + next 7 days (total 8 days)
            const weekDates = [];
            for (let i = 0; i <= 7; i++) {
                const d = new Date(todayLocal.getTime() + i * 24 * 60 * 60 * 1000);
                weekDates.push(d.toISOString().split('T')[0]);
            }
            const todayStr = weekDates[0];
            const tomorrowStr = weekDates[1];

            // Only query by eventDate (which is automatically indexed by Firestore)
            const snap = await eventsCollection
                .where('eventDate', 'in', weekDates)
                .get();

            let todayCount = 0;
            let tomorrowCount = 0;
            let weekCount = 0;
            let happeningNow = 0;

            const currentHour = todayLocal.getUTCHours();
            const currentMin = todayLocal.getUTCMinutes();
            const nowVal = currentHour * 60 + currentMin;
            
            const uniqueGroups = new Set();

            snap.docs.forEach(doc => {
                const data = doc.data();
                
                // Filter by department if requested
                if (department && data.department !== department) return;

                const key = data.groupId || doc.id;

                // Deduplicate for week count so a 5-day event only counts as 1 event this week
                if (!uniqueGroups.has(key)) {
                    uniqueGroups.add(key);
                    weekCount++;
                }

                // We do NOT check isUniqueEvent here because we want to know if it is happening TODAY!
                if (data.eventDate === todayStr) {
                    todayCount++;

                    // Check happening now
                    try {
                        const [startH, startM] = (data.startTime || '').split(':').map(Number);
                        const [endH, endM] = (data.endTime || '').split(':').map(Number);
                        if (!isNaN(startH) && !isNaN(endH)) {
                            if (nowVal >= startH * 60 + startM && nowVal <= endH * 60 + endM) {
                                happeningNow++;
                            }
                        }
                    } catch (_) {}
                } else if (data.eventDate === tomorrowStr) {
                    tomorrowCount++;
                }
            });

            let total = 0;
            let upcoming = 0;
            let completed = 0;
            let thisMonthCount = 0;

            const yyyy = todayLocal.getFullYear();
            const mm = String(todayLocal.getMonth() + 1).padStart(2, '0');
            const firstDayStr = `${yyyy}-${mm}-01`;
            const lastDayStr = `${yyyy}-${mm}-31`;

            if (department) {
                const baseQ = eventsCollection
                    .where('isUniqueEvent', '==', true)
                    .where('department', '==', department);

                try {
                    const [totalSnap, upcomingSnap, completedSnap, monthSnap] = await Promise.all([
                        baseQ.count().get(),
                        baseQ.where('eventDate', '>=', todayStr).count().get(),
                        baseQ.where('eventDate', '<', todayStr).count().get(),
                        baseQ.where('eventDate', '>=', firstDayStr).where('eventDate', '<=', lastDayStr).count().get()
                    ]);
                    
                    total = totalSnap.data().count;
                    upcoming = upcomingSnap.data().count;
                    completed = completedSnap.data().count;
                    thisMonthCount = monthSnap.data().count;
                } catch (err) {
                    console.error('[STATS] Count error:', err.message);
                }
            } else {
                const statsDoc = await db.collection('metadata').doc('stats').get();
                total = statsDoc.exists ? statsDoc.data().totalUniqueEvents || 0 : 0;
            }

            return {
                total,
                upcoming,
                completed,
                thisMonthCount,
                today: todayCount,
                tomorrow: tomorrowCount,
                week: weekCount,
                happeningNow
            };
        }, 2); // Cache for 2 minutes

        res.json(result);
    } catch (error) {
        console.error('[STATS] Error:', error.message);
        // Default to zero rather than crashing the route if anything weird happens
        res.json({ today: 0, tomorrow: 0, week: 0, happeningNow: 0 });
    }
};

/**
 * Get detailed events for a specific dashboard stat category.
 */
exports.getStatDetails = async (req, res, next) => {
    try {
        const { type, department } = req.query; // type: 'today', 'tomorrow', 'week', 'now'
        
        const now = new Date();
        const tzOffset = 7 * 60 * 60 * 1000;
        const todayLocal = new Date(now.getTime() + tzOffset);

        const weekDates = [];
        for (let i = 0; i <= 7; i++) {
            const d = new Date(todayLocal.getTime() + i * 24 * 60 * 60 * 1000);
            weekDates.push(d.toISOString().split('T')[0]);
        }
        
        const todayStr = weekDates[0];
        const tomorrowStr = weekDates[1];

        let targetDates = [];
        if (type === 'today' || type === 'now') {
            targetDates = [todayStr];
        } else if (type === 'tomorrow') {
            targetDates = [tomorrowStr];
        } else if (type === 'week') {
            targetDates = weekDates;
        } else {
            return res.json([]);
        }

        const snap = await eventsCollection
            .where('eventDate', 'in', targetDates)
            .get();

        const currentHour = todayLocal.getUTCHours();
        const currentMin = todayLocal.getUTCMinutes();
        const nowVal = currentHour * 60 + currentMin;

        let results = [];
        const uniqueGroups = new Set();

        snap.docs.forEach(doc => {
            const data = doc.data();
            
            if (department && data.department !== department) return;

            const key = data.groupId || doc.id;

            if (type === 'week') {
                if (!uniqueGroups.has(key)) {
                    uniqueGroups.add(key);
                    results.push({ id: doc.id, ...data });
                }
            } else if (type === 'now') {
                try {
                    const [startH, startM] = (data.startTime || '').split(':').map(Number);
                    const [endH, endM] = (data.endTime || '').split(':').map(Number);
                    if (!isNaN(startH) && !isNaN(endH)) {
                        if (nowVal >= startH * 60 + startM && nowVal <= endH * 60 + endM) {
                            results.push({ id: doc.id, ...data });
                        }
                    }
                } catch (_) {}
            } else {
                results.push({ id: doc.id, ...data });
            }
        });

        // Sort results by date then time
        results.sort((a, b) => {
            if (a.eventDate !== b.eventDate) return a.eventDate.localeCompare(b.eventDate);
            return (a.startTime || '').localeCompare(b.startTime || '');
        });

        res.json(results);
    } catch (error) {
        console.error('[STAT DETAILS] Error:', error.message);
        res.json([]);
    }
};

/**
 * Get all events within a specific month/range for Calendar View.
 * Does NOT filter by `isUniqueEvent` (retrieves all days of a series).
 * Does NOT paginate.
 */
exports.getCalendarEvents = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Missing startDate or endDate' });
        }

        const cacheKey = `calendar_${startDate}_${endDate}`;
        const result = await cacheService.getOrFetch(cacheKey, async () => {
            // Fetch all events strictly within the requested timeframe limits
            // Since eventDate is automatically indexed, this requires no composite index.
            const snapshot = await eventsCollection
                .where('eventDate', '>=', startDate)
                .where('eventDate', '<=', endDate)
                .limit(200) // generous safe limit for a single month's events
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }, 15); // Cache for 15 minutes

        res.json(result);
    } catch (error) {
        console.error('[CALENDAR API] Error:', error.message);
        next(error);
    }
};
/**
 * Check for event conflicts
 */
exports.checkConflict = async (req, res, next) => {
    try {
        const { excludeId, ...eventData } = req.body;
        const conflict = await conflictService.checkConflict(eventData, excludeId);

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
        const { uid } = req.user;
        const eventData = req.body;

        // Determine if this is a series
        let datesToCreate = [eventData.eventDate];
        const isSeries = eventData.eventEndDate && eventData.eventEndDate > eventData.eventDate;

        if (isSeries) {
            const dates = [];
            let current = new Date(eventData.eventDate);
            const end = new Date(eventData.eventEndDate);
            while (current <= end) {
                dates.push(current.toISOString().split('T')[0]);
                current.setDate(current.getDate() + 1);
            }
            datesToCreate = dates;
        }

        // Check for conflicts for ALL dates (skip if user explicitly confirmed)
        if (!eventData.skipConflictCheck) {
            for (const dateStr of datesToCreate) {
                const tempEvent = { ...eventData, eventDate: dateStr };
                const conflict = await conflictService.checkConflict(tempEvent);
                if (conflict) {
                    return res.status(409).json({
                        error: 'Conflict detected',
                        message: `This event conflicts with an existing schedule on ${dateStr}.`,
                        conflictingEvent: conflict
                    });
                }
            }
        }

        // Clean up the flag before saving to database
        delete eventData.skipConflictCheck;

        const groupId = isSeries ? randomUUID() : null;
        const createdDocs = [];
        const batch = db.batch();

        for (let i = 0; i < datesToCreate.length; i++) {
            const dateStr = datesToCreate[i];
            const isFirst = i === 0;

            const newEvent = {
                ...eventData,
                eventDate: dateStr,
                createdBy: uid,
                createdAt: new Date().toISOString(),
                remindersSent: { oneDay: false, oneHour: false }
            };

            if (isSeries) {
                newEvent.groupId = groupId;
                newEvent.isSeriesStart = isFirst;
                newEvent.seriesEndDate = eventData.eventEndDate;
                newEvent.isUniqueEvent = isFirst; // true only for day 1, false for others
            } else {
                newEvent.isUniqueEvent = true; // single-day event is always unique
            }

            const docRef = eventsCollection.doc();
            batch.set(docRef, newEvent);
            createdDocs.push({ id: docRef.id, ...newEvent });
        }

        await batch.commit();
        const firstDoc = createdDocs[0];

        // [METADATA COUNTER] Add exactly 1 to global unique event count
        try {
            await db.collection('metadata').doc('stats').set({
                totalUniqueEvents: admin.firestore.FieldValue.increment(1)
            }, { merge: true });
        } catch (counterErr) {
            console.error('[COUNTER] Failed to increment', counterErr);
        }

        // [NEW] Send In-App Notification
        try {
            const notificationService = require('../services/notificationService');

            await notificationService.create({
                recipients: [firstDoc.createdBy],
                type: 'success',
                title: 'Event Registered',
                message: isSeries ? `You have successfully registered series "${firstDoc.eventName}".` : `You have successfully registered "${firstDoc.eventName}".`,
                metadata: { eventId: firstDoc.id, groupId: firstDoc.groupId },
                sender: 'System'
            });

            // LOGGING
            const actor = req.user ? req.user.email : uid;
            const role = req.user ? req.user.role : 'user';

            await logAction({
                actor, role, action: 'CREATE', target: `Event: ${firstDoc.eventName}${isSeries ? ' (Series)' : ''}`, details: { id: firstDoc.id, isSeries, groupId }, ip: req.ip
            });

            // Phase 4: Delta-based Audit Trail
            auditService.logAudit({
                action: 'CREATE',
                entityType: 'Event',
                entityId: firstDoc.id,
                userId: uid,
                after: firstDoc
            });

        } catch (notifError) {
            console.error('Notification/Logging error:', notifError);
        }

        // Send notification via Email (Queue it for the first document which represents the series)
        try {
            const emailQueue = require('../services/emailQueue');
            await emailQueue.enqueue(firstDoc, 'created');
        } catch (emailError) {
            console.error('[CREATE EVENT] Email queueing failed:', emailError.message);
        }

        res.status(201).json(firstDoc);

        // [CACHE] Invalidate analytics and stats cache after successful creation
        cacheService.invalidate('stats');
        cacheService.invalidate('logistics');
        cacheService.clearAnalytics();
        cacheService.clearEventsCache();
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

        // [FIX] Anti-Spam Issue #1: Reset reminder flags if date/time changed
        const dateChanged = req.body.eventDate && req.body.eventDate !== oldEvent.eventDate;
        const startTimeChanged = req.body.startTime !== undefined && req.body.startTime !== oldEvent.startTime;
        const sessionChanged = req.body.eventSession !== undefined && req.body.eventSession !== oldEvent.eventSession;

        if (dateChanged || startTimeChanged || sessionChanged) {
            updatedEvent.remindersSent = { oneDay: false, oneHour: false };
        }

        // Check for conflicts (excluding current event and all series siblings)
        const conflict = await conflictService.checkConflict(updatedEvent, id, oldEvent.groupId || null);
        if (conflict) {
            return res.status(409).json({
                error: 'Conflict detected',
                message: 'Updated schedule conflicts with an existing event.',
                conflictingEvent: conflict
            });
        }

        // --- Series-aware update ---
        if (oldEvent.groupId && req.body.eventEndDate) {
            // This is a series event - we need to re-sync all docs in the group
            const newStartDate = req.body.eventDate || oldEvent.eventDate;
            const newEndDate = req.body.eventEndDate;
            const groupId = oldEvent.groupId;

            // Build the new set of dates
            const newDates = [];
            let cur = new Date(newStartDate);
            const edEnd = new Date(newEndDate);
            while (cur <= edEnd && newDates.length < 30) {
                newDates.push(cur.toISOString().split('T')[0]);
                cur.setDate(cur.getDate() + 1);
            }

            // Fetch all existing sibling docs
            const seriesSnap = await eventsCollection.where('groupId', '==', groupId).get();
            const existingMap = {};
            seriesSnap.docs.forEach(d => { existingMap[d.data().eventDate] = d; });

            // Common fields to propagate (everything EXCEPT eventDate, isSeriesStart)
            const commonFields = { ...req.body };
            delete commonFields.eventDate;
            delete commonFields.isSeriesStart;
            commonFields.seriesEndDate = newEndDate;
            commonFields.eventEndDate = newEndDate;

            if (startTimeChanged || sessionChanged) {
                commonFields.remindersSent = { oneDay: false, oneHour: false };
            }

            const batch = db.batch();

            // Update or create docs for each new date
            for (let i = 0; i < newDates.length; i++) {
                const dateStr = newDates[i];
                if (existingMap[dateStr]) {
                    // Update existing doc
                    batch.update(existingMap[dateStr].ref, {
                        ...commonFields,
                        eventDate: dateStr,
                        isSeriesStart: i === 0,
                        isUniqueEvent: i === 0
                    });
                } else {
                    // Create new doc for this date
                    const newDocRef = eventsCollection.doc();
                    batch.set(newDocRef, {
                        ...oldEvent,
                        ...commonFields,
                        eventDate: dateStr,
                        groupId,
                        isSeriesStart: i === 0,
                        isUniqueEvent: i === 0,
                        seriesEndDate: newEndDate,
                        createdAt: oldEvent.createdAt,
                        remindersSent: { oneDay: false, oneHour: false }
                    });
                }
            }

            // Delete docs for dates no longer in the range
            for (const existingDoc of seriesSnap.docs) {
                const dDate = existingDoc.data().eventDate;
                if (!newDates.includes(dDate)) {
                    batch.delete(existingDoc.ref);
                }
            }

            await batch.commit();
            console.log(`[UPDATE] Series ${groupId} re-synced: ${newDates.length} days (${newStartDate} → ${newEndDate})`);

        } else {
            // Single event OR series event without date range change - update single doc
            const updatePayload = { ...req.body };
            // If eventEndDate was provided, also update seriesEndDate for consistency
            if (req.body.eventEndDate && oldEvent.groupId) {
                updatePayload.seriesEndDate = req.body.eventEndDate;
            }
            if (dateChanged || startTimeChanged || sessionChanged) {
                updatePayload.remindersSent = { oneDay: false, oneHour: false };
            }
            await eventsCollection.doc(id).update(updatePayload);
        }

        // LOGGING
        const actor = req.user ? req.user.email : 'Unknown';
        const role = req.user ? req.user.role : 'user';
        await logAction({
            actor, role, action: 'UPDATE', target: `Event: ${oldEvent.eventName || id}`, details: req.body, ip: req.ip
        });

        // Phase 4: Delta-based Audit Trail (only logs if changes detected)
        auditService.logAudit({
            action: 'UPDATE',
            entityType: 'Event',
            entityId: id,
            userId: uid,
            before: oldEvent,
            after: updatedEvent
        });

        // Calculate changes
        const changes = emailService.detectChanges(oldEvent, updatedEvent);

        console.log(`[UPDATE] Event ID: ${id}`);
        console.log(`[UPDATE] Detected changes:`, changes);

        if (changes.length > 0) {
            updatedEvent.changes = changes;
            console.log('[UPDATE] Queueing notification email...');
            const emailQueue = require('../services/emailQueue');
            // Add the document ID to the event object before enqueuing
            const eventWithId = { ...updatedEvent, id };
            await emailQueue.enqueue(eventWithId, 'updated');

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

        // [CACHE] Invalidate analytics and stats cache after successful update
        cacheService.invalidate('stats');
        cacheService.invalidate('logistics');
        cacheService.clearAnalytics();
        cacheService.clearEventsCache();
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

        // If this is part of a multi-day series, delete ALL documents in the group
        if (deletedEvent.groupId) {
            const seriesSnapshot = await eventsCollection
                .where('groupId', '==', deletedEvent.groupId)
                .get();

            const deleteBatch = db.batch();
            seriesSnapshot.docs.forEach(seriesDoc => {
                deleteBatch.delete(seriesDoc.ref);
            });
            await deleteBatch.commit();
            console.log(`[DELETE] Deleted ${seriesSnapshot.size} events in series group: ${deletedEvent.groupId}`);
        } else {
            await eventsCollection.doc(id).delete();
        }

        // [METADATA COUNTER] Subtract exactly 1 from global unique event count
        try {
            await db.collection('metadata').doc('stats').set({
                totalUniqueEvents: admin.firestore.FieldValue.increment(-1)
            }, { merge: true });
        } catch (counterErr) {
            console.error('[COUNTER] Failed to decrement', counterErr);
        }

        // LOGGING
        const actor = req.user ? req.user.email : 'Unknown';
        const role = req.user ? req.user.role : 'user';
        await logAction({
            actor, role, action: 'DELETE', target: `Event: ${deletedEvent.eventName || id}${deletedEvent.groupId ? ' (Series)' : ''}`, details: {}, ip: req.ip
        });

        // Phase 4: Delta-based Audit Trail
        auditService.logAudit({
            action: 'DELETE',
            entityType: 'Event',
            entityId: id,
            userId: uid,
            before: deletedEvent
        });

        console.log(`[DELETE] Successfully deleted event: ${deletedEvent.eventName}`);
        res.json({ message: 'Event deleted successfully' });

        // [CACHE] Invalidate analytics and stats cache after successful deletion
        cacheService.invalidate('stats');
        cacheService.invalidate('logistics');
        cacheService.clearAnalytics();
        cacheService.clearEventsCache();
    } catch (error) {
        next(error);
    }
};

/**
 * Export events to CSV
 */
exports.exportEventsCsv = async (req, res, next) => {
    try {
        const { days } = req.query;
        let query = eventsCollection;

        if (days) {
            const numDays = parseInt(days);
            if (numDays > 31) {
                return res.status(400).json({ error: 'Export date range cannot exceed 31 days to protect Quota. For full history, please use the Nightly Archive.' });
            }
            
            const end = new Date();
            const start = new Date();
            start.setDate(end.getDate() - numDays);
            const startDateStr = start.toISOString().split('T')[0];
            
            query = query.where('eventDate', '>=', startDateStr).orderBy('eventDate', 'desc');
        } else {
            // Block unbounded live exports
            return res.status(400).json({ error: 'Missing ?days= parameter. Live exports are limited to recent days. Use Nightly Archive for full data.' });
        }

        // Fetch events and resources in parallel
        const [eventsSnapshot, resourcesSnapshot] = await Promise.all([
            query.get(),
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

        // GROUPING LOGIC (For Management Report)
        const groupedEventsMap = {};
        const groupedEventsList = [];

        events.forEach(e => {
            if (e.groupId) {
                if (!groupedEventsMap[e.groupId]) {
                    const copy = { ...e, startDateMap: e.eventDate, endDateMap: e.eventDate };
                    groupedEventsMap[e.groupId] = copy;
                    groupedEventsList.push(copy);
                } else {
                    const existing = groupedEventsMap[e.groupId];
                    if (e.eventDate < existing.startDateMap) existing.startDateMap = e.eventDate;
                    if (e.eventDate > existing.endDateMap) existing.endDateMap = e.eventDate;
                }
            } else {
                const copy = { ...e, startDateMap: e.eventDate, endDateMap: e.eventDate };
                groupedEventsList.push(copy);
            }
        });

        // Sort grouped events by Start Date then Time
        groupedEventsList.sort((a, b) => {
            if (a.startDateMap !== b.startDateMap) return a.startDateMap.localeCompare(b.startDateMap);
            return (a.startTime || '').localeCompare(b.startTime || '');
        });

        // Range Helpers
        const getDateRange = (event) => {
            if (event.startDateMap && event.endDateMap && event.startDateMap !== event.endDateMap) {
                return `${formatDate(event.startDateMap)} - ${formatDate(event.endDateMap)}`;
            }
            return formatDate(event.startDateMap);
        };

        const getDayOfWeekRange = (event) => {
            if (event.startDateMap && event.endDateMap && event.startDateMap !== event.endDateMap) {
                return `${getDayOfWeek(event.startDateMap)} - ${getDayOfWeek(event.endDateMap)}`;
            }
            return getDayOfWeek(event.startDateMap);
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

        groupedEventsList.forEach((event, index) => {
            const row = [
                index + 1,
                getDayOfWeekRange(event),
                getDateRange(event),
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

/**
 * Toggle contractor sign status (đã ký giấy vào thi công)
 * PATCH /api/events/:id/contractor/:index/sign
 * Only Admin/Manager can toggle
 */
exports.toggleContractorSign = async (req, res, next) => {
    try {
        const { id, index } = req.params;
        const contractorIndex = parseInt(index, 10);
        const { uid } = req.user;

        // Fetch User Role from Firestore for authoritative check
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            return res.status(403).json({ error: 'Forbidden: User profile not found' });
        }
        const user = { uid, ...userDoc.data() };
        req.user.role = user.role; // Set it back to req.user for consistency

        // Check permission (Admin/Manager only)
        if (user.role !== 'admin' && user.role !== 'manager') {
            return res.status(403).json({
                error: 'Chỉ Admin hoặc Manager có quyền đánh dấu ký'
            });
        }

        // Get event
        const eventDoc = await eventsCollection.doc(id).get();
        if (!eventDoc.exists) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const eventData = eventDoc.data();
        const packages = eventData.contractorPackages || [];

        // Validate index
        if (contractorIndex < 0 || contractorIndex >= packages.length) {
            return res.status(400).json({ error: 'Invalid contractor index' });
        }

        // Toggle signed status
        const currentSigned = packages[contractorIndex].signed || false;
        packages[contractorIndex].signed = !currentSigned;
        packages[contractorIndex].signedAt = !currentSigned ? new Date().toISOString() : null;
        packages[contractorIndex].signedBy = !currentSigned ? user.email : null;

        // Update event
        await eventsCollection.doc(id).update({
            contractorPackages: packages,
            updatedAt: new Date().toISOString()
        });

        // Log action
        await logAction({
            user,
            action: currentSigned ? 'CONTRACTOR_UNSIGNED' : 'CONTRACTOR_SIGNED',
            targetType: 'event',
            targetId: id,
            details: {
                contractorName: packages[contractorIndex].contractorName,
                signed: !currentSigned
            }
        });

        res.json({
            success: true,
            contractorPackages: packages,
            message: `Đã ${!currentSigned ? 'ký' : 'huỷ ký'} cho ${packages[contractorIndex].contractorName}`
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Export events to Calendar Excel
 */
exports.exportCalendarExcel = async (req, res, next) => {
    try {
        const ExcelJS = require('exceljs');
        const pad = (n) => n.toString().padStart(2, '0');
        const toDateStr = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

        // Determine the month
        const targetMonth = req.query.month || toDateStr(new Date()).substring(0, 7); // YYYY-MM
        const [year, month] = targetMonth.split('-').map(Number);
        
        // Find first day of month
        const firstDayOfMonth = new Date(year, month - 1, 1);
        // Find last day of month
        const lastDayOfMonth = new Date(year, month, 0);

        // Calculate grid start (Monday before or on firstDay)
        const gridStart = new Date(firstDayOfMonth);
        const startDayOfWeek = gridStart.getDay() === 0 ? 7 : gridStart.getDay(); // 1 = Mon, 7 = Sun
        gridStart.setDate(gridStart.getDate() - (startDayOfWeek - 1));

        // Calculate grid end (Sunday after or on lastDay)
        const gridEnd = new Date(lastDayOfMonth);
        const endDayOfWeek = gridEnd.getDay() === 0 ? 7 : gridEnd.getDay();
        gridEnd.setDate(gridEnd.getDate() + (7 - endDayOfWeek));

        const startDateStr = toDateStr(gridStart);
        const endDateStr = toDateStr(gridEnd);

        // Fetch events in this range
        const eventsSnapshot = await eventsCollection
            .where('eventDate', '>=', startDateStr)
            .where('eventDate', '<=', endDateStr)
            .get();
        
        const events = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Fetch resources for Logistics Quick-glance
        const resourcesSnapshot = await resourcesCollection.get();
        const resourceMap = {};
        if (!resourcesSnapshot.empty) {
            resourcesSnapshot.forEach(doc => {
                const data = doc.data();
                resourceMap[doc.id] = data.label || data.name || doc.id;
            });
        }

        // Helper for flat resources (Calendar grid)
        const formatFlatResources = (event) => {
            let items = [];
            if (event.facilitiesChecklist) {
                Object.entries(event.facilitiesChecklist).forEach(([k, v]) => {
                    if (v.checked) {
                        const name = v.label || resourceMap[k] || k;
                        const qty = v.quantity || 0;
                        items.push(qty > 0 ? `${name} (${qty})` : name);
                    }
                });
            } else if (Array.isArray(event.resources)) {
                items = event.resources.map(r => r.name || r);
            }
            return items.length > 0 ? items.join(', ') : (event.facilitiesSummary || '');
        };

        // Helper for detailed resources (Sheet 2)
        const formatDetailedResources = (event) => {
            if (event.facilitiesChecklist && Object.keys(event.facilitiesChecklist).length > 0) {
                const locationMap = {};
                Object.entries(event.facilitiesChecklist).forEach(([key, value]) => {
                    if (value.checked) {
                        const name = value.label || resourceMap[key] || key;
                        const total = value.quantity || 0;

                        if (value.distribution && Object.keys(value.distribution).length > 0) {
                            Object.entries(value.distribution).forEach(([loc, qty]) => {
                                if (parseInt(qty) > 0) {
                                    if (!locationMap[loc]) locationMap[loc] = [];
                                    locationMap[loc].push(`${name} (${qty})`);
                                }
                            });
                        } else {
                            let targetLoc = 'Chung';
                            if (event.location && !Array.isArray(event.location)) {
                                targetLoc = event.location;
                            } else if (Array.isArray(event.location) && event.location.length === 1) {
                                targetLoc = event.location[0];
                            } else if (Array.isArray(event.location) && event.location.length > 1) {
                                targetLoc = event.location.join(', ');
                            }

                            if (!locationMap[targetLoc]) locationMap[targetLoc] = [];
                            locationMap[targetLoc].push(`${name} (${total})`);
                        }
                    }
                });

                const parts = [];
                Object.entries(locationMap).forEach(([loc, items]) => {
                    if (items.length > 0) {
                        parts.push(`${loc}:\n${items.join('; ')}`);
                    }
                });
                return parts.join('\n\n');
            }
            if (Array.isArray(event.resources)) {
                return event.resources.map(r => r.name || r).join('; ');
            }
            return event.facilitiesSummary || '';
        };

        // Calculate Stats (only for targetMonth)
        let totalMonthEvents = 0;
        const deptStats = {};
        const dailyCounts = {};
        let peakDayStr = '';
        let maxEventsPerDay = 0;

        // Map events by date
        const eventsByDate = {};
        events.forEach(e => {
            if (!eventsByDate[e.eventDate]) eventsByDate[e.eventDate] = [];
            eventsByDate[e.eventDate].push(e);

            if (e.eventDate.startsWith(targetMonth)) {
                totalMonthEvents++;
                const dept = e.department || 'Chưa phân bổ';
                deptStats[dept] = (deptStats[dept] || 0) + 1;

                dailyCounts[e.eventDate] = (dailyCounts[e.eventDate] || 0) + 1;
                if (dailyCounts[e.eventDate] > maxEventsPerDay) {
                    maxEventsPerDay = dailyCounts[e.eventDate];
                    peakDayStr = e.eventDate;
                }
            }
        });

        const formattedPeakDay = peakDayStr ? `${peakDayStr.split('-')[2]}/${peakDayStr.split('-')[1]} (${maxEventsPerDay} SK)` : 'Không có';

        // Initialize Workbook
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet(`Lịch ${targetMonth}`);

        // Set columns (7 columns for Mon-Sun)
        sheet.columns = [
            { width: 26 }, { width: 26 }, { width: 26 }, { width: 26 },
            { width: 26 }, { width: 26 }, { width: 26 }
        ];

        // Department colors mapping matching frontend
        const DEPT_COLORS = {
            'tuyển sinh': 'FF2563EB', // blue-600
            'đào tạo': 'FF7C3AED', // violet-600
            'công tác sinh viên': 'FF059669', // emerald-600
            'quan hệ doanh nghiệp': 'FFF59E0B', // amber-500
            'hành chính': 'FFE11D48', // rose-600
            'thư viện': 'FF0891B2', // cyan-600
            'default': 'FF4F46E5' // indigo-600
        };

        const getDeptColor = (deptName) => {
            if (!deptName) return DEPT_COLORS.default;
            const name = deptName.toLowerCase();
            for (const key of Object.keys(DEPT_COLORS)) {
                if (key !== 'default' && name.includes(key)) {
                    return DEPT_COLORS[key];
                }
            }
            return DEPT_COLORS.default;
        };

        // Row 1: Title & Stats
        const titleRow = sheet.addRow([]);
        sheet.mergeCells('A1:E1');
        sheet.mergeCells('F1:G1');
        
        const titleCell = sheet.getCell('A1');
        titleCell.value = `LỊCH HOẠT ĐỘNG SỰ KIỆN - THÁNG ${pad(month)}/${year}`;
        titleCell.font = { name: 'Arial', bold: true, size: 16, color: { argb: 'FF1E293B' } };
        titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
        
        const statsCell = sheet.getCell('F1');
        statsCell.value = `Tổng: ${totalMonthEvents} Sự Kiện | Cao điểm: Ngày ${formattedPeakDay}`;
        statsCell.font = { name: 'Arial', bold: true, size: 10, color: { argb: 'FFB91C1C' } }; // red-700
        statsCell.alignment = { vertical: 'middle', horizontal: 'right' };
        
        titleRow.height = 40;

        // Row 2: Subtitle
        const subTitleRow = sheet.addRow([`Ngày trích xuất báo cáo: ${new Date().toLocaleString('vi-VN')}`]);
        sheet.mergeCells('A2:G2');
        const subTitleCell = sheet.getCell('A2');
        subTitleCell.font = { name: 'Arial', italic: true, size: 10, color: { argb: 'FF64748B' } };
        subTitleCell.alignment = { vertical: 'middle', horizontal: 'left' };

        // Row 3: Legend
        const legendRow = sheet.addRow([]);
        sheet.mergeCells('A3:G3');
        const legendCell = sheet.getCell('A3');
        const legendRichText = [ { text: 'Chú giải màu sắc bộ phận:  ', font: { italic: true, size: 10, color: { argb: 'FF475569' } } } ];
        Object.keys(DEPT_COLORS).forEach(k => {
            if (k !== 'default') {
                legendRichText.push({ text: '■ ', font: { color: { argb: DEPT_COLORS[k] }, size: 14 } });
                legendRichText.push({ text: `${k.charAt(0).toUpperCase() + k.slice(1)}   `, font: { size: 10, bold: true, color: { argb: 'FF334155' } } });
            }
        });
        legendCell.value = { richText: legendRichText };
        legendCell.alignment = { vertical: 'middle', horizontal: 'left' };
        legendRow.height = 30;

        // Row 4: Empty separator
        sheet.addRow([]);

        // Row 5: Calendar Header
        const headerRow = sheet.addRow(['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật']);
        headerRow.height = 30;
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF1E293B' } // slate-800
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'thin' }, left: { style: 'thin' },
                bottom: { style: 'thin' }, right: { style: 'thin' }
            };
        });



        // Fill grid
        let curDate = new Date(gridStart);
        while (curDate <= gridEnd) {
            const rowData = [];
            for (let i = 0; i < 7; i++) {
                const dateStr = toDateStr(curDate);
                const dayNum = curDate.getDate();
                const isCurrentMonth = curDate.getMonth() + 1 === month;
                const isToday = dateStr === toDateStr(new Date());
                const isWeekend = (i === 5 || i === 6); // Thứ 7, Chủ Nhật
                
                const dayEvents = eventsByDate[dateStr] || [];
                // Sort dayEvents by time
                dayEvents.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

                const richText = [];
                // Day number
                let dayColor = 'FF94A3B8'; // default gray for outside month
                if (isCurrentMonth) {
                    if (isToday) dayColor = 'FF2563EB'; // Blue for today
                    else if (isWeekend) dayColor = 'FFEA580C'; // Orange for weekend
                    else dayColor = 'FF000000'; // Black for normal day
                }

                richText.push({
                    text: `${dayNum}\n`,
                    font: { bold: true, size: 12, color: { argb: dayColor } }
                });

                // Events
                dayEvents.forEach((e, index) => {
                    const deptColor = getDeptColor(e.department);
                    
                    // Format time
                    let timeStr = '';
                    if (e.startTime) {
                        timeStr = e.startTime;
                        if (e.endTime) timeStr += ` - ${e.endTime}`;
                    }

                    // Format location
                    let locationStr = e.location || 'Chưa xếp phòng';
                    if (Array.isArray(locationStr)) {
                        locationStr = locationStr.join(', ');
                    }

                    // Format department
                    let deptStr = e.department || 'Chưa rõ bộ phận';

                    // Title + Time
                    if (isCurrentMonth) {
                        richText.push({
                            text: `• [${timeStr}] ${e.eventName}\n`,
                            font: { size: 10, color: { argb: deptColor }, bold: true }
                        });
                        
                        // Location
                        richText.push({
                            text: `   ĐĐ: ${locationStr}\n`,
                            font: { size: 9, color: { argb: deptColor }, italic: true }
                        });

                        // Department
                        richText.push({
                            text: `   BP: ${deptStr}\n`,
                            font: { size: 9, color: { argb: deptColor } }
                        });

                        if (index < dayEvents.length - 1) {
                            richText.push({ text: '\n' }); // blank line instead of dashed line for cleaner look
                        } else {
                            richText.push({ text: '\n' }); // padding bottom
                        }
                    }
                });

                rowData.push({ richText, isCurrentMonth, isToday, isWeekend });
                curDate.setDate(curDate.getDate() + 1);
            }

            const excelRow = sheet.addRow(rowData.map(r => ({ richText: r.richText })));
            excelRow.height = 180; // Tăng chiều cao để chứa nhiều thông tin hơn
            excelRow.eachCell((cell, colNumber) => {
                const cellData = rowData[colNumber - 1];
                cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
                
                // Borders
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
                };

                // Highlight Today
                if (cellData.isToday) {
                    cell.border = {
                        top: { style: 'thick', color: { argb: 'FF3B82F6' } }, // blue-500
                        left: { style: 'thick', color: { argb: 'FF3B82F6' } },
                        bottom: { style: 'thick', color: { argb: 'FF3B82F6' } },
                        right: { style: 'thick', color: { argb: 'FF3B82F6' } }
                    };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } }; // blue-50
                } 
                // Outside month
                else if (!cellData.isCurrentMonth) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }; // slate-50
                } 
                // Weekend
                else if (cellData.isWeekend) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } }; // amber-50
                }
            });
        }

        // --- SHEET 2: DANH SÁCH CHI TIẾT ---
        const sheet2 = workbook.addWorksheet('Danh sách chi tiết');
        
        sheet2.addRow(['TỔNG QUAN SỰ KIỆN THÁNG ' + `${pad(month)}/${year}`]).font = { bold: true, size: 14 };
        sheet2.addRow([`Tổng số sự kiện: ${totalMonthEvents}`]);
        sheet2.addRow(['Phân bổ theo bộ phận:']).font = { bold: true };
        Object.entries(deptStats).forEach(([dept, count]) => {
            sheet2.addRow([` - ${dept}:`, count]);
        });
        sheet2.addRow([]);

        // Data Table Headers
        const dataHeaders = ['STT', 'Ngày', 'Thời gian', 'Tên sự kiện', 'Địa điểm', 'Bộ phận', 'CSVC / Hậu cần', 'Ghi chú'];
        const dataHeaderRow = sheet2.addRow(dataHeaders);
        dataHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        dataHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // slate-800
        
        sheet2.columns = [
            { width: 5 }, { width: 12 }, { width: 15 }, { width: 40 },
            { width: 25 }, { width: 20 }, { width: 30 }, { width: 25 }
        ];

        // Filter events for target month only and sort
        const monthEvents = events.filter(e => e.eventDate.startsWith(targetMonth));
        monthEvents.sort((a, b) => {
            if (a.eventDate !== b.eventDate) return a.eventDate.localeCompare(b.eventDate);
            return (a.startTime || '').localeCompare(b.startTime || '');
        });

        const formatDateStr = (isoDate) => {
            if (!isoDate) return '';
            const p = isoDate.split('-');
            return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : isoDate;
        };

        monthEvents.forEach((e, idx) => {
            // CSVC
            let csvcStr = formatDetailedResources(e);

            let timeStr = '';
            if (e.startTime) {
                timeStr = e.startTime;
                if (e.endTime) timeStr += ` - ${e.endTime}`;
            }

            let locationStr = e.location || '';
            if (Array.isArray(locationStr)) locationStr = locationStr.join(', ');

            sheet2.addRow([
                idx + 1,
                formatDateStr(e.eventDate),
                timeStr,
                e.eventName,
                locationStr,
                e.department || '',
                csvcStr,
                e.notes || ''
            ]);
        });

        // Add AutoFilter
        sheet2.autoFilter = `A${dataHeaderRow.number}:H${dataHeaderRow.number + monthEvents.length}`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Events_Calendar_${targetMonth}.xlsx"`);
        
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('[EXPORT CALENDAR EXCEL] Error:', error);
        next(error);
    }
};

