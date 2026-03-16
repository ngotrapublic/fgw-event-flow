/**
 * Test Script: Send Email với Facilities Data
 * 
 * Test Split-Screen template with facilities list
 */

const EmailService = require('./services/emailService');
const emailService = new EmailService();

async function testEmailWithFacilities() {
    console.log('\n🧪 Testing Split-Screen Email với Facilities...\n');

    // Sample event with facilities
    const testEvent = {
        eventName: 'SPLIT-SCREEN TEST WITH FACILITIES',
        department: 'Phòng Đào Tạo',
        eventDate: '2026-01-22',
        dayOfWeek: 'Wednesday',
        startTime: '09:00',
        endTime: '17:00',
        location: 'Hội Trường A - Tầng 3',
        notes: 'Vui lòng mang theo laptop và tài liệu.',

        // FACILITIES DATA
        facilitiesChecklist: [
            'Projector & Screen (HD Resolution)',
            'Sound System với 2x Microphone',
            'Bàn ghế cho 50 người',
            'Wifi High-Speed Internet',
            'Whiteboard & Markers',
            'Hệ thống điều hòa'
        ],

        // Required for email service
        contactEmail: 'huynt40@fe.edu.vn',
        registrantEmail: 'huynt40@fe.edu.vn'
    };

    try {
        console.log('📧 Sending test email to:', testEvent.contactEmail);
        console.log('📋 Facilities items:', testEvent.facilitiesChecklist.length);

        await emailService.sendEventNotification(testEvent, 'created');

        console.log('\n✅ Email sent successfully!');
        console.log('📬 Check Outlook inbox for:');
        console.log('   - Subject: Sự kiện mới: SPLIT-SCREEN TEST WITH FACILITIES');
        console.log('   - Should have orange/purple/teal blocks');
        console.log('   - Should have "YÊU CẦU SETUP" section with 6 items');
        console.log('\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testEmailWithFacilities();
