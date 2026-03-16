const express = require('express');
const cors = require('cors');
const router = express.Router();
const pdfController = require('../controllers/pdfController');

// Route-specific CORS removed to use global configuration
router.post('/generate', pdfController.generatePdf);

module.exports = router;
