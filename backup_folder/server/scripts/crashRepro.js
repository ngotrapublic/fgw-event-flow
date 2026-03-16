const ExcelJS = require('exceljs');

async function crashTest() {
    console.log('💥 Starting Crash Test...');
    try {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Reference');

        const name = 'PCTSV';
        const range = 'Reference!$C$2:$C$5'; // Valid range

        console.log(`Attempting: workbook.definedNames.add('${name}', '${range}')`);

        if (workbook.definedNames && workbook.definedNames.add) {
            workbook.definedNames.add(name, range);
            console.log('✅ Success!');
        } else {
            console.log('⚠️ workbook.definedNames.add missing');
        }

    } catch (error) {
        console.error('❌ Caught Error:', error);
        console.error('Stack:', error.stack);
    }
}

crashTest();
