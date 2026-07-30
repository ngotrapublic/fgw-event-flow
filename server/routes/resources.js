const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resourceController');
const { verifyToken } = require('../middleware/authMiddleware');

// Public read (for EventForm), Protected write (for ResourceManager)
// Actually, EventForm needs it, so it should be accessible to authenticated users.
// ResourceManager needs to write, so maybe Manager/Admin only?
// For now, let's allow read for all auth users, write for admin/manager.

router.get('/', verifyToken, resourceController.getAllResources);
router.post('/', verifyToken, resourceController.createResource); // TODO: Add role check
router.put('/:id', verifyToken, resourceController.updateResource); // TODO: Add role check
router.delete('/:id', verifyToken, resourceController.deleteResource); // TODO: Add role check

module.exports = router;
