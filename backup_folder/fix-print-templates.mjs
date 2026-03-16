// Quick script to add print styles to all templates
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const templatesDir = path.join(__dirname, '../client/src/components/print-templates');

const printStyleBlock = `<>
            <style>{\`
                @media print {
                    .print-template-container {
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding-left: 0 !important;
                        padding-right: 0 !important;
                    }
                }
            \`}</style>
            <div className="print-template-container `;

const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.jsx') && f !== 'EditableField.jsx' && f !== 'PageBreakTest.jsx' && f !== 'LetterOfUndertaking.jsx' && f !== 'ApplicationToCommence.jsx');

files.forEach(file => {
    const filePath = path.join(templatesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Find the return statement with the first div
    const returnMatch = content.match(/return \(\s*<div className="([^"]*max-w-\[210mm\][^"]*)"/);

    if (returnMatch) {
        const originalClasses = returnMatch[1];
        const newClasses = originalClasses
            .replace('print:max-w-none', '')
            .replace('print:mx-0', '')
            .replace('print:px-0', '')
            .trim()
            .replace(/\s+/g, ' ');

        // Replace the return statement
        content = content.replace(
            /return \(\s*<div className="[^"]*max-w-\[210mm\][^"]*"/,
            `return (\n        ${printStyleBlock}${newClasses}"`
        );

        // Find the closing div and add fragment closing
        const lines = content.split('\n');
        let divCount = 0;
        let returnLineIndex = -1;

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('return (')) {
                returnLineIndex = i;
                break;
            }
        }

        if (returnLineIndex !== -1) {
            for (let i = returnLineIndex; i < lines.length; i++) {
                const line = lines[i];
                const openDivs = (line.match(/<div/g) || []).length;
                const closeDivs = (line.match(/<\/div>/g) || []).length;
                divCount += openDivs - closeDivs;

                if (divCount === 0 && closeDivs > 0 && line.trim() === '</div>') {
                    // This is the closing div for the main container
                    lines[i] = '            </div>\n        </>';
                    break;
                }
            }

            content = lines.join('\n');
        }

        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✓ Updated ${file}`);
    } else {
        console.log(`⊘ Skipped ${file} (no matching pattern)`);
    }
});

console.log('\nDone! Updated', files.length, 'template files.');
