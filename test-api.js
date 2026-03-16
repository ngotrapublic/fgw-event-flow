// const fetch = require('node-fetch'); // Native fetch in Node 18+

const API_URL = 'http://localhost:5000/api';

async function testApi() {
    try {
        console.log('Fetching all events...');
        const res = await fetch(`${API_URL}/events`);
        if (!res.ok) throw new Error(`Failed to fetch events: ${res.status} ${res.statusText}`);
        const events = await res.json();
        console.log(`Found ${events.length} events.`);

        if (events.length > 0) {
            const id = events[0].id;
            console.log(`Testing getById for event ID: ${id}`);
            const res2 = await fetch(`${API_URL}/events/${id}`);
            if (!res2.ok) {
                console.error(`Failed to fetch event ${id}: ${res2.status} ${res2.statusText}`);
                const text = await res2.text();
                console.error('Response:', text);
            } else {
                const event = await res2.json();
                console.log('Successfully fetched event:', event.id);
                console.log('Event Name:', event.eventName);
            }
        } else {
            console.log('No events to test getById.');
        }
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testApi();
