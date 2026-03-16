const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');
const { verifyToken } = require('../middleware/authMiddleware');

// Protect all backup routes
router.use(verifyToken);

// GET /api/backup - Download full system backup
router.get('/', backupController.fullSystemBackup);

// POST /api/backup/validate - Validate backup file (Step 1)
router.post('/validate', backupController.validateBackup);

// POST /api/backup/restore - Restore system from backup (Step 2 - requires confirmation)
router.post('/restore', backupController.restoreSystem);

module.exports = router;
