const ExcelJS = require('exceljs');

async function crashTest() {
    console.log('💥 Starting D1_Prefix Test...');
    try {
        const workbook = new ExcelJS.Workbook();
        workbook.addWorksheet('Reference');
        const range = 'Reference!$C$2:$C$5';

        // Test 14: D1_Prefix
        // D1_PCTSV -> D1PCTSV
        // D (Letter), 1 (Number), PCTSV (Letters)
        // Not a column (has number). Not a cell (letters after number).
        try {
            console.log(`\nAttempting 14: D1_PCTSV`);
            workbook.definedNames.add('D1_PCTSV', range);
            console.log('✅ Success: D1_PCTSV works');
        } catch (e) {
            console.error('❌ Failed D1_PCTSV:', e.message);
        }

        // Test 15: User Request clean format?
        // Can we do anything without numbers?
        // What about 'Dept_CTSV'? -> DEPTCTSV (Column).
        // What if we use a period that DOESN'T get stripped?
        // The error implies stripping.

    } catch (error) {
        console.error('❌ Global Error:', error);
    }
}

crashTest();
