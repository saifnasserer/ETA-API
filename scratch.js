const fs = require('fs');
const files = [
    'invoices_full/credit_357751406877.json',
    'invoices_full/357751406877.json',
    'invoices_full/069.json',
    'invoices_full/5862.json'
];

files.forEach(f => {
    try {
        const raw = JSON.parse(fs.readFileSync(f, 'utf8'));
        let doc = {};
        try { doc = JSON.parse(raw.document); } catch(e) {}
        
        console.log(`\nFile: ${f}`);
        console.log(`Receiver: ${raw.receiverName || doc.receiver?.name}`);
        console.log(`Type: ${raw.typeName || doc.documentType}`);
        console.log(`Date: ${raw.dateTimeIssued}`);
        console.log(`Sales: ${doc.totalSalesAmount}`);
        console.log(`Total: ${doc.totalAmount}`);
    } catch(e) {
        console.log(`Error reading ${f}`);
    }
});
