/**
 * Outlook Desktop Diagnostic Test
 * Generate raw HTML to inspect for Outlook compatibility issues
 */

const templateRegistry = require('./templates/emailTemplateRegistry');

const template = templateRegistry.getTemplate('split-screen');

const testData = {
    eventName: 'OUTLOOK DESKTOP TEST',
    department: 'Phòng Đào Tạo',
    eventDate: '2026-01-27',
    dayOfWeek: 'Monday',
    timeString: '09:00 - 17:00',
    location: 'Conference Room A',
    facilitiesChecklist: [
        'Item 1: Projector',
        'Item 2: Sound System',
        'Item 3: Microphone',
        'Item 4: Whiteboard',
        'Item 5: Chairs'
    ],
    notes: 'This is a test email for Outlook Desktop 365 compatibility.'
};

console.log('\n🔍 OUTLOOK DESKTOP DIAGNOSTIC\n');
console.log('Generating HTML with facilities data...\n');

const html = template.renderFunction('Test', testData);

// Save to file for inspection
const fs = require('fs');
const outputPath = './outlook-debug.html';
fs.writeFileSync(outputPath, html, 'utf8');

console.log('✅ HTML generated successfully!');
console.log(`📄 Saved to: ${outputPath}`);
console.log('\n📊 HTML Stats:');
console.log(`   - Total size: ${html.length} bytes`);
console.log(`   - Contains VML: ${html.includes('<v:rect') ? 'YES ⚠️' : 'NO ✅'}`);
console.log(`   - Contains calc(): ${html.includes('calc(') ? 'YES ⚠️' : 'NO ✅'}`);
console.log(`   - Contains table margins: ${html.includes('margin:') ? 'YES ⚠️' : 'NO ✅'}`);
console.log(`   - Facility items count: ${(html.match(/Item \d:/g) || []).length}`);
console.log('\n📋 Facility Section Check:');
const facilitySection = html.substring(
    html.indexOf('YÊU CẦU SETUP'),
    html.indexOf('YÊU CẦU SETUP') + 2000
);
console.log(facilitySection.substring(0, 500));

console.log('\n💡 Next Steps:');
console.log('1. Open outlook-debug.html in browser to preview');
console.log('2. Send test email via UI and check Outlook Desktop');
console.log('3. Compare HTML structure\n');
