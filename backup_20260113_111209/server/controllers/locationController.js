const { db } = require('../config/firebase');
const locationsCollection = db.collection('locations');

/**
 * Get all locations
 */
exports.getAllLocations = async (req, res, next) => {
    try {
        const snapshot = await locationsCollection.orderBy('name').get();
        const locations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(locations);
    } catch (error) {
        next(error);
    }
};

/**
 * Create a new location
 */
exports.createLocation = async (req, res, next) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Location name is required' });
        }

        // Check if location already exists
        const snapshot = await locationsCollection.where('name', '==', name).get();
        if (!snapshot.empty) {
            return res.status(400).json({ message: 'Location already exists' });
        }

        const newLocation = {
            name,
            createdAt: new Date().toISOString()
        };

        const docRef = await locationsCollection.add(newLocation);
        res.status(201).json({ id: docRef.id, ...newLocation });
    } catch (error) {
        next(error);
    }
};

/**
 * Update a location
 */
exports.updateLocation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Location name is required' });
        }

        const doc = await locationsCollection.doc(id).get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Location not found' });
        }

        // Check if new name already exists (exclude current location)
        const snapshot = await locationsCollection.where('name', '==', name).get();
        if (!snapshot.empty && snapshot.docs[0].id !== id) {
            return res.status(400).json({ message: 'Location name already exists' });
        }

        await locationsCollection.doc(id).update({ name });
        const updated = await locationsCollection.doc(id).get();

        res.json({ id, ...updated.data() });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete a location
 */
exports.deleteLocation = async (req, res, next) => {
    try {
        const { id } = req.params;

        const doc = await locationsCollection.doc(id).get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Location not found' });
        }

        await locationsCollection.doc(id).delete();
        res.json({ message: 'Location deleted successfully' });
    } catch (error) {
        next(error);
    }
};
