const { admin, db } = require('../config/firebase');

// List all users from Firestore
const listUsers = async (req, res) => {
    try {
        const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(users);
    } catch (error) {
        console.error('Error listing users:', error);
        res.status(500).json({ error: 'Failed to list users' });
    }
};

// Create a new user (Auth + Firestore)
const createUser = async (req, res) => {
    console.log("Received createUser request:", req.body); // [DEBUG]
    const { email, password, name, role, department } = req.body;

    if (!email || !password || !name) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: name,
        });

        // [OPTIMIZATION] Set Custom User Claims for Auth N+1 prevention
        await admin.auth().setCustomUserClaims(userRecord.uid, { role: role || 'user' });

        // 2. Create user profile in Firestore
        await db.collection('users').doc(userRecord.uid).set({
            uid: userRecord.uid,
            email,
            name,
            role: role || 'user', // Default to user if not specified
            department: department || '', // Save Department
            createdAt: new Date().toISOString(),
            status: 'active'
        });

        // [NEW] 3. Auto-add email to Department's email list
        if (department) {
            const { departmentsCollection } = require('../config/firebase'); // Lazy load to avoid circular deps if any
            const deptSnapshot = await departmentsCollection.where('name', '==', department).get();

            if (!deptSnapshot.empty) {
                const deptDoc = deptSnapshot.docs[0];
                const deptData = deptDoc.data();
                const currentEmails = deptData.emails || [];

                if (!currentEmails.includes(email)) {
                    await departmentsCollection.doc(deptDoc.id).update({
                        emails: [...currentEmails, email]
                    });
                    console.log(`Added ${email} to department ${department}`);
                }
            }
        }

        res.status(201).json({ message: 'User created successfully', uid: userRecord.uid });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: error.message || 'Failed to create user' });
    }
};

// Update user role
const updateUserRole = async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
        return res.status(400).json({ error: 'Role is required' });
    }

    try {
        await db.collection('users').doc(id).update({ role });

        // [OPTIMIZATION] Set Custom User Claims to sync with Firestore
        await admin.auth().setCustomUserClaims(id, { role });

        res.status(200).json({ message: 'User role updated successfully' });
    } catch (error) {
        console.error('Error updating role:', error);
        res.status(500).json({ error: 'Failed to update user role' });
    }
};

// Delete user (Disable in Auth, Mark deleted/Remove in Firestore)
const deleteUser = async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Delete from Firebase Auth
        await admin.auth().deleteUser(id);

        // 2. Delete from Firestore (or we could just mark status: 'deleted')
        await db.collection('users').doc(id).delete();

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

// Update user department
const updateUserDepartment = async (req, res) => {
    const { id } = req.params;
    const { department } = req.body;

    try {
        const userRef = db.collection('users').doc(id);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userData = userDoc.data();
        const oldDepartment = userData.department;
        const email = userData.email;

        if (oldDepartment === department) {
            return res.status(200).json({ message: 'No changes made' });
        }

        // Update user
        await userRef.update({ department });

        // Sync Departments
        const departmentsRef = db.collection('departments');

        // 1. Remove from Old
        if (oldDepartment) {
            const oldSnapshot = await departmentsRef.where('name', '==', oldDepartment).get();
            if (!oldSnapshot.empty) {
                const oldDoc = oldSnapshot.docs[0];
                const oldEmails = oldDoc.data().emails || [];
                const updatedEmails = oldEmails.filter(e => e !== email);
                await oldDoc.ref.update({ emails: updatedEmails });
            }
        }

        // 2. Add to New
        if (department) {
            const newSnapshot = await departmentsRef.where('name', '==', department).get();
            if (!newSnapshot.empty) {
                const newDoc = newSnapshot.docs[0];
                const newEmails = newDoc.data().emails || [];
                if (!newEmails.includes(email)) {
                    await newDoc.ref.update({ emails: [...newEmails, email] });
                }
            }
        }

        res.status(200).json({ message: 'User department updated successfully' });
    } catch (error) {
        console.error('Error updating department:', error);
        res.status(500).json({ error: 'Failed to update user department' });
    }
};

// Reset user password (Admin only)
const resetUserPassword = async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    try {
        await admin.auth().updateUser(id, {
            password: password
        });
        res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
};

module.exports = {
    listUsers,
    createUser,
    updateUserRole,
    updateUserDepartment,
    deleteUser,
    resetUserPassword
};
