/**
 * Sample Event Data Generator for Email Previews
 * Generates realistic sample data for email template testing and preview
 */

const generateSampleEvent = () => {
    const now = new Date();
    const eventDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    return {
        _id: 'preview-sample-event',
        title: 'Leadership Summit 2024',
        description: 'Join us for an exclusive executive leadership summit featuring keynote speakers, interactive workshops, and networking sessions designed to elevate your leadership skills and connect with industry peers.',

        // Date & Time
        date: eventDate,
        time: '09:00 AM',
        endTime: '05:00 PM',

        // Location
        location: 'Grand Hyatt Conference Center',
        locationDetails: 'Main Ballroom, 3rd Floor\nNew York, NY 10017\nVirtual Option Available',

        // Department
        department: {
            _id: 'dept-exec',
            name: 'Executive Team',
            color: '#667eea'
        },

        // Facilities (for email preview)
        facilitiesChecklist: [
            'Projector & Screen',
            'Wireless Microphone (2x)',
            'Whiteboard & Markers',
            'Video Conference System',
            'Refreshments & Snacks'
        ],
        facilitiesSummary: 'Full audio-visual setup with conference facilities',

        // Creator
        creator: {
            _id: 'user-creator',
            name: 'Sarah Johnson',
            email: 'sarah.johnson@company.com',
            role: 'Director of Operations'
        },

        // Attendance
        attendees: [],
        maxAttendees: 200,
        currentAttendees: 87,
        registrationDeadline: new Date(eventDate.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days before event

        // Contact
        contactEmail: 'events@company.com',
        contactPhone: '+1 (555) 123-4567',

        // Additional
        category: 'Professional Development',
        tags: ['Leadership', 'Networking', 'Executive'],
        status: 'upcoming',
        isPublic: true,

        createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), // Created 2 weeks ago
        updatedAt: now
    };
};

/**
 * Generate sample reminder data
 */
const generateSampleReminder = (type = '1day') => {
    const event = generateSampleEvent();

    return {
        event,
        reminderType: type,
        timeUntilEvent: type === '1day' ? '1 day' : '1 hour',
        registrationLink: 'http://localhost:5173/events/' + event._id
    };
};

module.exports = {
    generateSampleEvent,
    generateSampleReminder
};
