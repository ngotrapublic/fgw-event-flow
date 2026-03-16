/**
 * Event Input Validation Middleware
 * Validates required fields and sanitizes input for event create/update operations.
 */

const REQUIRED_CREATE_FIELDS = ['eventName', 'eventDate', 'startTime', 'endTime', 'location', 'department', 'registrantEmail'];
const MAX_ALLOWED_DAYS = 30;

/**
 * Validate event data for CREATE requests.
 * Rejects requests with missing required fields or invalid date ranges.
 */
const validateCreateEvent = (req, res, next) => {
    const body = req.body;
    const errors = [];

    // Check required fields
    for (const field of REQUIRED_CREATE_FIELDS) {
        const val = body[field];
        if (!val || (typeof val === 'string' && !val.trim()) || (Array.isArray(val) && val.length === 0)) {
            errors.push(`"${field}" is required`);
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({ message: 'Validation failed', errors });
    }

    // Validate date format: YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.eventDate)) {
        return res.status(400).json({ message: 'Invalid eventDate format. Use YYYY-MM-DD.' });
    }

    // Validate end date if provided
    if (body.eventEndDate) {
        if (!dateRegex.test(body.eventEndDate)) {
            return res.status(400).json({ message: 'Invalid eventEndDate format. Use YYYY-MM-DD.' });
        }
        const startD = new Date(body.eventDate);
        const endD = new Date(body.eventEndDate);
        if (endD < startD) {
            return res.status(400).json({ message: 'eventEndDate must be on or after eventDate.' });
        }
        const daysDiff = Math.ceil((endD - startD) / (1000 * 60 * 60 * 24)) + 1;
        if (daysDiff > MAX_ALLOWED_DAYS) {
            return res.status(400).json({ message: `Series events cannot span more than ${MAX_ALLOWED_DAYS} days.` });
        }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.registrantEmail)) {
        return res.status(400).json({ message: 'Invalid registrantEmail format.' });
    }

    // Strip any unexpected prototype-polluting keys
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    for (const key of dangerousKeys) {
        delete body[key];
    }

    next();
};

/**
 * Validate event data for UPDATE requests.
 * More permissive than create — only validates fields if provided.
 */
const validateUpdateEvent = (req, res, next) => {
    const body = req.body;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (body.eventDate && !dateRegex.test(body.eventDate)) {
        return res.status(400).json({ message: 'Invalid eventDate format. Use YYYY-MM-DD.' });
    }

    if (body.eventEndDate) {
        if (!dateRegex.test(body.eventEndDate)) {
            return res.status(400).json({ message: 'Invalid eventEndDate format. Use YYYY-MM-DD.' });
        }
        const startDate = body.eventDate || new Date().toISOString().split('T')[0];
        const startD = new Date(startDate);
        const endD = new Date(body.eventEndDate);
        if (endD < startD) {
            return res.status(400).json({ message: 'eventEndDate must be on or after eventDate.' });
        }
        const daysDiff = Math.ceil((endD - startD) / (1000 * 60 * 60 * 24)) + 1;
        if (daysDiff > MAX_ALLOWED_DAYS) {
            return res.status(400).json({ message: `Series events cannot span more than ${MAX_ALLOWED_DAYS} days.` });
        }
    }

    if (body.registrantEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(body.registrantEmail)) {
            return res.status(400).json({ message: 'Invalid registrantEmail format.' });
        }
    }

    // Strip dangerous keys
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    for (const key of dangerousKeys) {
        delete body[key];
    }

    next();
};

module.exports = { validateCreateEvent, validateUpdateEvent };
