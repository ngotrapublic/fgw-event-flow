/**
 * Split-Screen Email Template - Test Suite
 * 
 * Tests:
 * 1. Template renders with all required data
 * 2. Conditional sections work (notes, facilities)
 * 3. Colors match mockup (#14B8A6, #F97316, #A855F7)
 * 4. HTML output is valid
 * 5. Diagonal cuts render correctly
 */

const templateRegistry = require('../templates/emailTemplateRegistry');
const { generateSampleEvent } = require('../utils/sampleData');

// Color constants from mockup
const COLORS = {
    TEAL: '#14B8A6',
    ORANGE: '#F97316',
    PURPLE: '#A855F7'
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
            expect(html).toContain('<!DOCTYPE html>');
        });

        test('should include event name in output', () => {
            const eventName = 'Leadership Summit 2024';
            const html = template.renderFunction(eventName, {
                eventName,
                eventDate: '2026-01-21',
                timeString: '09:00 - 17:00',
                location: 'Grand Hyatt'
            });

            expect(html).toContain(eventName);
        });
    });

    describe('Color Palette', () => {
        test('should use teal color (#14B8A6)', () => {
            const html = template.renderFunction('Test', {
                eventName: 'Test',
                eventDate: '2026-01-21',
                timeString: '09:00',
                location: 'Test'
            });

            expect(html).toContain(COLORS.TEAL);
        });

        test('should use orange color (#F97316)', () => {
            const html = template.renderFunction('Test', {
                eventName: 'Test',
                eventDate: '2026-01-21',
                timeString: '09:00',
                location: 'Test'
            });

            expect(html).toContain(COLORS.ORANGE);
        });

        test('should use purple color (#A855F7)', () => {
            const html = template.renderFunction('Test', {
                eventName: 'Test',
                eventDate: '2026-01-21',
                timeString: '09:00',
                location: 'Test'
            });

            expect(html).toContain(COLORS.PURPLE);
        });
    });

    describe('Diagonal Cuts', () => {
        test('should include clip-path for diagonal header', () => {
            const html = template.renderFunction('Test', {
                eventName: 'Test',
                eventDate: '2026-01-21',
                timeString: '09:00',
                location: 'Test'
            });

            expect(html).toContain('clip-path: polygon');
            expect(html).toContain('calc(100% - 60px)'); // Header diagonal
        });

        test('should include clip-path for info blocks', () => {
            const html = template.renderFunction('Test', {
                eventName: 'Test',
                eventDate: '2026-01-21',
                timeString: '09:00',
                location: 'Test'
            });

            expect(html).toContain('calc(100% - 30px)'); // Info block diagonal
        });

        test('should include setup header diagonal when facilities present', () => {
            const html = template.renderFunction('Test', {
                eventName: 'Test',
                eventDate: '2026-01-21',
                timeString: '09:00',
                location: 'Test',
                facilitiesChecklist: ['Projector', 'Sound System']
            });

            expect(html).toContain('calc(100% - 40px)'); // Setup diagonal
        });
    });

    describe('Content Sections', () => {
        test('should render DATE section', () => {
            const html = template.renderFunction('Test', {
                eventName: 'Test',
                eventDate: '2026-01-21',
                dayOfWeek: 'Monday',
                timeString: '09:00',
                location: 'Test'
            });

            expect(html).toContain('DATE');
            expect(html).toContain('2026-01-21');
            expect(html).toContain('Monday');
        });

        test('should render TIME section', () => {
            const html = template.renderFunction('Test', {
                eventName: 'Test',
                eventDate: '2026-01-21',
                timeString: '09:00 - 17:00',
                location: 'Test'
            });

            expect(html).toContain('TIME');
            expect(html).toContain('09:00 - 17:00');
        });

        test('should render LOCATION section', () => {
            const html = template.renderFunction('Test', {
                eventName: 'Test',
                eventDate: '2026-01-21',
                timeString: '09:00',
                location: 'Grand Hyatt Conference Center'
            });

            expect(html).toContain('LOCATION');
            expect(html).toContain('Grand Hyatt Conference Center');
        });

        test('should render notes when provided', () => {
            const notes = 'Please bring your laptop';
            const html = template.renderFunction('Test', {
                eventName: 'Test',
                eventDate: '2026-01-21',
                timeString: '09:00',
                location: 'Test',
                notes
            });

            expect(html).toContain(notes);
            expect(html).toContain('class="notes"');
        });

        test('should NOT render notes section when empty', () => {
            const html = template.renderFunction('Test', {
                eventName: 'Test',
                eventDate: '2026-01-21',
                timeString: '09:00',
                location: 'Test'
            });

            expect(html).not.toContain('class="notes"');
        });
    });

    describe('Facilities/Setup Section', () => {
        test('should render setup section when facilitiesChecklist provided', () => {
            const html = template.renderFunction('Test', {
                eventName: 'Test',
                eventDate: '2026-01-21',
                timeString: '09:00',
                location: 'Test',
                facilitiesChecklist: ['Projector & Screen', 'Sound System']
            });

            expect(html).toContain('YÊU CẦU SETUP');
            expect(html).toContain('Projector & Screen');
            expect(html).toContain('Sound System');
            expect(html).toContain('class="setup-section"');
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
            expect(html).not.toContain('class="setup-section"');
        });

        test('should render checkmarks for each facility item', () => {
            const html = template.renderFunction('Test', {
                eventName: 'Test',
                eventDate: '2026-01-21',
                timeString: '09:00',
                location: 'Test',
                facilitiesChecklist: ['Item 1', 'Item 2', 'Item 3']
            });

            // Should have 3 checkmark divs
            const checkmarkCount = (html.match(/class="setup-check"/g) || []).length;
            expect(checkmarkCount).toBe(3);
        });

        test('should use teal background for checkmarks', () => {
            const html = template.renderFunction('Test', {
                eventName: 'Test',
                eventDate: '2026-01-21',
                timeString: '09:00',
                location: 'Test',
                facilitiesChecklist: ['Test Item']
            });

            expect(html).toContain('.setup-check');
            expect(html).toContain(`background: ${COLORS.TEAL}`);
        });
    });

    describe('HTML Validity', () => {
        test('should have proper DOCTYPE', () => {
            const html = template.renderFunction('Test', {});
            expect(html.trim()).toMatch(/^<!DOCTYPE html>/i);
        });

        test('should have html lang attribute', () => {
            const html = template.renderFunction('Test', {});
            expect(html).toContain('<html lang="vi">');
        });

        test('should have meta charset', () => {
            const html = template.renderFunction('Test', {});
            expect(html).toContain('<meta charset="UTF-8">');
        });

        test('should have viewport meta tag', () => {
            const html = template.renderFunction('Test', {});
            expect(html).toContain('<meta name="viewport"');
        });

        test('should close all tags properly', () => {
            const html = template.renderFunction('Test', {
                eventName: 'Test',
                eventDate: '2026-01-21',
                timeString: '09:00',
                location: 'Test'
            });

            expect(html).toContain('</html>');
            expect(html).toContain('</body>');
            expect(html).toContain('</head>');
        });
    });

    describe('Responsive Design', () => {
        test('should include mobile media query', () => {
            const html = template.renderFunction('Test', {});
            expect(html).toContain('@media (max-width: 600px)');
        });

        test('should adjust padding for mobile', () => {
            const html = template.renderFunction('Test', {});
            expect(html).toContain('padding-left: 20px !important');
            expect(html).toContain('padding-right: 20px !important');
        });

        test('should adjust font sizes for mobile', () => {
            const html = template.renderFunction('Test', {});
            expect(html).toContain('font-size: 32px !important'); // header-title
            expect(html).toContain('font-size: 24px !important'); // value
        });
    });

    describe('Typography', () => {
        test('should use uppercase for labels', () => {
            const html = template.renderFunction('Test', {});
            expect(html).toContain('text-transform: uppercase');
        });

        test('should use heavy font weight for titles', () => {
            const html = template.renderFunction('Test', {});
            expect(html).toContain('font-weight: 900');
        });

        test('should use letter-spacing for labels', () => {
            const html = template.renderFunction('Test', {});
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

        test('should handle empty strings', () => {
            const html = template.renderFunction('Test', {
                eventName: '',
                eventDate: '',
                timeString: '',
                location: ''
            });

            expect(html).toBeDefined();
            expect(html.length).toBeGreaterThan(0);
        });

        test('should handle special characters in content', () => {
            const html = template.renderFunction('Test & <Special>', {
                eventName: 'Test & <Special>',
                eventDate: '2026-01-21',
                timeString: '09:00',
                location: 'Room <A> & <B>'
            });

            expect(html).toContain('Test & <Special>');
            expect(html).toContain('Room <A> & <B>');
        });

        test('should handle long facility names', () => {
            const longName = 'Professional High-Definition Projector with 4K Resolution and Wireless Connectivity';
            const html = template.renderFunction('Test', {
                eventName: 'Test',
                eventDate: '2026-01-21',
                timeString: '09:00',
                location: 'Test',
                facilitiesChecklist: [longName]
            });

            expect(html).toContain(longName);
        });
    });
});
