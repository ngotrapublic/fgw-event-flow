/**
 * Split-Screen Email Template - Test Suite (Corporate Vibrant V3 Outlook-Compatible Table Layout)
 *
 * Tests:
 * 1. Template renders with all required data
 * 2. Conditional facilities checklist & two-column layout work properly
 * 3. Colors match V3 palette (#0D9488, #F97316, #8B5CF6, #14B8A6, #EA580C)
 * 4. XHTML / Outlook MSO conditional & table layout are valid
 * 5. Edge cases (missing bodyContent, empty strings, arrays, long labels)
 */

const templateRegistry = require('../templates/emailTemplateRegistry');
const { generateSampleEvent } = require('../utils/sampleData');

const COLORS = {
    HEADER_TEAL: '#0D9488',
    DATE_ORANGE: '#F97316',
    TIME_PURPLE: '#8B5CF6',
    LOCATION_TEAL: '#14B8A6',
    SETUP_ORANGE: '#EA580C',
    CHECKMARK_MINT: '#86efac'
};

describe('Split-Screen Email Template', () => {
    let template;
    let sampleEvent;

    beforeAll(() => {
        template = templateRegistry.getTemplate('split-screen');
        sampleEvent = generateSampleEvent();
    });

    describe('Basic Rendering', () => {
        test('should exist in template registry', () => {
            expect(template).toBeDefined();
            expect(template.id).toBe('split-screen');
            expect(template.name).toBe('Split-Screen');
        });

        test('should have render function', () => {
            expect(typeof template.renderFunction).toBe('function');
        });

        test('should render with minimal data', () => {
            const html = template.renderFunction('Test Event', {
                eventName: 'Test Event',
                eventDate: '2026-01-21',
                timeString: '09:00 - 17:00',
                location: 'Test Location'
            });

            expect(html).toBeDefined();
            expect(html.length).toBeGreaterThan(0);
            expect(html).toContain('<!DOCTYPE html PUBLIC');
            expect(html).toContain('University of GreenWich');
        });

        test('should render sample event from registry data without errors', () => {
            const html = template.renderFunction(sampleEvent.title, sampleEvent);
            expect(html).toContain(sampleEvent.title);
        });

        test('should include event name and department in output', () => {
            const eventName = 'Leadership Summit 2024';
            const html = template.renderFunction(eventName, {
                eventName,
                eventDate: '2026-01-21',
                timeString: '09:00 - 17:00',
                location: 'Grand Hyatt',
                department: 'PHÒNG CÔNG TÁC SINH VIÊN'
            });

            expect(html).toContain(eventName);
            expect(html).toContain('PHÒNG CÔNG TÁC SINH VIÊN');
        });
    });

    describe('Color Palette', () => {
        test('should use header teal (#0D9488) and location teal (#14B8A6)', () => {
            const html = template.renderFunction('Test', {
                eventName: 'Test',
                eventDate: '2026-01-21',
                timeString: '09:00',
                location: 'Test'
            });

            expect(html).toContain(COLORS.HEADER_TEAL);
            expect(html).toContain(COLORS.LOCATION_TEAL);
        });

        test('should use orange (#F97316) for DATE block', () => {
            const html = template.renderFunction('Test', {
                eventName: 'Test',
                eventDate: '2026-01-21',
                timeString: '09:00',
                location: 'Test'
            });

            expect(html).toContain(COLORS.DATE_ORANGE);
        });

        test('should use purple (#8B5CF6) for TIME block', () => {
            const html = template.renderFunction('Test', {
                eventName: 'Test',
                eventDate: '2026-01-21',
                timeString: '09:00',
                location: 'Test'
            });

            expect(html).toContain(COLORS.TIME_PURPLE);
        });
    });

    describe('Outlook Table Layout', () => {
        test('should include MSO conditional XML settings for Outlook compatibility', () => {
            const html = template.renderFunction('Test', {
                eventName: 'Test',
                eventDate: '2026-01-21',
                timeString: '09:00',
                location: 'Test'
            });

            expect(html).toContain('<!--[if gte mso 9]>');
            expect(html).toContain('<o:OfficeDocumentSettings>');
            expect(html).toContain('<table border="0" cellpadding="0" cellspacing="0" width="600"');
        });
    });

    describe('Content Sections', () => {
        test('should render DATE section with formatted day and month/year', () => {
            const html = template.renderFunction('Test', {
                eventName: 'Test',
                eventDate: '2026-01-21',
                timeString: '09:00',
                location: 'Test'
            });

            expect(html).toContain('DATE');
            expect(html).toContain('21');
            expect(html).toContain('2026');
        });

        test('should render TIME section including optional timeEnd', () => {
            const html = template.renderFunction('Test', {
                eventName: 'Test',
                eventDate: '2026-01-21',
                timeString: '09:00',
                timeEnd: '17:00',
                location: 'Test'
            });

            expect(html).toContain('TIME');
            expect(html).toContain('09:00');
            expect(html).toContain('– 17:00');
        });

        test('should render LOCATION section for both string and array locations', () => {
            const htmlString = template.renderFunction('Test', {
                eventName: 'Test',
                eventDate: '2026-01-21',
                timeString: '09:00',
                location: 'Grand Hyatt Conference Center'
            });
            expect(htmlString).toContain('LOCATION');
            expect(htmlString).toContain('Grand Hyatt Conference Center');

            const htmlArray = template.renderFunction('Test', {
                eventName: 'Test',
                eventDate: '2026-01-21',
                timeString: '09:00',
                location: ['Hall A', 'Lobby Floor 1']
            });
            expect(htmlArray).toContain('Hall A, Lobby Floor 1');
        });
    });

    describe('Facilities/Setup Section', () => {
        test('should render two-column setup section when facilitiesChecklist provided', () => {
            const html = template.renderFunction('Test', {
                eventName: 'Test',
                eventDate: '2026-01-21',
                timeString: '09:00',
                location: 'Test',
                facilitiesChecklist: ['Projector & Screen', 'Sound System']
            });

            expect(html).toContain('YÊU CẦU SETUP');
            expect(html).toContain(COLORS.SETUP_ORANGE);
            expect(html).toContain('Projector & Screen');
            expect(html).toContain('Sound System');
            expect(html).toContain('width="50%"');
        });

        test('should NOT render setup section when facilitiesChecklist empty', () => {
            const html = template.renderFunction('Test', {
                eventName: 'Test',
                eventDate: '2026-01-21',
                timeString: '09:00',
                location: 'Test',
                facilitiesChecklist: []
            });

            expect(html).not.toContain('YÊU CẦU SETUP');
            expect(html).not.toContain(`bgcolor="${COLORS.SETUP_ORANGE}"`);
        });

        test('should render mint checkmarks for each facility item across columns', () => {
            const html = template.renderFunction('Test', {
                eventName: 'Test',
                eventDate: '2026-01-21',
                timeString: '09:00',
                location: 'Test',
                facilitiesChecklist: ['Item 1', 'Item 2', 'Item 3']
            });

            const checkmarkCount = (html.match(/<span style="color: #86efac;">✓<\/span>/g) || []).length;
            expect(checkmarkCount).toBe(3);
            expect(html).toContain(COLORS.CHECKMARK_MINT);
        });
    });

    describe('XHTML Validity', () => {
        test('should have XHTML 1.0 Transitional DOCTYPE and namespace', () => {
            const html = template.renderFunction('Test', {});
            expect(html.trim()).toMatch(/^<!DOCTYPE html PUBLIC "-\/\/W3C\/\/DTD XHTML 1\.0 Transitional\/\/EN"/i);
            expect(html).toContain('<html xmlns="http://www.w3.org/1999/xhtml">');
        });

        test('should include UTF-8 Content-Type and viewport meta tags', () => {
            const html = template.renderFunction('Test', {});
            expect(html).toContain('charset=UTF-8');
            expect(html).toContain('<meta name="viewport"');
            expect(html).toContain('x-apple-disable-message-reformatting');
        });

        test('should close head, body, and html tags properly', () => {
            const html = template.renderFunction('Test', {
                eventName: 'Test',
                eventDate: '2026-01-21',
                timeString: '09:00',
                location: 'Test'
            });

            expect(html).toContain('</head>');
            expect(html).toContain('</body>');
            expect(html).toContain('</html>');
        });
    });

    describe('Typography', () => {
        test('should use uppercase, heavy font weights, and tracked labels', () => {
            const html = template.renderFunction('Test', {
                facilitiesChecklist: ['Projector']
            });
            expect(html).toContain('text-transform: uppercase');
            expect(html).toContain('font-weight: 900');
            expect(html).toContain('letter-spacing: 2px');
            expect(html).toContain('letter-spacing: 3px');
        });
    });

    describe('Edge Cases', () => {
        test('should handle missing bodyContent gracefully', () => {
            const html = template.renderFunction('Test Event');
            expect(html).toBeDefined();
            expect(html).toContain('Test Event');
        });

        test('should handle empty strings and non-ISO fallback dates', () => {
            const html = template.renderFunction('Test', {
                eventName: '',
                eventDate: 'Thứ Sáu, 30/01/2026',
                timeString: '',
                location: ''
            });

            expect(html).toBeDefined();
            expect(html.length).toBeGreaterThan(0);
        });

        test('should preserve text content and support long facility names', () => {
            const longName = 'Professional High-Definition Projector with 4K Resolution and Wireless Connectivity';
            const html = template.renderFunction('Test & <Special>', {
                eventName: 'Test & <Special>',
                eventDate: '2026-01-21',
                timeString: '09:00',
                location: 'Room <A> & <B>',
                facilitiesChecklist: [longName]
            });

            expect(html).toContain('Test & <Special>');
            expect(html).toContain('Room <A> & <B>');
            expect(html).toContain(longName);
        });
    });
});
