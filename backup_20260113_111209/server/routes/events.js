const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { verifyToken } = require('../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(verifyToken);

// Get all events
router.get('/', eventController.getAllEvents);

// Get events for Logistics Kanban (3-day window)
router.get('/logistics', eventController.getLogisticsEvents);

// Export CSV (Must be before /:id)
router.get('/export-csv', eventController.exportEventsCsv);

// Get single event
router.get('/:id', eventController.getEventById);

// Check for conflicts
router.post('/check-conflict', eventController.checkConflict);

// Create new event
router.post('/', eventController.createEvent);

// Update event
router.put('/:id', eventController.updateEvent);

// Delete event
router.delete('/:id', eventController.deleteEvent);

module.exports = router;
