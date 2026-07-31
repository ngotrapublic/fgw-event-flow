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
// Support both Query Params (new, safe) and Path Params (legacy) to prevent HMR/Caching issues
router.put('/', verifyToken, resourceController.updateResource);
router.put('/:id', verifyToken, resourceController.updateResource);
router.delete('/', verifyToken, resourceController.deleteResource);
router.delete('/:id', verifyToken, resourceController.deleteResource);

module.exports = router;
