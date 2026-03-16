const { eventsCollection } = require('../config/firebase');
const { getEventStartTime, getEventEndTime } = require('./timeHelpers');

/**
 * Check if a new event conflicts with existing events
 * @param {Object} newEvent - Event to check
 * @param {String} excludeId - ID to exclude from conflict check (for updates)
 * @returns {Object|null} Conflicting event or null
 */
exports.checkConflict = async (newEvent, excludeId = null) => {
    try {
        // Query by Date only, then filter locations in memory
        const snapshot = await eventsCollection
            .where('eventDate', '==', newEvent.eventDate)
            .get();

        for (const doc of snapshot.docs) {
            const event = { id: doc.id, ...doc.data() };

            if (excludeId && event.id == excludeId) continue;

            // Normalize locations to arrays
            const newLocs = Array.isArray(newEvent.location) ? newEvent.location : [newEvent.location];
            const existingLocs = Array.isArray(event.location) ? event.location : [event.location];

            // Check for location intersection
            const hasLocationOverlap = newLocs.some(loc => existingLocs.includes(loc));

            if (!hasLocationOverlap) continue;

            const startA = getEventStartTime(newEvent);
            const endA = getEventEndTime(newEvent);
            const startB = getEventStartTime(event);
            const endB = getEventEndTime(event);

            // Overlap if (StartA < EndB) and (EndA > StartB)
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
