const fs = require('fs');
const path = require('path');
const { generateSapExcel } = require('./server/sap_excel_generator');

const INVOICES_DIR = path.join(__dirname, 'invoices_full');
const TARGET_MONTH = '2026-01';

async function main() {
    console.log(`🚀 Starting SAP Excel generation for ${TARGET_MONTH}...`);

    if (!fs.existsSync(INVOICES_DIR)) {
        console.error(`❌ Invoices directory not found: ${INVOICES_DIR}`);
        process.exit(1);
    }

    const files = fs.readdirSync(INVOICES_DIR).filter(f => f.endsWith('.json'));
    console.log(`📂 Found ${files.length} total invoices. Filtering for ${TARGET_MONTH}...`);

    const janInvoices = [];
    for (const file of files) {
        try {
            const filePath = path.join(INVOICES_DIR, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const invoice = JSON.parse(content);

            // Use dateTimeIssued from root or document
            let date = invoice.dateTimeIssued;
            if (!date && invoice.document) {
                try {
                    const doc = typeof invoice.document === 'string' ? JSON.parse(invoice.document) : invoice.document;
                    date = doc.dateTimeIssued;
                } catch (e) { }
            }

            if (date && date.startsWith(TARGET_MONTH)) {
                janInvoices.push(invoice);
            }
        } catch (error) {
            console.error(`⚠️ Error processing ${file}: ${error.message}`);
        }
    }

    console.log(`📋 Found ${janInvoices.length} invoices for ${TARGET_MONTH}.`);

    if (janInvoices.length === 0) {
        console.warn('⚠️ No invoices found for the target period. Exiting.');
        return;
    }

    const result = generateSapExcel(janInvoices, '0126');
    console.log('\n✅ Generation Complete!');
    console.log('-------------------------');
    console.log(`Sales: ${result.sales} (${result.counts.sales} rows)`);
    console.log(`Purchases: ${result.purchases} (${result.counts.purchases} rows)`);
    console.log('-------------------------');
}

main().catch(err => {
    console.error('❌ Fatal Error:', err);
    process.exit(1);
});
