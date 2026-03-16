const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

router.get('/', settingsController.getSettings);
router.post('/', settingsController.updateSettings);
router.put('/', settingsController.updateSettings); // Allow PUT as well

// Email Template Management Routes
router.get('/email-templates', settingsController.getEmailTemplates);
router.post('/templates/:type/assign', settingsController.assignTemplate);

// Email Preview Route
router.get('/preview/email', settingsController.previewEmail);

module.exports = router;

