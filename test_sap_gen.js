const { generateSapExcel } = require('./server/sap_excel_generator');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// Mock invoices function similar to loadInvoices
function loadInvoices() {
    const invoicesFullDir = path.join(__dirname, 'invoices_full');
    const files = fs.readdirSync(invoicesFullDir).filter(f => f.endsWith('.json')).slice(0, 5);
    const invoices = [];
    files.forEach(file => {
        const data = JSON.parse(fs.readFileSync(path.join(invoicesFullDir, file), 'utf8'));
        invoices.push(data);
    });
    return invoices;
}

const invoices = loadInvoices();
const result = generateSapExcel(invoices);
console.log('Generation Result:', result);

// Verify Headers
function checkFile(filePath) {
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const headers = xlsx.utils.sheet_to_json(sheet, { header: 1 })[0];
    console.log(`Headers for ${path.basename(filePath)}:`);
    console.log(headers);
}

checkFile(result.sales);
checkFile(result.purchases);
