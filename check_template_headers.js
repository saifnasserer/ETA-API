const xlsx = require('xlsx');
const filename = 'sales-doc_0.xlsx';

try {
    const workbook = xlsx.readFile(filename);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Get range
    const range = xlsx.utils.decode_range(worksheet['!ref']);

    // Read first row (headers)
    const headers = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = xlsx.utils.encode_cell({ r: 0, c: C });
        const cell = worksheet[cellAddress];
        headers.push(cell ? cell.v : undefined);
    }

    console.log('Template Headers:', JSON.stringify(headers, null, 2));

} catch (e) {
    console.error('Error:', e.message);
}
