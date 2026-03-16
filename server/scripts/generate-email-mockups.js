/**
 * Email Template Mockup Generator
 * 
 * Generates mockup images from actual email template renders
 * Ensures 100% accuracy between gallery mockups and real emails
 * 
 * Usage: node scripts/generate-email-mockups.js
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const templateRegistry = require('../templates/emailTemplateRegistry');
const { generateSampleEvent } = require('../utils/sampleData');

async function generateMockups() {
    console.log('\n🎨 ========================================');
    console.log('   EMAIL MOCKUP GENERATOR');
    console.log('========================================\n');

    let browser;

    try {
        // Launch browser
        console.log('🚀 Launching headless browser...');
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        console.log('✅ Browser launched\n');

        const page = await browser.newPage();

        // Set viewport to standard email width (600px)
        await page.setViewport({
            width: 600,
            height: 1200,
            deviceScaleFactor: 2 // Higher quality screenshots
        });

        // Get all templates
        const templates = templateRegistry.getAllTemplates();
        console.log(`📋 Found ${templates.length} templates to process\n`);

        // Generate sample event data
        const sampleEvent = generateSampleEvent();

        // Prepare body content (matching real email format)
        const bodyContent = {
            department: sampleEvent.department.name,
            eventName: sampleEvent.title,
            eventDate: sampleEvent.date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            dayOfWeek: sampleEvent.date.toLocaleDateString('en-US', { weekday: 'long' }),
            timeString: `${sampleEvent.time} - ${sampleEvent.endTime}`,
            location: sampleEvent.location,
            registrantEmail: sampleEvent.contactEmail,
            notes: sampleEvent.description,
            facilitiesChecklist: sampleEvent.facilitiesChecklist || [],
            facilitiesSummary: sampleEvent.facilitiesSummary || ''
        };

        // Ensure output directory exists
        const outputDir = path.join(__dirname, '../../client/public/assets/email-thumbnails');
        if (!fs.existsSync(outputDir)) {
            console.log(`📁 Creating output directory: ${outputDir}`);
            fs.mkdirSync(outputDir, { recursive: true });
        }
        console.log(`📁 Output directory: ${outputDir}\n`);

        // Generate mockup for each template
        let successCount = 0;
        let failCount = 0;

        for (const template of templates) {
            try {
                console.log(`📸 Processing: ${template.name} (${template.id})`);

                // Render HTML using SAME function as real emails
                const html = template.renderFunction(sampleEvent.title, bodyContent);

                // Load HTML in browser
                await page.setContent(html, {
                    waitUntil: 'load', // Just wait for DOM load, no network waiting
                    timeout: 30000
                });

                // Give time for any fonts/styles to load
                await new Promise(resolve => setTimeout(resolve, 500));

                // Take screenshot (800px height to capture top portion)
                const outputPath = path.join(outputDir, `${template.id}.png`);
                await page.screenshot({
                    path: outputPath,
                    clip: {
                        x: 0,
                        y: 0,
                        width: 600,
                        height: 800
                    },
                    omitBackground: false
                });

                // Verify file was created
                if (fs.existsSync(outputPath)) {
                    const stats = fs.statSync(outputPath);
                    console.log(`   ✅ Saved: ${template.id}.png (${Math.round(stats.size / 1024)}KB)`);
                    successCount++;
                } else {
                    console.log(`   ❌ Failed to save: ${template.id}.png`);
                    failCount++;
                }

            } catch (error) {
                console.log(`   ❌ Error: ${error.message}`);
                failCount++;
            }

            console.log(''); // Blank line between templates
        }

        // Summary
        console.log('========================================');
        console.log(`✅ Success: ${successCount}/${templates.length}`);
        if (failCount > 0) {
            console.log(`❌ Failed: ${failCount}/${templates.length}`);
        }
        console.log('========================================\n');
        console.log(`📁 Mockups saved to: ${outputDir}\n`);

        if (successCount === templates.length) {
            console.log('🎉 All mockups generated successfully!\n');
        } else {
            console.log('⚠️  Some mockups failed to generate. Please check errors above.\n');
        }

    } catch (error) {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    } finally {
        if (browser) {
            await browser.close();
            console.log('🔒 Browser closed\n');
        }
    }
}

// Run if called directly
if (require.main === module) {
    generateMockups()
        .then(() => {
            console.log('✅ Script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Script failed:', error);
            process.exit(1);
        });
}

module.exports = { generateMockups };
