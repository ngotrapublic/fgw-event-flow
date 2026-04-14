const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { validateCreateEvent, validateUpdateEvent } = require('../middleware/eventValidation');

// Apply auth middleware to all routes
router.use(verifyToken);

// Get all events
router.get('/', eventController.getAllEvents);

// Get events for Logistics Kanban (3-day window)
router.get('/logistics', eventController.getLogisticsEvents);

// Dashboard Stats (must be before /:id)
router.get('/stats', eventController.getStats);

// Export CSV (Must be before /:id)
router.get('/export-csv', eventController.exportEventsCsv);

// Get single event
router.get('/:id', eventController.getEventById);

// Check for conflicts
router.post('/check-conflict', eventController.checkConflict);

// Create new event
router.post('/', validateCreateEvent, eventController.createEvent);

// Update event
router.put('/:id', validateUpdateEvent, eventController.updateEvent);

// Delete event
router.delete('/:id', eventController.deleteEvent);

// Toggle contractor sign status (PATCH /api/events/:id/contractor/:index/sign)
router.patch('/:id/contractor/:index/sign', requireRole(['admin', 'manager']), eventController.toggleContractorSign);

module.exports = router;
