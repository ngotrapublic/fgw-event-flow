const calendarService = require('../services/calendarService');

async function testGeneration() {
    console.log('🧪 Testing ICS Generation...');

    const mockEvent = {
        id: 'test-event-123',
        eventName: 'Strategic Planning Meeting',
        department: 'Operations',
        eventDate: '2025-12-25',
        timeStart: '10:00', // 10 AM
        timeEnd: '12:00',   // 12 PM
        location: ['Conference Room A', 'Online'],
        notes: 'Please bring your laptops.',
        facilitiesSummary: 'Projector, Whiteboard'
    };

    try {
        const icsContent = await calendarService.generateIcsEvent(mockEvent);

        console.log('\n📄 Generated ICS Content:');
        console.log('-----------------------------------');
        console.log(icsContent);
        console.log('-----------------------------------');

        // Basic Validation
        const hasCalendarStart = icsContent.includes('BEGIN:VCALENDAR');
        const hasSummary = icsContent.includes('SUMMARY:Strategic Planning Meeting');
        // Check for DTSTART with date part, ignore time part for flexibility or check generic format
        const hasStartDate = /DTSTART:\d{8}T/.test(icsContent);
        const hasUid = icsContent.includes('UID:test-event-123@antigravity.system');
        const hasMethod = icsContent.includes('METHOD:PUBLISH');

        if (hasCalendarStart && hasSummary && hasStartDate && hasUid && hasMethod) {
            console.log('✅ Verification PASSED: ICS structure looks correct.');
        } else {
            console.error('❌ Verification FAILED: Missing key ICS fields.');
            console.log('Missing checks:', { hasCalendarStart, hasSummary, hasStartDate, hasUid, hasMethod });
        }

    } catch (error) {
        console.error('❌ Test Error:', error);
    }
}

testGeneration();
