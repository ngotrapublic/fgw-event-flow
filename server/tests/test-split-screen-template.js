/**
 * Split-Screen Gradient Template - Test Suite
 * Tests for Option C gradient design with VML fallbacks
 */

const templateRegistry = require('../templates/emailTemplateRegistry');
const { generateSampleEvent } = require('../utils/sampleData');

// Color constants
const COLORS = {
    TEAL: '#14B8A6',
    CYAN: '#06B6D4',
    ORANGE: '#F97316',
    RED: '#EF4444',
    PURPLE: '#A855F7',
    PINK: '#EC4899',
    GREEN: '#10B981'
};

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log(`✅ ${name}`);
    } catch (error) {
        failed++;
        failures.push({ name, error: error.message });
        console.log(`❌ ${name}`);
        console.log(`   Error: ${error.message}`);
    }
}

function expect(value) {
    return {
        toBeDefined: () => {
            if (value === undefined) throw new Error('Expected value to be defined');
        },
        toBe: (expected) => {
            if (value !== expected) throw new Error(`Expected ${value} to be ${expected}`);
        },
        toContain: (substring) => {
            if (!value || !value.includes(substring)) {
                throw new Error(`Expected to contain "${substring}"`);
            }
        },
        not: {
            toContain: (substring) => {
                if (value && value.includes(substring)) {
                    throw new Error(`Expected NOT to contain "${substring}"`);
                }
            }
        },
        toBeGreaterThan: (num) => {
            if (value <= num) throw new Error(`Expected ${value} to be > ${num}`);
        }
    };
}

console.log('\n🧪 ========================================');
console.log('   SPLIT-SCREEN GRADIENT TEMPLATE TESTS');
console.log('========================================\n');

// Get template
const template = templateRegistry.getTemplate('split-screen');

// Test 1: Basic Rendering
console.log('📋 Basic Rendering Tests:');
test('Template exists in registry', () => {
    expect(template).toBeDefined();
    expect(template.id).toBe('split-screen');
});

test('Has render function', () => {
    expect(typeof template.renderFunction).toBe('function');
});

test('Renders with minimal data', () => {
    const html = template.renderFunction('Test Event', {
        eventName: 'Test Event',
        eventDate: '2026-01-21',
        timeString: '09:00',
        location: 'Test'
    });
    expect(html).toBeDefined();
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain('<!DOCTYPE html>');
});

console.log('\n🎨 Gradient Tests:');
test('Uses CSS gradients for modern clients', () => {
    const html = template.renderFunction('Test', {});
    expect(html).toContain('linear-gradient');
    expect(html).toContain('135deg');
});

test('Has header gradient (teal to cyan)', () => {
    const html = template.renderFunction('Test', {});
    expect(html).toContain(COLORS.TEAL);
    expect(html).toContain(COLORS.CYAN);
});

test('Has date gradient (orange to red)', () => {
    const html = template.renderFunction('Test', {});
    expect(html).toContain(COLORS.ORANGE);
    expect(html).toContain(COLORS.RED);
});

test('Has time gradient (purple to pink)', () => {
    const html = template.renderFunction('Test', {});
    expect(html).toContain(COLORS.PURPLE);
    expect(html).toContain(COLORS.PINK);
});

console.log('\n📧 Outlook VML Fallbacks:');
test('Includes VML conditional comments', () => {
    const html = template.renderFunction('Test', {});
    expect(html).toContain('<!--[if mso]>');
    expect(html).toContain('<![endif]-->');
});

test('Has VML rect elements', () => {
    const html = template.renderFunction('Test', {});
    expect(html).toContain('<v:rect');
    expect(html).toContain('xmlns:v="urn:schemas-microsoft-com:vml"');
});

test('VML has solid fillcolors', () => {
    const html = template.renderFunction('Test', {});
    expect(html).toContain('fillcolor="#14B8A6"'); // Teal
    expect(html).toContain('fillcolor="#F97316"'); // Orange
    expect(html).toContain('fillcolor="#A855F7"'); // Purple
});

test('VML has textbox for content', () => {
    const html = template.renderFunction('Test', {});
    expect(html).toContain('<v:textbox');
    expect(html).toContain('</v:textbox>');
});

console.log('\n📝 Content Sections:');
test('Renders DATE section', () => {
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

test('Renders TIME section', () => {
    const html = template.renderFunction('Test', {
        eventName: 'Test',
        eventDate: '2026-01-21',
        timeString: '09:00 - 17:00',
        location: 'Test'
    });
    expect(html).toContain('TIME');
    expect(html).toContain('09:00 - 17:00');
});

test('Renders LOCATION section', () => {
    const html = template.renderFunction('Test', {
        eventName: 'Test',
        eventDate: '2026-01-21',
        timeString: '09:00',
        location: 'Grand Hyatt'
    });
    expect(html).toContain('LOCATION');
    expect(html).toContain('Grand Hyatt');
});

console.log('\n🔧 Facilities Section:');
test('Renders setup section when facilities provided', () => {
    const html = template.renderFunction('Test', {
        eventName: 'Test',
        eventDate: '2026-01-21',
        timeString: '09:00',
        location: 'Test',
        facilitiesChecklist: ['Projector', 'Sound System']
    });
    expect(html).toContain('YÊU CẦU SETUP');
    expect(html).toContain('Projector');
    expect(html).toContain('Sound System');
});

test('Facilities use table-based design for Outlook compatibility', () => {
    const html = template.renderFunction('Test', {
        eventName: 'Test',
        eventDate: '2026-01-21',
        timeString: '09:00',
        location: 'Test',
        facilitiesChecklist: ['Test Item']
    });
    expect(html).toContain('<table');
    expect(html).toContain('cellpadding');
    expect(html).toContain('background:#FFFFFF');
});

test('Facilities have checkmarks', () => {
    const html = template.renderFunction('Test', {
        eventName: 'Test',
        eventDate: '2026-01-21',
        timeString: '09:00',
        location: 'Test',
        facilitiesChecklist: ['Test']
    });
    expect(html).toContain('✓');
    expect(html).toContain('facility-check');
});

console.log('\n🎯 Typography & Style:');
test('Uses uppercase text-transform', () => {
    const html = template.renderFunction('Test', {});
    expect(html).toContain('text-transform:uppercase');
    expect(html).toContain('text-transform: uppercase');
});

test('Uses heavy font weights', () => {
    const html = template.renderFunction('Test', {});
    expect(html).toContain('font-weight:900');
    expect(html).toContain('font-weight: 900');
});

test('Has dark background theme', () => {
    const html = template.renderFunction('Test', {});
    expect(html).toContain('background:#1F2937');
});

console.log('\n📱 Responsive Design:');
test('Includes mobile media query', () => {
    const html = template.renderFunction('Test', {});
    expect(html).toContain('@media (max-width: 600px)');
});

test('Adjusts font sizes for mobile', () => {
    const html = template.renderFunction('Test', {});
    expect(html).toContain('font-size: 36px !important');
    expect(html).toContain('font-size: 24px !important');
});

// Summary
console.log('\n========================================');
console.log(`✅ PASSED: ${passed}/${passed + failed}`);
if (failed > 0) {
    console.log(`❌ FAILED: ${failed}/${passed + failed}`);
    console.log('\nFailed Tests:');
    failures.forEach(f => {
        console.log(`  - ${f.name}: ${f.error}`);
    });
}
console.log('========================================\n');

if (failed === 0) {
    console.log('🎉 All tests passed! Gradient template working correctly.\n');
} else {
    console.log('⚠️  Some tests failed. Please review and fix.\n');
    process.exit(1);
}
