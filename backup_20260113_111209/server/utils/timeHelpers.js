/**
 * Parse event date string and create Date object
 */
const parseEventDate = (dateString) => {
    const dateParts = dateString.split('-');
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1;
    const day = parseInt(dateParts[2]);
    return { year, month, day };
};

/**
 * Get event start time as Date object
 */
exports.getEventStartTime = (event) => {
    const { year, month, day } = parseEventDate(event.eventDate);

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

/**
 * Get event end time as Date object
 */
exports.getEventEndTime = (event) => {
    const { year, month, day } = parseEventDate(event.eventDate);

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

/**
 * Check if current time is within reminder window
 */
exports.isWithinReminderWindow = (eventTime, windowHours) => {
    const now = new Date();
    const timeDiffMs = eventTime - now;
    const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

    const minHours = windowHours - 1;
    const maxHours = windowHours + 1;

    return timeDiffHours >= minHours && timeDiffHours <= maxHours;
};

/**
 * Converts date and time strings to epoch seconds.
 * @param {string} dateStr - YYYY-MM-DD
 * @param {string} timeStr - HH:mm
 * @returns {number|null} Unix timestamp in seconds
 */
exports.toEpoch = (dateStr, timeStr) => {
    try {
        if (!dateStr || !timeStr) return null;
        // Forced UTC parsing to be independent of server timezone
        const dateObj = new Date(`${dateStr}T${timeStr}:00Z`);
        return isNaN(dateObj.getTime()) ? null : Math.floor(dateObj.getTime() / 1000);
    } catch (e) {
        return null;
    }
};
