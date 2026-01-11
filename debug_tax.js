const fs = require('fs');
const path = require('path');
const calculator = require('./tax_engine/tax_calculator');

const invoicePath = path.join(__dirname, 'invoices/357751406877.json');
try {
    const content = fs.readFileSync(invoicePath, 'utf8');
    const json = JSON.parse(content);
    console.log('Raw JSON keys:', Object.keys(json));
    console.log('Document Type:', json.documentType);
    console.log('Total Sales:', json.totalSales);
    console.log('Total:', json.total);

    const processed = calculator.processInvoice(json);
    console.log('Processed:', JSON.stringify(processed, null, 2));

} catch (e) {
    console.error(e);
}
