const ExcelJS = require('exceljs');

async function testTemplate() {
    console.log('🧪 Testing Excel Template Generation - Probe 2...');

    try {
        const workbook = new ExcelJS.Workbook();
        const refSheet = workbook.addWorksheet('Reference');

        const range = 'Reference!$A$1:$A$10';
        const sanitizedName = 'Test_Name';

        console.log('Inspecting definedNames...');
        // direct access
        console.log('workbook.definedNames:', workbook.definedNames);

        if (workbook.definedNames) {
            console.log('definedNames Methods:', Object.keys(workbook.definedNames));
            console.log('definedNames Prototype Methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(workbook.definedNames)));

            // Try common guesses
            if (workbook.definedNames.add) {
                console.log('TRY: workbook.definedNames.add...');
                workbook.definedNames.add(sanitizedName, range);
                console.log('SUCCESS: workbook.definedNames.add');
            }
            else if (workbook.definedNames.addDefinedName) {
                workbook.definedNames.addDefinedName(sanitizedName, range);
                console.log('SUCCESS: workbook.definedNames.addDefinedName');
            }
        }

        // Try fallback: direct manipulation of _definedNames (if it's an object/map)
        if (workbook._definedNames) {
            console.log('_definedNames type:', typeof workbook._definedNames);
            // If it's a map or object?
        }

        console.log('Done.');
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testTemplate();
