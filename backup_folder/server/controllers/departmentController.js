const { departmentsCollection } = require('../config/firebase');

/**
 * Get all departments
 */
exports.getAllDepartments = async (req, res, next) => {
    try {
        const snapshot = await departmentsCollection.get();
        const departments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(departments);
    } catch (error) {
        next(error);
    }
};

/**
 * Create a new department
 */
exports.createDepartment = async (req, res, next) => {
    try {
        const { name, email } = req.body;
        if (!name) return res.status(400).json({ message: 'Department name required' });

        const snapshot = await departmentsCollection.where('name', '==', name).get();
        if (!snapshot.empty) {
            return res.status(400).json({ message: 'Department already exists' });
        }

        const newDept = {
            name,
            emails: email ? [email] : [],
            defaultEmail: email || '' // Set default if email provided
        };
        const docRef = await departmentsCollection.add(newDept);
        res.json({ id: docRef.id, ...newDept });
    } catch (error) {
        next(error);
    }
};

/**
 * Add email to department
 */
exports.addEmailToDepartment = async (req, res, next) => {
    try {
        const { name } = req.params;
        const { email } = req.body;

        const snapshot = await departmentsCollection.where('name', '==', name).get();
        if (snapshot.empty) {
            return res.status(404).json({ message: 'Department not found' });
        }

        const doc = snapshot.docs[0];
        const dept = doc.data();

        if (email && !dept.emails.includes(email)) {
            dept.emails.push(email);
            await departmentsCollection.doc(doc.id).update({ emails: dept.emails });
        }

        res.json({ id: doc.id, ...dept });
    } catch (error) {
        next(error);
    }
};

/**
 * Update department emails
 */
exports.updateDepartment = async (req, res, next) => {
    try {
        const { name } = req.params;
        const { emails } = req.body;

        const snapshot = await departmentsCollection.where('name', '==', name).get();
        if (snapshot.empty) {
            return res.status(404).json({ message: 'Department not found' });
        }

        const doc = snapshot.docs[0];

        if (emails && Array.isArray(emails)) {
            await departmentsCollection.doc(doc.id).update({ emails });
        }

        // [NEW] Allow updating defaultEmail
        if (req.body.defaultEmail !== undefined) {
            await departmentsCollection.doc(doc.id).update({ defaultEmail: req.body.defaultEmail });
        }

        const updated = await departmentsCollection.doc(doc.id).get();
        res.json({ id: doc.id, ...updated.data() });
    } catch (error) {
        next(error);
    }
};

/**
 * Rename department
 */
exports.renameDepartment = async (req, res, next) => {
    try {
        const { name } = req.params;
        const { newName } = req.body;

        if (!newName) return res.status(400).json({ message: 'New name required' });

        const snapshot = await departmentsCollection.where('name', '==', name).get();
        if (snapshot.empty) {
            return res.status(404).json({ message: 'Department not found' });
        }

        const existingSnapshot = await departmentsCollection.where('name', '==', newName).get();
        if (!existingSnapshot.empty) {
            return res.status(400).json({ message: 'Department name already exists' });
        }

        const doc = snapshot.docs[0];
        await departmentsCollection.doc(doc.id).update({ name: newName });

        const updated = await departmentsCollection.doc(doc.id).get();
        res.json({ id: doc.id, ...updated.data() });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete department
 */
exports.deleteDepartment = async (req, res, next) => {
    try {
        const { name } = req.params;

        const snapshot = await departmentsCollection.where('name', '==', name).get();
        if (snapshot.empty) {
            return res.status(404).json({ message: 'Department not found' });
        }

        const doc = snapshot.docs[0];
        await departmentsCollection.doc(doc.id).delete();

        res.json({ message: 'Department deleted' });
    } catch (error) {
        next(error);
    }
};
