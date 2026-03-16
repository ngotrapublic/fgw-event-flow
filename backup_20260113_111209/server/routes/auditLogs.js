const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
// potentially add auth middleware here if needed
// const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

router.get('/', auditLogController.getLogs);

module.exports = router;
