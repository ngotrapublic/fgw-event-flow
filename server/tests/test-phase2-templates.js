/**
 * Phase 2: Email Template System - Comprehensive Tests
 * Tests API endpoints, template assignments, and system integration
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000';

console.log('=== Phase 2: Email Template System Tests ===\n');

// Test 1: GET /api/settings/email-templates
async function testGetEmailTemplates() {
    console.log('Test 1: GET /api/settings/email-templates');
    try {
        const response = await fetch(`${BASE_URL}/api/settings/email-templates`);
        const data = await response.json();

        if (response.ok && Array.isArray(data)) {
            console.log(`✓ API returned ${data.length} templates`);
            console.log('  Templates:', data.map(t => t.id).join(', '));

            // Validate structure
            const hasRequiredFields = data.every(t =>
                t.id && t.name && t.description && t.colors && t.categories
            );

            if (hasRequiredFields) {
                console.log('✓ All templates have required fields');
            } else {
                console.log('✗ Some templates missing required fields');
            }

            return { success: true, data };
        } else {
            console.log('✗ API request failed or returned invalid data');
            return { success: false };
        }
    } catch (error) {
        console.log(`✗ Error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// Test 2: POST /api/settings/templates/:type/assign
async function testAssignTemplate() {
    console.log('\nTest 2: POST /api/settings/templates/:type/assign');

    const testCases = [
        { type: 'created', templateId: 'modern-gradient' },
        { type: 'updated', templateId: 'minimalist-premium' },
        { type: 'reminder_1day', templateId: 'neubrutalism' }
    ];

    let allPassed = true;

    for (const testCase of testCases) {
        try {
            const response = await fetch(
                `${BASE_URL}/api/settings/templates/${testCase.type}/assign`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ templateId: testCase.templateId })
                }
            );

            const result = await response.json();

            if (response.ok && result.success) {
                console.log(`  ✓ Assigned ${testCase.templateId} to ${testCase.type}`);
            } else {
                console.log(`  ✗ Failed to assign ${testCase.templateId} to ${testCase.type}`);
                allPassed = false;
            }
        } catch (error) {
            console.log(`  ✗ Error assigning ${testCase.type}: ${error.message}`);
            allPassed = false;
        }
    }

    return { success: allPassed };
}

// Test 3: Verify settings persistence
async function testSettingsPersistence() {
    console.log('\nTest 3: Settings Persistence');
    try {
        // Assign a template
        await fetch(`${BASE_URL}/api/settings/templates/created/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ templateId: 'japanese-zen' })
        });

        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 500));

        // Fetch settings to verify
        const response = await fetch(`${BASE_URL}/api/settings`);
        const settings = await response.json();

        const createdTemplate = settings.templates?.find(t => t.id === 'created');

        if (createdTemplate && createdTemplate.emailTemplate === 'japanese-zen') {
            console.log('✓ Template assignment persisted correctly');
            console.log(`  Current assignment: ${createdTemplate.emailTemplate}`);
            return { success: true };
        } else {
            console.log('✗ Template assignment not persisted');
            return { success: false };
        }
    } catch (error) {
        console.log(`✗ Error: ${error.message}`);
        return { success: false };
    }
}

// Test 4: Invalid template ID validation
async function testInvalidTemplate() {
    console.log('\nTest 4: Invalid Template ID Validation');
    try {
        const response = await fetch(
            `${BASE_URL}/api/settings/templates/created/assign`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ templateId: 'non-existent-template' })
            }
        );

        if (response.status === 400) {
            console.log('✓ API correctly rejects invalid template ID (400 status)');
            return { success: true };
        } else {
            console.log('✗ API should return 400 for invalid template');
            return { success: false };
        }
    } catch (error) {
        console.log(`✗ Error: ${error.message}`);
        return { success: false };
    }
}

// Test 5: Template Registry Integration
async function testTemplateRegistry() {
    console.log('\nTest 5: Template Registry Integration');
    try {
        const templateRegistry = require('../templates/emailTemplateRegistry');

        // Test getTemplate
        const template = templateRegistry.getTemplate('minimalist-premium');
        if (template && template.renderFunction) {
            console.log('✓ Template registry getTemplate() works');
        } else {
            console.log('✗ Template registry getTemplate() failed');
            return { success: false };
        }

        // Test isValidTemplate
        const isValid = templateRegistry.isValidTemplate('modern-gradient');
        const isInvalid = !templateRegistry.isValidTemplate('fake-template');

        if (isValid && isInvalid) {
            console.log('✓ Template validation works correctly');
        } else {
            console.log('✗ Template validation failed');
            return { success: false };
        }

        return { success: true };
    } catch (error) {
        console.log(`✗ Error: ${error.message}`);
        return { success: false };
    }
}

// Run all tests
async function runAllTests() {
    console.log('Starting comprehensive Phase 2 tests...\n');
    console.log('='.repeat(50) + '\n');

    const results = {
        emailTemplatesAPI: await testGetEmailTemplates(),
        assignTemplate: await testAssignTemplate(),
        persistence: await testSettingsPersistence(),
        invalidTemplate: await testInvalidTemplate(),
        templateRegistry: await testTemplateRegistry()
    };

    console.log('\n' + '='.repeat(50));
    console.log('\n=== Test Summary ===\n');

    const allTests = Object.entries(results);
    const passedTests = allTests.filter(([_, result]) => result.success).length;
    const totalTests = allTests.length;

    allTests.forEach(([name, result]) => {
        const status = result.success ? '✓ PASS' : '✗ FAIL';
        console.log(`${status} - ${name}`);
    });

    console.log(`\nTotal: ${passedTests}/${totalTests} tests passed`);

    if (passedTests === totalTests) {
        console.log('\n🎉 All Phase 2 tests PASSED!');
    } else {
        console.log('\n⚠️  Some tests failed. Please review.');
    }

    process.exit(passedTests === totalTests ? 0 : 1);
}

// Execute tests
runAllTests().catch(error => {
    console.error('Fatal error running tests:', error);
    process.exit(1);
});
