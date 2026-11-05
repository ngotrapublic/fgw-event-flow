const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resourceController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

const canManage = requireRole(['admin', 'manager']);

// Read accessible to all authenticated users (EventForm needs it)
router.get('/', verifyToken, resourceController.getAllResources);

// Write operations restricted to admin and manager
router.post('/', verifyToken, canManage, resourceController.createResource);
router.put('/', verifyToken, canManage, resourceController.updateResource);
router.put('/:id', verifyToken, canManage, resourceController.updateResource);
router.delete('/', verifyToken, canManage, resourceController.deleteResource);
router.delete('/:id', verifyToken, canManage, resourceController.deleteResource);

module.exports = router;
