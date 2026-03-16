// server/scripts/test-multi-day.js
require('dotenv').config({ path: '.env.development' });
const { createEvent } = require('../controllers/eventController');

// Mock request and response objects to simulate an API call
const req = {
    user: { uid: 'test-admin', email: 'admin@fpt.edu.vn', role: 'admin' },
    ip: '127.0.0.1',
    body: {
        eventName: 'TEST SỰ KIỆN 3 NGÀY (SCRIPT)',
        eventDate: '2026-03-20',
        eventEndDate: '2026-03-22', // Specifies a 3-day series
        startTime: '08:00',
        endTime: '17:00',
        department: 'Event Team',
        location: ['Hall A'],
        notes: 'Testing multi-day API batch logic',
        registrantEmail: 'test@antigravity.system',
        facilitiesChecklist: { 'projector-id': { checked: true, quantity: 1, label: 'Projector' } }
    }
};

const res = {
    status: function (code) {
        this.statusCode = code;
        return this;
    },
    json: function (data) {
        console.log(`\n✅ Response Status: ${this.statusCode}`);
        console.log('✅ Response Data:', JSON.stringify(data, null, 2));
        process.exit(0);
    }
};

const next = (error) => {
    console.error('\n❌ Error occurred:', error);
    process.exit(1);
};

console.log('🚀 Simulating API Call: createEvent with Multi-day payload...');
createEvent(req, res, next);
