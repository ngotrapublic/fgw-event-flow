/**
 * Logger Utility - Phase 4 Step 4A
 * Structured logging for production debugging.
 * Using a lightweight custom logger (pino-style) for zero-dependency setup.
 */

const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const currentLevel = process.env.LOG_LEVEL || 'info';

const formatLog = (level, message, meta = {}) => {
    const timestamp = new Date().toISOString();
    const { userId, route, ...safeMeta } = meta;

    // Sanitize sensitive fields
    const sanitized = { ...safeMeta };
    ['password', 'token', 'email', 'apiKey'].forEach(key => {
        if (sanitized[key]) sanitized[key] = '[REDACTED]';
    });

    const logEntry = {
        timestamp,
        level,
        message,
        ...(userId && { userId }),
        ...(route && { route }),
        ...(Object.keys(sanitized).length > 0 && { meta: sanitized })
    };

    return JSON.stringify(logEntry);
};

const shouldLog = (level) => LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];

const logger = {
    debug: (message, meta) => {
        if (shouldLog('debug')) console.debug(formatLog('debug', message, meta));
    },
    info: (message, meta) => {
        if (shouldLog('info')) console.info(formatLog('info', message, meta));
    },
    warn: (message, meta) => {
        if (shouldLog('warn')) console.warn(formatLog('warn', message, meta));
    },
    error: (message, meta) => {
        if (shouldLog('error')) console.error(formatLog('error', message, meta));
    },

    // Specialized loggers for common events
    apiError: (statusCode, route, userId, error) => {
        logger.error('API_ERROR', {
            statusCode,
            route,
            userId,
            errorMessage: error?.message || 'Unknown error',
            stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
        });
    },
    authFailure: (route, reason, ip) => {
        logger.warn('AUTH_FAILURE', { route, reason, ip });
    },
    conflictDetected: (route, userId, conflictDetails) => {
        logger.info('CONFLICT_DETECTED', { route, userId, ...conflictDetails });
    },
    requestLog: (method, route, userId, durationMs, statusCode) => {
        logger.info('REQUEST', { method, route, userId, durationMs, statusCode });
    }
};

module.exports = logger;
