require('dotenv').config();
const { getDecryptedSmtpSettings } = require('../controllers/settingsController');
const nodemailer = require('nodemailer');

async function sendDebugEmail() {
    console.log('📧 Testing Fix with METHOD:PUBLISH...');

    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    const recipient = 'huynt40@fpt.edu.vn';

    const transporter = nodemailer.createTransport({
        host: 'smtp.office365.com',
        port: 587,
        secure: false,
        auth: { user, pass },
        tls: { ciphers: 'SSLv3', rejectUnauthorized: false }
    });

    // ICS content with PUBLISH
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
PRODID:adamgibbons/ics
METHOD:PUBLISH
BEGIN:VEVENT
UID:debug-test-publish-${Date.now()}@antigravity.system
SUMMARY:Debug Event (PUBLISH)
DTSTART:20251225T100000
DTEND:20251225T110000
DESCRIPTION:Debug Description
ORGANIZER;CN="EventFlow System":MAILTO:no-reply@eventflow.com
END:VEVENT
END:VCALENDAR`;

    try {
        await transporter.sendMail({
            from: `"Debug Tester" <${user}>`,
            to: recipient,
            subject: 'Debug: ICS Email Test (PUBLISH) ' + Date.now(),
            html: '<p>This is test with METHOD:PUBLISH. Should work.</p>',
            attachments: [{
                filename: 'invite.ics',
                content: icsContent,
                contentType: 'text/calendar; method=PUBLISH'
            }]
        });
        console.log('   ✅ ICS email (PUBLISH) SENT successfully.');
    } catch (err) {
        console.error('   ❌ ICS email FAILED:', err.message);
    }
}

sendDebugEmail();
