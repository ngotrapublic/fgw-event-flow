const { db, resourcesCollection } = require('../config/firebase');
const cacheService = require('../services/cacheService');
const { logAction } = require('../controllers/auditLogController');
const HttpError = require('../utils/http-error');

// Default initial resources if DB is empty
const INITIAL_RESOURCES = [
    { id: 'loa', label: 'Loa / Âm thanh', category: 'Audio', quantity: 10, availableQty: 10, icon: 'Speaker' },
    { id: 'mic', label: 'Micro', category: 'Audio', quantity: 20, availableQty: 20, icon: 'Mic' },
    { id: 'led', label: 'Màn hình LED', category: 'Visual', quantity: 5, availableQty: 5, icon: 'Monitor' },
    { id: 'ban', label: 'Bàn', category: 'Furniture', quantity: 50, availableQty: 50, icon: 'Layout' },
    { id: 'ghe', label: 'Ghế', category: 'Furniture', quantity: 200, availableQty: 200, icon: 'Layout' },
    { id: 'tivi', label: 'Tivi', category: 'Visual', quantity: 8, availableQty: 8, icon: 'Monitor' },
    { id: 'standee', label: 'Standee', category: 'Branding', quantity: 15, availableQty: 15, icon: 'Layout' },
    { id: 'anhsang', label: 'Ánh sáng', category: 'Lighting', quantity: 4, availableQty: 4, icon: 'Zap' },
    { id: 'nuoc', label: 'Nước suối / Teabreak', category: 'Catering', quantity: 1000, availableQty: 1000, icon: 'Coffee' },
];

const getAllResources = async (req, res, next) => {
    try {
        const snapshot = await resourcesCollection.get();
        if (snapshot.empty) {
            // Seed if empty
            const batch = db.batch();
            const seeded = INITIAL_RESOURCES.map((item) => ({
                ...item,
                availableQty: item.availableQty !== undefined ? item.availableQty : item.quantity
            }));
            seeded.forEach((item) => {
                const docRef = resourcesCollection.doc(item.id);
                batch.set(docRef, item);
            });
            await batch.commit();

            return res.json(seeded);
        }

        const resources = snapshot.docs.map((doc) => {
            const data = doc.data() || {};
            return {
                id: doc.id,
                ...data,
                availableQty: data.availableQty !== undefined ? data.availableQty : data.quantity
            };
        });
        res.json(resources);
    } catch (error) {
        if (typeof next === 'function') return next(error);
        console.error('Error fetching resources:', error);
        res.status(500).json({ error: 'Failed to fetch resources' });
    }
};

const createResource = async (req, res, next) => {
    try {
        const { label, category, quantity, icon } = req.body;
        const actor = req.user ? req.user.email : 'Admin (Legacy)';
        const role = req.user ? req.user.role : 'admin';

        const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); // Safe ID generation
        const parsedQty = parseInt(quantity, 10) || 0;

        const newResource = {
            label,
            category,
            quantity: parsedQty,
            availableQty: parsedQty,
            icon
        };

        await resourcesCollection.doc(id).set(newResource);

        // LOGGING
        await logAction({
            actor, role, action: 'CREATE', target: `Resource: ${label}`, details: newResource, ip: req.ip
        });

        cacheService.invalidate('metadata');
        res.status(201).json({ id, ...newResource });
    } catch (error) {
        if (typeof next === 'function') return next(error);
        console.error('Error creating resource:', error);
        res.status(500).json({ error: 'Failed to create resource' });
    }
};

const updateResource = async (req, res, next) => {
    try {
        const id = req.query.id || req.params.id;
        if (!id) return res.status(400).json({ error: 'Missing resource ID' });
        const updates = { ...req.body };
        delete updates.availableQty; // Prevent client from setting directly
        delete updates.id; // Prevent ID update

        const actor = req.user ? req.user.email : 'Admin (Legacy)';
        const role = req.user ? req.user.role : 'admin';

        await db.runTransaction(async (tx) => {
            const docRef = resourcesCollection.doc(id);
            const snap = await tx.get(docRef);
            if (!snap.exists) {
                throw new HttpError(404, 'Không tìm thấy thiết bị');
            }
            const old = snap.data();
            if (updates.quantity !== undefined) {
                const newQty = parseInt(updates.quantity, 10);
                if (isNaN(newQty) || newQty < 0) {
                    throw new HttpError(400, 'Số lượng không hợp lệ');
                }
                const oldQty = old.quantity !== undefined ? old.quantity : 0;
                const oldAvail = old.availableQty !== undefined ? old.availableQty : oldQty;
                const delta = newQty - oldQty;
                const newAvail = oldAvail + delta;
                if (newAvail < 0) {
                    throw new HttpError(409, 'Số lượng mới nhỏ hơn số đang cho mượn');
                }
                updates.quantity = newQty;
                updates.availableQty = newAvail;
            }
            tx.update(docRef, updates);
        });

        // LOGGING
        await logAction({
            actor, role, action: 'UPDATE', target: `Resource: ${id}`, details: updates, ip: req.ip
        });

        cacheService.invalidate('metadata');
        res.json({ id, ...updates });
    } catch (error) {
        if (typeof next === 'function') return next(error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ error: error.message || 'Failed to update resource' });
    }
};

const deleteResource = async (req, res, next) => {
    try {
        const id = req.query.id || req.params.id;
        if (!id) return res.status(400).json({ error: 'Missing resource ID' });
        const actor = req.user ? req.user.email : 'Admin (Legacy)';
        const role = req.user ? req.user.role : 'admin';

        const docRef = resourcesCollection.doc(id);
        const snap = await docRef.get();
        if (!snap.exists) {
            throw new HttpError(404, 'Không tìm thấy thiết bị');
        }
        const data = snap.data();
        const qty = data.quantity !== undefined ? data.quantity : 0;
        const avail = data.availableQty !== undefined ? data.availableQty : qty;
        if (avail < qty) {
            throw new HttpError(409, 'Thiết bị đang có người mượn');
        }

        await docRef.delete();

        // LOGGING
        await logAction({
            actor, role, action: 'DELETE', target: `Resource: ${id}`, details: {}, ip: req.ip
        });

        cacheService.invalidate('metadata');
        res.json({ message: 'Resource deleted successfully' });
    } catch (error) {
        if (typeof next === 'function') return next(error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ error: error.message || 'Failed to delete resource' });
    }
};

module.exports = {
    getAllResources,
    createResource,
    updateResource,
    deleteResource
};
