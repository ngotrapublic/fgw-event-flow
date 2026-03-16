const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');

// Get all departments
router.get('/', departmentController.getAllDepartments);

// Create new department
router.post('/', departmentController.createDepartment);

// Add email to department
router.post('/:name/emails', departmentController.addEmailToDepartment);

// Update department emails
router.put('/:name', departmentController.updateDepartment);

// Rename department
router.put('/:name/rename', departmentController.renameDepartment);

// Delete department
router.delete('/:name', departmentController.deleteDepartment);

module.exports = router;
