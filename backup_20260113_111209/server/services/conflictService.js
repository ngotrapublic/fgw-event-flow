const { eventsCollection } = require('../config/firebase');
const { getEventStartTime, getEventEndTime } = require('../utils/timeHelpers');

/**
 * Core Service to detect scheduling conflicts.
 * This service ensures that no two events occupy the same physical location at the same time.
 */

/**
 * Check if a new event conflicts with existing events in the database.
 * 
 * Logic Flow:
 * 1. Expand search window to ±24h (3-day range) to detect midnight-spanning events (TC-08).
 * 2. Fetch potential candidate events from Firestore with a performance limit.
 * 3. Filter by location intersection.
 * 4. Apply strict time overlap formula: (StartA < EndB) AND (EndA > StartB).
 * 
 * @param {Object} newEvent - The event object to validate.
 * @param {String} [excludeId] - ID of the event to ignore (used during updates to avoid self-conflict TC-11).
 * @returns {Promise<Object|null>} The first conflicting event detected, or null if safe.
 */
exports.checkConflict = async (newEvent, excludeId = null) => {
    try {
        // --- 1. PREPARE SEARCH WINDOW ---
        // Cross-midnight detection: Scan today, yesterday, and tomorrow.
        const [year, month, day] = newEvent.eventDate.split('-').map(Number);
        const current = new Date(Date.UTC(year, month - 1, day));

        const prev = new Date(current);
        prev.setUTCDate(current.getUTCDate() - 1);
        const next = new Date(current);
        next.setUTCDate(current.getUTCDate() + 1);

        const formatDate = (d) => d.toISOString().split('T')[0];
        const dateRange = [formatDate(prev), newEvent.eventDate, formatDate(next)];

        // --- 2. DATABASE FETCH (With Guardrail) ---
        const snapshot = await eventsCollection
            .where('eventDate', 'in', dateRange)
            .limit(100)
            .get();

        // --- 3. CONFLICT EVALUATION ---
        for (const doc of snapshot.docs) {
            const event = { id: doc.id, ...doc.data() };

            // Protection: Avoid self-conflict during updates (TC-11 / Commit 4)
            if (excludeId && String(event.id) === String(excludeId)) continue;

            // Location Check: Must overlap in at least one venue
            const newLocs = Array.isArray(newEvent.location) ? newEvent.location : [newEvent.location];
            const existingLocs = Array.isArray(event.location) ? event.location : [event.location];
            const hasLocationOverlap = newLocs.some(loc => existingLocs.includes(loc));

            if (!hasLocationOverlap) continue;

            // Time Check: Standard Overlap formula (Exclusive boundaries)
            const startA = getEventStartTime(newEvent);
            const endA = getEventEndTime(newEvent);
            const startB = getEventStartTime(event);
            const endB = getEventEndTime(event);

            // Overlap exists if A starts before B ends AND A ends after B starts
            if (startA < endB && endA > startB) {
                return event; // Found a conflict
            }
        }

        return null; // Safe to proceed
    } catch (error) {
        console.error('[conflictService] Error checking conflict:', error);
        throw error;
    }
};
