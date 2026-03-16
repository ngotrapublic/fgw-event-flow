const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');

// Get all locations
router.get('/', locationController.getAllLocations);

// Create new location
router.post('/', locationController.createLocation);

// Update location
router.put('/:id', locationController.updateLocation);

// Delete location
router.delete('/:id', locationController.deleteLocation);

module.exports = router;
