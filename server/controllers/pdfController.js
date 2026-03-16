const puppeteer = require('puppeteer');

exports.generatePdf = async (req, res) => {
    const { url, html, filename = 'document.pdf' } = req.body;

    // Support both URL-based and HTML-based generation
    if (!url && !html) {
        return res.status(400).json({ error: 'Either URL or HTML is required' });
    }

    let browser;
    try {
        console.log(`[PDF] Launching browser...`);
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        });
        const page = await browser.newPage();

        console.log(`[PDF] Setting viewport to A4 dimensions...`);
        await page.setViewport({ width: 794, height: 1123 });

        if (html) {
            // HTML-based generation (NEW)
            console.log('[PDF] Setting HTML content...');
            await page.setContent(html, {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });
        } else {
            // URL-based generation (EXISTING)
            console.log(`[PDF] Navigating to: ${url}`);
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        }

        console.log(`[PDF] Injecting print styles...`);
        await page.addStyleTag({
            content: `
                @page { margin: 0; size: A4 portrait; }
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .print-break-before { page-break-before: always !important; }
                .print\\:hidden, header:not(.print-visible) { display: none !important; }
            `
        });

        console.log(`[PDF] Generating PDF...`);
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            preferCSSPageSize: false,
            margin: { top: 0, right: 0, bottom: 0, left: 0 }
        });

        console.log(`[PDF] Success! Generated ${pdfBuffer.length} bytes`);

        // Sanitize filename
        const safeFilename = (filename || 'document.pdf')
            .replace(/[^a-zA-Z0-9.-]/g, '_')
            .replace(/_+/g, '_');

        console.log(`[PDF] Sending response with size: ${pdfBuffer.length}`);

        res.status(200);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${safeFilename}"`,
            'Content-Length': pdfBuffer.length
        });

        res.end(pdfBuffer);

    } catch (error) {
        console.error('[PDF] Generation Error:', error);
        res.status(500).json({
            error: 'Failed to generate PDF',
            details: error.message
        });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};
