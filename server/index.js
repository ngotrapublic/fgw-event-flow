const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Routes
const eventsRouter = require('./routes/events');
const departmentsRouter = require('./routes/departments');
const locationsRouter = require('./routes/locations');
const pdfRouter = require('./routes/pdf'); // ✅ NEW
const settingsRouter = require('./routes/settings'); // ✅ NEW

// Middleware
const errorHandler = require('./middleware/errorHandler');
const { verifyToken } = require('./middleware/authMiddleware');

// Jobs
const reminderJob = require('./jobs/reminderJob');
const emailQueueWorker = require('./jobs/emailQueueWorker');
const notificationCleanupJob = require('./jobs/notificationCleanupJob');

// Services (for /api/notify endpoint)
const retentionService = require('./services/retentionService');
const emailService = require('./services/emailService');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Scheduler
retentionService.startScheduler();

// CORS — only allow configured origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, Postman in dev)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`CORS: Origin "${origin}" not allowed`));
    },
    credentials: true
}));

// Body parsers — 10mb is sufficient for PDF generation
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

console.log('🔥 Using Firebase Firestore for data storage');

// Routes
app.use('/api/events', eventsRouter);
app.use('/api/departments', departmentsRouter);
app.use('/api/locations', locationsRouter);
app.use('/api/pdf', pdfRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/users', require('./routes/users'));
app.use('/api/resources', require('./routes/resources'));
app.use('/api/audit-logs', require('./routes/auditLogs')); // ✅ NEW: Audit Logs API
app.use('/api/backup', require('./routes/backup')); // ✅ NEW: Backup & Restore API
app.use('/api/import', require('./routes/importRoutes')); // ✅ NEW: Excel Import API
app.use('/api/analytics', require('./routes/analytics')); // Phase 3: Analytics Endpoint

// Notification endpoint (legacy - protected by auth)
app.post('/api/notify', verifyToken, async (req, res, next) => {
    try {
        const { recipients, email, eventName, event } = req.body;
        const targetEmails = recipients || [email];

        if (event) {
            const content = emailService.formatEventEmail(event);
            const subject = `Event Notification: ${event.eventName}`;
            await emailService.send(targetEmails, subject, content);
        } else {
            const subject = `Notification: ${eventName || 'Event'}`;
            const content = 'Notification content here.';
            await emailService.send(targetEmails, subject, content);
        }

        res.json({ message: 'Notification sent' });
    } catch (error) {
        next(error);
    }
});

// Error handling (must be last)
app.use(errorHandler);

// Start reminder job
reminderJob.start();

// Start email queue worker
emailQueueWorker.start();

// Start notification cleanup job
notificationCleanupJob.start();

// Start server
app.listen(PORT, () => {
    console.log(`🔥 Firebase Firestore Backend - REFACTORED`);
    console.log(`Server running on http://localhost:${PORT}`);
});
