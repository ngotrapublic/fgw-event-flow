/**
 * Global error handler middleware
 * Phase 4: Enhanced with structured logging
 */
const logger = require('../utils/logger');

module.exports = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    // Structured logging
    logger.apiError(statusCode, req.originalUrl, req.user?.uid, err);

    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};
