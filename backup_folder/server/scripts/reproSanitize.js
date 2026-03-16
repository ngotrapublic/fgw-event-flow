const ExcelJS = require('exceljs');

async function crashTest() {
    console.log('💥 Starting Short Prefix Test...');
    try {
        const workbook = new ExcelJS.Workbook();
        workbook.addWorksheet('Reference');
        const range = 'Reference!$C$2:$C$5';

        // Test 12: D_1_... Strategy
        try {
            // D_1_PCTSV -> D1PCTSV
            // D (Valid Col) 1 (Row) PCTSV (Suffix -> Invalid Address) -> Fallback to Name ?
            console.log(`\nAttempting 12: D_1_PCTSV`);
            workbook.definedNames.add('D_1_PCTSV', range);
            console.log('✅ Success: D_1_PCTSV works');
        } catch (e) {
            console.error('❌ Failed D_1_PCTSV:', e.message);
        }

        // Test 13: Using Z (Valid Col)
        try {
            console.log(`\nAttempting 13: Z_1_PCTSV`);
            workbook.definedNames.add('Z_1_PCTSV', range);
            console.log('✅ Success: Z_1_PCTSV works');
        } catch (e) {
            console.error('❌ Failed Z_1_PCTSV:', e.message);
        }

    } catch (error) {
        console.error('❌ Global Error:', error);
    }
}

crashTest();
