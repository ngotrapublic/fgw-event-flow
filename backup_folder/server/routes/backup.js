const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');
const { verifyToken } = require('../middleware/authMiddleware');

// Protect all backup routes
router.use(verifyToken);

// GET /api/backup - Download full system backup
router.get('/', backupController.fullSystemBackup);

// POST /api/backup/restore - Restore system from JSON
router.post('/restore', backupController.restoreSystem);

module.exports = router;
