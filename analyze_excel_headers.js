const XLSX = require('xlsx');
const fs = require('fs');

function analyzeExcel(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return;
    }
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log(`\n--- Analysis of ${filePath} ---`);
    if (data.length > 0) {
        console.log('Headers:', data[0]);
        if (data.length > 1) {
            console.log('Sample Row 1:', data[1]);
        }
    } else {
        console.log('Empty file');
    }
}

analyzeExcel('/media/saif/brain/Projects/Laapak-Softwares/invoicing-API/Purchases.xlsx');
