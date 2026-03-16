/**
 * Script to analyze and clean up duplicate events in Firestore
 * Run: node scripts/cleanupDuplicates.js
 */
require('dotenv').config();

const admin = require('firebase-admin');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccountConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

initializeApp({
    credential: cert(serviceAccountConfig)
});

const db = getFirestore();

const analyzeEvents = async () => {
    console.log('\n📊 ANALYZING EVENTS...\n');

    const snapshot = await db.collection('events').get();
    const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    console.log(`Total documents in Firestore: ${events.length}`);
    console.log('─'.repeat(60));

    // Group by eventName + eventDate to find duplicates
    const eventMap = {};
    const potentialDuplicates = [];

    events.forEach((event, index) => {
        const key = `${event.eventName}|${event.eventDate}`;
        if (!eventMap[key]) {
            eventMap[key] = [];
        }
        eventMap[key].push(event);
    });

    console.log('\n📋 EVENT LISTING:\n');

    events.forEach((event, index) => {
        console.log(`[${index + 1}] ID: ${event.id}`);
        console.log(`    Name: ${event.eventName || 'N/A'}`);
        console.log(`    Date: ${event.eventDate || 'N/A'}`);
        console.log(`    Department: ${event.department || 'N/A'}`);
        console.log(`    CreatedAt: ${event.createdAt || 'N/A'}`);
        console.log('');
    });

    // Find duplicates
    console.log('─'.repeat(60));
    console.log('\n🔍 DUPLICATE ANALYSIS:\n');

    let duplicateCount = 0;
    const duplicateIds = [];

    Object.entries(eventMap).forEach(([key, items]) => {
        if (items.length > 1) {
            console.log(`⚠️  DUPLICATE FOUND: "${key.split('|')[0]}" on ${key.split('|')[1]}`);
            items.forEach((item, idx) => {
                console.log(`    [${idx + 1}] ID: ${item.id} | Created: ${item.createdAt || 'N/A'}`);
                if (idx > 0) {
                    duplicateIds.push(item.id);
                    duplicateCount++;
                }
            });
            console.log('');
        }
    });

    if (duplicateCount === 0) {
        console.log('✅ No duplicates found based on eventName + eventDate.\n');
    } else {
        console.log(`\n⚠️  Found ${duplicateCount} duplicate entries.`);
    }

    // Find events with missing required fields
    console.log('─'.repeat(60));
    console.log('\n🔍 INCOMPLETE EVENTS:\n');

    const incompleteEvents = events.filter(e => !e.eventName || !e.eventDate);
    if (incompleteEvents.length > 0) {
        incompleteEvents.forEach(e => {
            console.log(`⚠️  Incomplete event ID: ${e.id}`);
            console.log(`    Name: ${e.eventName || 'MISSING'}`);
            console.log(`    Date: ${e.eventDate || 'MISSING'}`);
            duplicateIds.push(e.id);
        });
        console.log('');
    } else {
        console.log('✅ All events have required fields.\n');
    }

    // Summary
    console.log('─'.repeat(60));
    console.log('\n📊 SUMMARY:\n');
    console.log(`Total documents: ${events.length}`);
    console.log(`Unique events: ${Object.keys(eventMap).length}`);
    console.log(`Duplicates to clean: ${duplicateIds.length}`);

    if (duplicateIds.length > 0) {
        console.log(`\nIDs to delete: ${duplicateIds.join(', ')}`);
        console.log('\n⚠️  To delete these duplicates, run with --delete flag:');
        console.log('   node scripts/cleanupDuplicates.js --delete\n');
    }

    // Delete if flag is passed
    if (process.argv.includes('--delete') && duplicateIds.length > 0) {
        console.log('\n🗑️  DELETING DUPLICATES...\n');
        for (const id of duplicateIds) {
            await db.collection('events').doc(id).delete();
            console.log(`   Deleted: ${id}`);
        }
        console.log(`\n✅ Deleted ${duplicateIds.length} duplicate entries.`);
    }

    process.exit(0);
};

analyzeEvents().catch(console.error);
