require('dotenv').config({ path: '.env.development' });
const calendarService = require('./services/calendarService');

async function test() {
    console.log('Testing ICS Series Generation...');

    // Test Multi-day Series
    const seriesEvent = {
        id: 'test-series-123',
        groupId: 'group-uuid-456',
        eventName: 'Exhibition Setup',
        eventDate: '2026-03-09',
        seriesEndDate: '2026-03-15',
        startTime: '08:00',
        endTime: '17:00',
        department: 'Event Team',
        location: ['Hall A', 'Lobby'],
        notes: 'Multi-day setup block.'
    };

    const icsContent = await calendarService.generateIcsEvent(seriesEvent);
    console.log('\n--- ICS OUTPUT ---');
    console.log(icsContent);
    console.log('------------------\n');

    if (icsContent.includes('RRULE:FREQ=DAILY;UNTIL=20260315T235959Z')) {
        console.log('✅ RRULE string detected correctly.');
    } else {
        console.error('❌ Missing or incorrect RRULE string.');
    }
}

test().catch(console.error);
