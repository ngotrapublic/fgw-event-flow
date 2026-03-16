/**
 * Migration script: Import existing JSON data into Firestore
 * Run this once to migrate from JSON files to Firebase
 */

require('dotenv').config();
const { eventsCollection, departmentsCollection } = require('./firebase');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const DEPARTMENTS_FILE = path.join(DATA_DIR, 'departments.json');

async function migrateToFirestore() {
    try {
        console.log('🔄 Starting migration to Firestore...\n');

        // Read existing JSON data
        let events = [];
        let departments = [];

        if (fs.existsSync(EVENTS_FILE)) {
            events = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'));
            console.log(`📄 Found ${events.length} events in JSON file`);
        }

        if (fs.existsSync(DEPARTMENTS_FILE)) {
            departments = JSON.parse(fs.readFileSync(DEPARTMENTS_FILE, 'utf-8'));
            console.log(`📄 Found ${departments.length} departments in JSON file`);
        }

        // Migrate Events
        console.log('\n📤 Migrating events to Firestore...');
        for (const event of events) {
            const { id, ...eventData } = event;
            // Convert ID to string and ensure it's not empty
            const docId = id ? String(id) : Date.now().toString();
            await eventsCollection.doc(docId).set(eventData);
            console.log(`  ✓ Event migrated: ${event.eventName} (${docId})`);
        }

        // Migrate Departments
        console.log('\n📤 Migrating departments to Firestore...');
        for (const dept of departments) {
            const { id, ...deptData } = dept;
            // Convert ID to string and ensure it's not empty
            const docId = id ? String(id) : Date.now().toString();
            await departmentsCollection.doc(docId).set(deptData);
            console.log(`  ✓ Department migrated: ${dept.name} (${docId})`);
        }

        // Verify migration
        console.log('\n🔍 Verifying migration...');
        const eventsSnapshot = await eventsCollection.get();
        const deptsSnapshot = await departmentsCollection.get();

        console.log(`  ✓ Events in Firestore: ${eventsSnapshot.size}`);
        console.log(`  ✓ Departments in Firestore: ${deptsSnapshot.size}`);

        if (eventsSnapshot.size === events.length && deptsSnapshot.size === departments.length) {
            console.log('\n✅ Migration completed successfully!');
            console.log('📝 You can now update server/index.js to use Firestore');
        } else {
            console.log('\n⚠️  Migration count mismatch. Please check.');
        }

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run the migration
migrateToFirestore()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
