require('dotenv').config();
const { db } = require('./config/firebase');

const locationsCollection = db.collection('locations');

const defaultLocations = [
    'Hội trường Alpha',
    'Phòng 101',
    'Phòng 102',
    'Phòng 103',
    'Sân Stadium'
];

async function migrateLocations() {
    console.log('🔄 Starting locations migration...');

    try {
        // Check if locations already exist
        const snapshot = await locationsCollection.get();

        if (!snapshot.empty) {
            console.log(`⚠️  Found ${snapshot.size} existing locations. Skipping migration.`);
            return;
        }

        // Migrate default locations
        for (const name of defaultLocations) {
            await locationsCollection.add({
                name,
                createdAt: new Date().toISOString()
            });
            console.log(`✅ Added location: ${name}`);
        }

        console.log('🎉 Migration completed successfully!');
        console.log(`📊 Total locations migrated: ${defaultLocations.length}`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Run migration
migrateLocations()
    .then(() => {
        console.log('\n✅ Migration script completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Migration script failed:', error);
        process.exit(1);
    });
