const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { verifyToken } = require('../middleware/authMiddleware');

// All AI routes require authentication
router.use(verifyToken);

// Chat endpoint
router.post('/chat', aiController.chat);

module.exports = router;
