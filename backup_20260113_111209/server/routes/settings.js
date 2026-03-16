const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

router.get('/', settingsController.getSettings);
router.post('/', settingsController.updateSettings);
router.put('/', settingsController.updateSettings); // Allow PUT as well

module.exports = router;
