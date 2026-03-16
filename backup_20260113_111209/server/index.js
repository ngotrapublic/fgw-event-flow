const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

// Routes
const eventsRouter = require('./routes/events');
const departmentsRouter = require('./routes/departments');
const locationsRouter = require('./routes/locations');
const pdfRouter = require('./routes/pdf'); // ✅ NEW
const settingsRouter = require('./routes/settings'); // ✅ NEW

// Middleware
const errorHandler = require('./middleware/errorHandler');

// Jobs
const reminderJob = require('./jobs/reminderJob');

// Services (for /api/notify endpoint)
const retentionService = require('./services/retentionService');
const emailService = require('./services/emailService');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Scheduler
retentionService.startScheduler();

// Middleware
app.use(cors()); // Default to allow all origins
// Use express.json with increased limit for PDF generation
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

// Notification endpoint (legacy - can be refactored later)
app.post('/api/notify', async (req, res, next) => {
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

// Start server
app.listen(PORT, () => {
    console.log(`🔥 Firebase Firestore Backend - REFACTORED`);
    console.log(`Server running on http://localhost:${PORT}`);
});
