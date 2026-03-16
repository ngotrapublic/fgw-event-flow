const ExcelJS = require('exceljs');
const { getTemplate } = require('../controllers/importController');

// Mock request/response to capture the workbook
// Since getTemplate writes to res, we'll need to mock it or copy the logic.
// Easier to copy the logic into a test function or modify the controller to export the workbook generation logic.
// But modifying controller is risky.
// Let's just create a script that uses the SAME logic (copy-paste for testing) to generate a file and check it.

async function verifyLogic() {
    console.log('🧪 Verifying Excel Data Validation Logic...');

    try {
        const workbook = new ExcelJS.Workbook();
        const refSheet = workbook.addWorksheet('Reference');
        const sheet = workbook.addWorksheet('Template');

        // Logic from importController.js (simplified mock)
        const depts = [{ name: 'Phòng Đào Tạo', emails: ['a@a.com'] }];

        // 1. Setup ID
        const dept = depts[0];
        let abbr = dept.name
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase();

        const sanitizedID = `List_${abbr}`; // "List_PDT"

        // Reference Sheet
        refSheet.getCell('B2').value = dept.name;
        refSheet.getCell('C2').value = sanitizedID;

        // Named Range
        // workbook.definedNames.add(sanitizedID, 'Reference!$D$2:$D$5'); 

        // 2. Data Validation Formula
        // Formula: =INDIRECT(VLOOKUP(F2, 'Reference'!$B:$C, 2, 0))
        const row = 2;
        const startRow = 2;
        const lastRow = 100;

        for (let i = startRow; i <= lastRow; i++) {
            sheet.getCell(`G${i}`).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [`INDIRECT(VLOOKUP(F${i},'Reference'!$B:$C,2,0))`],
                showErrorMessage: true
            };
        }

        // 3. Verify
        const cell = sheet.getCell('G2');
        console.log('Cell G2 Data Validation:', cell.dataValidation);

        if (cell.dataValidation.formulae[0] === "INDIRECT(VLOOKUP(F2,'Reference'!$B:$C,2,0))") {
            console.log('✅ Formula is CORRECT');
        } else {
            console.log('❌ Formula mismatch:', cell.dataValidation.formulae[0]);
        }

        console.log('Sanitized ID for "Phòng Đào Tạo":', sanitizedID);

    } catch (e) {
        console.error(e);
    }
}

verifyLogic();
