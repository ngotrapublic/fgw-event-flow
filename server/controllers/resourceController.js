const { resourcesCollection } = require('../config/firebase');

// Default initial resources if DB is empty
const INITIAL_RESOURCES = [
    { id: 'loa', label: 'Loa / Âm thanh', category: 'Audio', quantity: 10, icon: 'Speaker' },
    { id: 'mic', label: 'Micro', category: 'Audio', quantity: 20, icon: 'Mic' },
    { id: 'led', label: 'Màn hình LED', category: 'Visual', quantity: 5, icon: 'Monitor' },
    { id: 'ban', label: 'Bàn', category: 'Furniture', quantity: 50, icon: 'Layout' },
    { id: 'ghe', label: 'Ghế', category: 'Furniture', quantity: 200, icon: 'Layout' },
    { id: 'tivi', label: 'Tivi', category: 'Visual', quantity: 8, icon: 'Monitor' },
    { id: 'standee', label: 'Standee', category: 'Branding', quantity: 15, icon: 'Layout' },
    { id: 'anhsang', label: 'Ánh sáng', category: 'Lighting', quantity: 4, icon: 'Zap' },
    { id: 'nuoc', label: 'Nước suối / Teabreak', category: 'Catering', quantity: 1000, icon: 'Coffee' },
];

// Import logAction
const { logAction } = require('../controllers/auditLogController');

const getAllResources = async (req, res) => {
    try {
        const snapshot = await resourcesCollection.get();
        if (snapshot.empty) {
            // Seed if empty
            const batch = require('../config/firebase').db.batch();
            INITIAL_RESOURCES.forEach(item => {
                const docRef = resourcesCollection.doc(item.id);
                batch.set(docRef, item);
            });
            await batch.commit();

            return res.json(INITIAL_RESOURCES);
        }

        const resources = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(resources);
    } catch (error) {
        console.error('Error fetching resources:', error);
        res.status(500).json({ error: 'Failed to fetch resources' });
    }
};

const createResource = async (req, res) => {
    try {
        const { label, category, quantity, icon } = req.body;
        // Mock user info if not in req (since resource API might not be fully protected yet or used by admin)
        // Ideally req.user is populated by verifyToken
        const actor = req.user ? req.user.email : 'Admin (Legacy)';
        const role = req.user ? req.user.role : 'admin';

        const id = label.toLowerCase().replace(/\s+/g, '-'); // Simple ID generation

        const newResource = { label, category, quantity: parseInt(quantity), icon };

        await resourcesCollection.doc(id).set(newResource);

        // LOGGING
        await logAction({
            actor, role, action: 'CREATE', target: `Resource: ${label}`, details: newResource, ip: req.ip
        });

        res.status(201).json({ id, ...newResource });
    } catch (error) {
        console.error('Error creating resource:', error);
        res.status(500).json({ error: 'Failed to create resource' });
    }
};

const updateResource = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        delete updates.id; // Prevent ID update

        const actor = req.user ? req.user.email : 'Admin (Legacy)';
        const role = req.user ? req.user.role : 'admin';

        await resourcesCollection.doc(id).update(updates);

        // LOGGING
        await logAction({
            actor, role, action: 'UPDATE', target: `Resource: ${id}`, details: updates, ip: req.ip
        });

        res.json({ id, ...updates });
    } catch (error) {
        console.error('Error updating resource:', error);
        res.status(500).json({ error: 'Failed to update resource' });
    }
};

const deleteResource = async (req, res) => {
    try {
        const { id } = req.params;
        const actor = req.user ? req.user.email : 'Admin (Legacy)';
        const role = req.user ? req.user.role : 'admin';

        await resourcesCollection.doc(id).delete();

        // LOGGING
        await logAction({
            actor, role, action: 'DELETE', target: `Resource: ${id}`, details: {}, ip: req.ip
        });

        res.json({ message: 'Resource deleted successfully' });
    } catch (error) {
        console.error('Error deleting resource:', error);
        res.status(500).json({ error: 'Failed to delete resource' });
    }
};

module.exports = {
    getAllResources,
    createResource,
    updateResource,
    deleteResource
};
