const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// App context for dashboard (accessible to all authenticated users)
router.get('/app-context', verifyToken, settingsController.getAppContext);

// Protect all system settings routes - admin only
router.use(verifyToken, requireRole(['admin']));

router.get('/', settingsController.getSettings);
router.post('/', settingsController.updateSettings);
router.put('/', settingsController.updateSettings); // Allow PUT as well

// Email Template Management Routes
router.get('/email-templates', settingsController.getEmailTemplates);
router.post('/templates/:type/assign', settingsController.assignTemplate);

// Email Preview Route
router.get('/preview/email', settingsController.previewEmail);

module.exports = router;
