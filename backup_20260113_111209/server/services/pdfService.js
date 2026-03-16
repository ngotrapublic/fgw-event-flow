import puppeteer from 'puppeteer';

/**
 * Generate PDF from HTML string using Puppeteer
 * @param {string} html - Full HTML document to convert
 * @param {object} options - PDF generation options
 * @returns {Promise<Buffer>} PDF buffer
 */
export const generatePDF = async (html, options = {}) => {
    let browser;

    try {
        // Launch headless browser
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

        // Set viewport to A4 dimensions
        await page.setViewport({
            width: 794,  // A4 width in pixels at 96 DPI
            height: 1123 // A4 height in pixels at 96 DPI
        });

        // Set content with wait for network
        await page.setContent(html, {
            waitUntil: ['networkidle0', 'domcontentloaded'],
            timeout: 30000
        });

        // Wait a bit for fonts/images to load
        await page.waitForTimeout(500);

        // Generate PDF with precise settings
        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            preferCSSPageSize: false,
            margin: {
                top: '0mm',
                right: '0mm',
                bottom: '0mm',
                left: '0mm'
            },
            ...options
        });

        console.log('✓ PDF generated successfully');
        return pdf;

    } catch (error) {
        console.error('PDF generation error:', error);
        throw new Error(`Failed to generate PDF: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};

/**
 * Extract inline styles from HTML elements for PDF rendering
 * @param {string} html - HTML content
 * @returns {string} HTML with embedded styles
 */
export const embedStyles = (html) => {
    // This is a simple version - in production you'd want to extract computed styles
    return html;
};
