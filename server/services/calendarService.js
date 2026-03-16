const ics = require('ics');

/**
 * Calendar Service - Handles generation of .ics files for email attachments
 * Maps system event objects to iCalendar standard format
 */
class CalendarService {

    /**
     * Generate .ics file content for an event
     * @param {Object} event - The system event object
     * @returns {Promise<string>} The .ics file content as a string
     */
    generateIcsEvent(event) {
        return new Promise((resolve, reject) => {

            // Parse start/end times
            // Format is [year, month, day, hour, minute]
            const start = this.parseDateString(event.eventDate, event.timeStart || event.startTime);
            const end = this.parseDateString(event.eventDate, event.timeEnd || event.endTime);

            // Construct description with details
            let description = `Event: ${event.eventName}\nDepartment: ${event.department}`;
            if (event.notes) description += `\n\nNotes: ${event.notes}`;
            if (event.facilitiesSummary) description += `\n\nFacilities: ${event.facilitiesSummary}`;

            const eventAttributes = {
                start: start,
                end: end,
                title: event.eventName,
                description: description,
                location: Array.isArray(event.location) ? event.location.join(', ') : (event.location || 'TBD'),
                uid: (event.groupId || event.id) + '@antigravity.system', // Stable UID for updates
                status: 'CONFIRMED',
                busyStatus: 'BUSY',
                url: 'https://antigravity.system/events/' + event.id, // Placeholder URL
                organizer: { name: 'EventFlow System', email: 'no-reply@eventflow.com' },
                method: 'PUBLISH' // Changed from REQUEST to PUBLISH to avoid Outlook strict filters
            };

            // Inject RRULE if it's a series
            if (event.seriesEndDate) {
                const endParts = event.seriesEndDate.split('-');
                if (endParts.length === 3) {
                    const YYYY = endParts[0];
                    const MM = endParts[1].padStart(2, '0');
                    const DD = endParts[2].padStart(2, '0');
                    // Add recurrence rule until the last day at midnight UTC to cover the entire day
                    eventAttributes.recurrenceRule = `FREQ=DAILY;UNTIL=${YYYY}${MM}${DD}T235959Z`;
                }
            }

            // If time is invalid or not provided, make it an all-day event
            if (!start) {
                // If only date is known, make it all day
                const dateParts = event.eventDate ? event.eventDate.split('-').map(Number) : null;
                if (dateParts && dateParts.length === 3) {
                    eventAttributes.start = dateParts;
                    eventAttributes.end = dateParts; // Single day
                } else {
                    return resolve(''); // Cannot generate without valid date
                }
            } else if (!end) {
                // If start exists but end is missing, default to 1 hour duration
                const endDate = new Date(new Date(event.eventDate + 'T' + (event.timeStart || event.startTime)).getTime() + 60 * 60 * 1000);
                // logic fallback handled inside parse if needed, but here we just keep it simple
                // For now, if end is missing, we just don't set it (ics handles this as instantaneous or default)
                // But better to enforce a duration.
                eventAttributes.duration = { hours: 1 };
            }

            ics.createEvent(eventAttributes, (error, value) => {
                if (error) {
                    console.error('[CALENDAR SERVICE] Error generating ICS:', error);
                    return resolve(''); // Return empty string on failure to not break email flow
                }
                resolve(value);
            });
        });
    }

    /**
     * Helper to parse date string "YYYY-MM-DD" and time "HH:mm" into [Y, M, D, h, m]
     */
    parseDateString(dateStr, timeStr) {
        try {
            if (!dateStr) return null;

            const [year, month, day] = dateStr.split('-').map(Number);

            if (!timeStr) {
                // Return just date for all-day logic if needed, but ics api prefers [y,m,d] for date only 
                // However, standard mix is tricky. Let's return null to signify "no time specific"
                return [year, month, day];
            }

            const [hours, minutes] = timeStr.split(':').map(Number);

            if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
                return null;
            }

            return [year, month, day, hours, minutes];
        } catch (e) {
            console.error('[CALENDAR SERVICE] Date parse error:', e);
            return null;
        }
    }
}

module.exports = new CalendarService();
