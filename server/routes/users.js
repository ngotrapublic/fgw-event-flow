const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const usersController = require('../controllers/usersController');

// All routes here require Authentication and Admin role
router.use(verifyToken);
router.use(requireRole('admin'));

router.get('/', usersController.listUsers);
router.post('/', usersController.createUser);
router.put('/:id/role', usersController.updateUserRole);
router.put('/:id/department', usersController.updateUserDepartment);
router.put('/:id/reset-password', usersController.resetUserPassword);
router.delete('/:id', usersController.deleteUser);

module.exports = router;
