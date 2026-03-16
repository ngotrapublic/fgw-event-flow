/**
 * Quick Test: Send Email với Facilities Data
 * Để verify facilities hiển thị trong Outlook
 */

const EmailService = require('./services/emailService');

async function testOutlookFacilities() {
    console.log('\n🧪 Testing Facilities in Outlook Email...\n');

    const emailService = new EmailService();

    // Event với facilities data RÕ RÀNG
    const testEvent = {
        eventName: 'Simple Test 11',
        department: 'Phòng Đào Tạo',
        eventDate: '2026-01-23',
        dayOfWeek: 'Thursday',
        startTime: '07:00',
        endTime: '11:30',
        location: 'Sảnh Tầng 2 - Kinh Tuyến',

        // FACILITIES - Array format (đã được convert)
        facilitiesChecklist: [
            'Bàn 1m2 (1)',
            'Ghế (1)',
            'Projector & Screen',
            'Sound System'
        ],

        contactEmail: 'huynt40@fe.edu.vn',
        registrantEmail: 'huynt40@fe.edu.vn'
    };

    try {
        console.log('📧 Event name:', testEvent.eventName);
        console.log('📋 Facilities count:', testEvent.facilitiesChecklist.length);
        console.log('📋 Facilities:', testEvent.facilitiesChecklist);

        await emailService.sendEventNotification(testEvent, 'created');

        console.log('\n✅ Email sent!');
        console.log('📬 Check Outlook inbox for: Simple Test 11');
        console.log('\n🔍 Verify:');
        console.log('   - Header shows gradient/solid colors');
        console.log('   - "YÊU CẦU SETUP" section exists');
        console.log('   - 4 facility items with white backgrounds');
        console.log('   - Orange checkmarks ✓');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
    }
}

// Run test
testOutlookFacilities()
    .then(() => {
        console.log('\n✨ Test complete!');
        process.exit(0);
    })
    .catch(err => {
        console.error('\n💥 Fatal error:', err);
        process.exit(1);
    });
