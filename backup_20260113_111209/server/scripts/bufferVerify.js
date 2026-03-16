const ExcelJS = require('exceljs');

async function testBuffer() {
    console.log('🧪 Testing Buffer Generation...');
    try {
        const workbook = new ExcelJS.Workbook();
        const refSheet = workbook.addWorksheet('Reference');

        // Mock Reference Data
        refSheet.getCell('A1').value = 'Test';

        // Define Name
        // Using the VERIFIED method from previous test
        if (workbook.definedNames && workbook.definedNames.add) {
            console.log('Using workbook.definedNames.add');
            workbook.definedNames.add('TestRange', 'Reference!$A$1:$A$1');
        } else {
            console.error('API failure: workbook.definedNames.add missing');
            return;
        }

        // Write to buffer
        const buffer = await workbook.xlsx.writeBuffer();
        console.log(`✅ Buffer generated. Size: ${buffer.length} bytes`);

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testBuffer();
