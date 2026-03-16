/**
 * Get event start time as Date object enforcing Vietnam Timezone (UTC+7)
 */
exports.getEventStartTime = (event) => {
    let hourStr = '07';
    let minuteStr = '00';

    if (event.startTime) {
        const timeParts = event.startTime.split(':');
        hourStr = timeParts[0].padStart(2, '0');
        minuteStr = timeParts[1].padStart(2, '0');
    } else {
        if (event.eventSession === 'Chiều') { hourStr = '13'; minuteStr = '00'; }
        if (event.eventSession === 'Tối') { hourStr = '18'; minuteStr = '00'; }
    }

    // Force UTC+7 timezone explicitly
    const isoString = `${event.eventDate}T${hourStr}:${minuteStr}:00+07:00`;
    return new Date(isoString);
};

/**
 * Get event end time as Date object enforcing Vietnam Timezone (UTC+7)
 */
exports.getEventEndTime = (event) => {
    let hourStr = '11';
    let minuteStr = '30';

    if (event.endTime) {
        const timeParts = event.endTime.split(':');
        hourStr = timeParts[0].padStart(2, '0');
        minuteStr = timeParts[1].padStart(2, '0');
    } else {
        if (event.eventSession === 'Chiều') { hourStr = '17'; minuteStr = '30'; }
        if (event.eventSession === 'Tối') { hourStr = '21'; minuteStr = '00'; }
        if (event.eventSession === 'Cả ngày') { hourStr = '17'; minuteStr = '30'; }
    }

    // Force UTC+7 timezone explicitly
    const isoString = `${event.eventDate}T${hourStr}:${minuteStr}:00+07:00`;
    return new Date(isoString);
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
        // Parse explicitly enforcing Vietnam timezone
        const dateObj = new Date(`${dateStr}T${timeStr}:00+07:00`);
        return isNaN(dateObj.getTime()) ? null : Math.floor(dateObj.getTime() / 1000);
    } catch (e) {
        return null;
    }
};
