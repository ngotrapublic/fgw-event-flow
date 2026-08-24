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
const exportJob = require('./jobs/exportJob'); // ✅ NEW

// Services (for /api/notify endpoint)
const retentionService = require('./services/retentionService');
const emailService = require('./services/emailService');
const path = require('path'); // ✅ NEW

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Schedulers
retentionService.startScheduler();
exportJob.start(); // ✅ NEW

// CORS — only allow configured origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000', 'https://event.greenwich-it.com'];

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

// Serve static exports folder
app.use('/exports', express.static(path.join(__dirname, 'public', 'exports')));

// Serve React frontend (Phase 4 Deployment Patch)
app.use(express.static(path.join(__dirname, 'public', 'dist')));

// Health check endpoint (Phase 4 Deployment)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

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

// React Router Fallback (Phase 4 Deployment Patch)
app.get(/^(?!\/api).+/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dist', 'index.html'));
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
const server = app.listen(PORT, () => {
    console.log(`🔥 Firebase Firestore Backend - REFACTORED`);
    console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful Shutdown (Phase 4 Deployment Security & Reliability)
const gracefulShutdown = (signal) => {
    console.log(`\n⚠️  Received ${signal}. Initiating graceful shutdown...`);
    
    // Stop receiving new HTTP requests
    server.close(async () => {
        console.log('✓ HTTP server closed.');

        // Stop background jobs and schedulers
        try {
            reminderJob.stop();
            emailQueueWorker.stop();
            notificationCleanupJob.stop();
            exportJob.stop();
            retentionService.stopScheduler();
            
            // Clean up persistent Puppeteer browser
            const pdfController = require('./controllers/pdfController');
            await pdfController.closeBrowser();
            
            console.log('✓ Schedulers, background workers, and Puppeteer browser stopped.');
        } catch (err) {
            console.error('Error stopping background workers:', err.message);
        }

        console.log('✓ Graceful shutdown complete. Exiting.');
        process.exit(0);
    });

    // Force exit if shutdown hangs longer than 10 seconds
    setTimeout(() => {
        console.error('✗ Forced shutdown due to timeout.');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

