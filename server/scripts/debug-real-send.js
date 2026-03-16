require('dotenv').config();
const { getDecryptedSmtpSettings } = require('../controllers/settingsController');
const nodemailer = require('nodemailer');

// Manual Setup to bypass Service complexity for isolation
async function sendDebugEmail() {
    console.log('📧 Starting Real Email Send Test...');

    // 1. Configure Transporter (Mimic emailService)
    // We try to read from Env for this isolated test to be sure
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    const recipient = 'huynt40@fpt.edu.vn'; // The recipient from the logs

    if (!user || !pass) {
        console.error('❌ Missing EMAIL_USER or EMAIL_PASS in .env');
        return;
    }

    const transporter = nodemailer.createTransport({
        host: 'smtp.office365.com',
        port: 587,
        secure: false,
        auth: { user, pass },
        tls: { ciphers: 'SSLv3', rejectUnauthorized: false }
    });

    // 2. Test 1: Plain Email
    console.log('\n1️⃣ Sending PLAIN email (No attachment)...');
    try {
        await transporter.sendMail({
            from: `"Debug Tester" <${user}>`,
            to: recipient,
            subject: 'Debug: Plain Email Test ' + Date.now(),
            html: '<p>This is a plain email test.</p>'
        });
        console.log('   ✅ Plain email SENT successfully.');
    } catch (err) {
        console.error('   ❌ Plain email FAILED:', err.message);
        console.log('      If this fails, the account is likely throttled globally.');
        return; // Stop if plain fails
    }

    // 3. Test 2: ICS Attachment (Current Logic)
    console.log('\n2️⃣ Sending ICS email (METHOD:REQUEST, No Attendees)...');

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
PRODID:adamgibbons/ics
METHOD:REQUEST
BEGIN:VEVENT
UID:debug-test-${Date.now()}@antigravity.system
SUMMARY:Debug Event
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
            subject: 'Debug: ICS Email Test ' + Date.now(),
            html: '<p>This is an email with ICS attachment.</p>',
            attachments: [{
                filename: 'invite.ics',
                content: icsContent,
                contentType: 'text/calendar; method=REQUEST'
            }]
        });
        console.log('   ✅ ICS email SENT successfully.');
    } catch (err) {
        console.error('   ❌ ICS email FAILED:', err.message);
        console.log('      Hypothesis: METHOD:REQUEST without ATTENDEE might be rejected.');
    }
}

sendDebugEmail();
