const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { verifyToken } = require('../middleware/authMiddleware');

// Apply auth middleware
router.use(verifyToken);

// Get analytics summary
router.get('/summary', analyticsController.getAnalyticsSummary);

module.exports = router;
