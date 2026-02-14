const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

// Get arguments
const args = process.argv.slice(2);
if (args.length < 1) {
    console.error('Usage: node convert_excel_to_csv.js <input_excel_file> [output_csv_file]');
    process.exit(1);
}

const inputFile = args[0];
const outputFile = args[1] || inputFile.replace(/\.[^/.]+$/, "") + ".csv";

try {
    if (!fs.existsSync(inputFile)) {
        throw new Error(`Input file not found: ${inputFile}`);
    }

    console.log(`Reading file: ${inputFile}`);
    const workbook = xlsx.readFile(inputFile);

    // Assume first sheet
    const sheetName = workbook.SheetNames[0];
    console.log(`Converting sheet: ${sheetName}`);
    const worksheet = workbook.Sheets[sheetName];

    // Generate CSV
    const csvOutput = xlsx.utils.sheet_to_csv(worksheet);

    // Add Byte Order Mark (BOM) for UTF-8 (Crucial for Arabic in Excel)
    const bom = '\uFEFF';
    const finalContent = bom + csvOutput;

    // Write file
    fs.writeFileSync(outputFile, finalContent, { encoding: 'utf8' });
    console.log(`✅ Successfully converted to CSV (UTF-8): ${outputFile}`);

} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}
