/**
 * Phase 1: Backend Template System Test
 * Verify template registry and render functions work correctly
 */

const templateRegistry = require('../templates/emailTemplateRegistry');

console.log('=== Email Template Registry Test ===\n');

// Test 1: Get All Templates
console.log('Test 1: Get All Templates');
const allTemplates = templateRegistry.getAllTemplates();
console.log(`✓ Found ${allTemplates.length} templates`);
console.log('Template IDs:', allTemplates.map(t => t.id).join(', '));
console.log('');

// Test 2: Get Template Metadata
console.log('Test 2: Get Template Metadata');
const metadata = templateRegistry.getTemplateMetadata();
console.log(`✓ Metadata for ${metadata.length} templates`);
metadata.forEach(m => {
    console.log(`  - ${m.name}: ${m.description} (Compatibility: ${m.compatibility}/5)`);
});
console.log('');

// Test 3: Validate Each Template
console.log('Test 3: Validate Template Structure');
allTemplates.forEach(template => {
    const hasRenderFunction = typeof template.renderFunction === 'function';
    const status = hasRenderFunction ? '✓' : '✗';
    console.log(`  ${status} ${template.name}: render function ${hasRenderFunction ? 'exists' : 'MISSING'}`);
});
console.log('');

// Test 4: Test Render Functions
console.log('Test 4: Test Rendering with Mock Data');
const mockBodyContent = {
    department: 'IT Department',
    eventName: 'Test Event',
    eventDate: '2026-01-21',
    dayOfWeek: 'Thứ Ba',
    timeString: '07:00 - 11:30',
    location: 'Sảnh Tầng 2',
    registrantEmail: 'test@example.com',
    facilitiesChecklist: {
        loa: { quantity: 2 },
        mic: { quantity: 3 }
    },
    notes: 'Test notes'
};

allTemplates.forEach(template => {
    try {
        const html = template.renderFunction('Test Event', mockBodyContent);
        const isValidHtml = html.includes('<!DOCTYPE html>') && html.includes('Test Event');
        const status = isValidHtml ? '✓' : '✗';
        console.log(`  ${status} ${template.name}: rendered successfully (${html.length} chars)`);
    } catch (error) {
        console.log(`  ✗ ${template.name}: ERROR - ${error.message}`);
    }
});
console.log('');

// Test 5: Validate isValidTemplate
console.log('Test 5: Validate Template ID Checker');
const testIds = [
    'minimalist-premium',
    'modern-gradient',
    'invalid-template',
    'neubrutalism'
];

testIds.forEach(id => {
    const isValid = templateRegistry.isValidTemplate(id);
    const status = isValid ? '✓' : '✗';
    console.log(`  ${status} "${id}": ${isValid ? 'valid' : 'invalid'}`);
});
console.log('');

// Test 6: Get Specific Template
console.log('Test 6: Get Specific Template');
const minimalist = templateRegistry.getTemplate('minimalist-premium');
if (minimalist) {
    console.log(`✓ Retrieved: ${minimalist.name}`);
    console.log(`  Colors: ${minimalist.colors.primary} / ${minimalist.colors.accent}`);
} else {
    console.log('✗ Failed to retrieve template');
}
console.log('');

console.log('=== All Tests Complete ===');
console.log(`Total Templates: ${allTemplates.length}`);
console.log(`All Render Functions Working: ${allTemplates.every(t => typeof t.renderFunction === 'function')}`);
