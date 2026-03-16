/**
 * Regenerate Single Template Mockup
 * Usage: node scripts/regenerate-single-mockup.js split-screen
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const templateRegistry = require('../templates/emailTemplateRegistry');
const { generateSampleEvent } = require('../utils/sampleData');

const templateId = process.argv[2] || 'split-screen';

async function regenerateMockup() {
    console.log(`\n🎨 Regenerating mockup for: ${templateId}\n`);

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setViewport({ width: 600, height: 1200, deviceScaleFactor: 2 });

    const template = templateRegistry.getTemplate(templateId);
    if (!template) {
        console.error(`❌ Template "${templateId}" not found!`);
        process.exit(1);
    }

    const sampleEvent = generateSampleEvent();
    const bodyContent = {
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
        notes: sampleEvent.description
    };

    const html = template.renderFunction(sampleEvent.title, bodyContent);

    await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 500));

    const outputPath = path.join(__dirname, '../../client/public/assets/email-thumbnails', `${templateId}.png`);
    await page.screenshot({
        path: outputPath,
        clip: { x: 0, y: 0, width: 600, height: 800 }
    });

    await browser.close();

    const stats = fs.statSync(outputPath);
    console.log(`✅ Mockup regenerated: ${templateId}.png (${Math.round(stats.size / 1024)}KB)`);
    console.log(`📁 Location: ${outputPath}\n`);
}

regenerateMockup().catch(console.error);
