require('dotenv').config();
const emailService = require('../services/emailService');
const emailQueue = require('../services/emailQueue');

// Mocking the event the user likely created
const mockEvent = {
    id: 'debug-test-ics-event-id',
    eventName: 'TEST ICS',
    department: 'Operations', // Adjust if known, otherwise guessing standard dept
    eventDate: '2025-02-15',
    timeStart: '09:00',
    timeEnd: '10:00',
    location: 'Test Location',
    description: 'Debugging email delivery',
    registrantEmail: 'admin@antigravity.system', // Should get email here if logic works
    contactEmail: 'user@antigravity.system'
};

async function runDebug() {
    console.log('🐞 Starting Debug for "TEST ICS" event...');

    try {
        // 1. Check Recipient Resolution
        console.log('\n1️⃣ Checking Recipients...');
        const recipients = await emailService.getRecipients(mockEvent);
        console.log('   Found Recipients:', recipients);

        if (recipients.length === 0) {
            console.error('   ❌ NO RECIPIENTS FOUND! This is likely why no email was sent.');
            console.log('   Check: Is the department name correct? Does the department have a defaultEmail in DB?');
        } else {
            console.log('   ✅ Recipients found.');
        }

        // 2. Check ICS Generation (Direct)
        console.log('\n2️⃣ Checking ICS Generation...');
        const calendarService = require('../services/calendarService');
        const ics = await calendarService.generateIcsEvent(mockEvent);
        if (ics && ics.includes('BEGIN:VCALENDAR')) {
            console.log('   ✅ ICS generated successfully (`' + ics.substring(0, 50).replace(/\n/g, ' ') + '...`)');
        } else {
            console.error('   ❌ ICS Generation FAILED or returned empty.');
        }

        // 3. Check Queue Logic (Dry Run)
        console.log('\n3️⃣ Checking Queue Deduplication...');
        // We won't actually enqueue to avoid polluting DB, but we check if a job exists
        const { db } = require('../config/firebase');
        const pending = await db.collection('emailQueue')
            .where('eventId', '==', mockEvent.id)
            .where('type', '==', 'created')
            .where('status', 'in', ['pending', 'processing'])
            .get();

        if (!pending.empty) {
            console.log('   ⚠️ Found existing pending job for this event. Deduplication would trigger.');
        } else {
            console.log('   ✅ No pending jobs found. Enqueue would succeed.');
        }

        console.log('\n--- Debug Complete ---');

    } catch (error) {
        console.error('❌ Debug Script Error:', error);
    } finally {
        process.exit(0);
    }
}

runDebug();
