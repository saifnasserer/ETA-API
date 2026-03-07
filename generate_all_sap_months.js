const fs = require('fs');
const path = require('path');
const { generateSapExcel } = require('./server/sap_excel_generator');

const INVOICES_DIR = path.join(__dirname, 'invoices_full');
const OUTPUT_BASE_DIR = path.join(__dirname, 'output', 'sap_monthly_bulk');

async function main() {
    console.log('🚀 Starting Bulk SAP Excel generation for all months...');

    if (!fs.existsSync(INVOICES_DIR)) {
        console.error(`❌ Invoices directory not found: ${INVOICES_DIR}`);
        process.exit(1);
    }

    const files = fs.readdirSync(INVOICES_DIR).filter(f => f.endsWith('.json'));
    const periods = new Map();

    console.log(`📂 Analyzing ${files.length} invoices...`);

    for (const file of files) {
        try {
            const filePath = path.join(INVOICES_DIR, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const invoice = JSON.parse(content);

            let date = invoice.dateTimeIssued;
            if (!date && invoice.document) {
                try {
                    const doc = typeof invoice.document === 'string' ? JSON.parse(invoice.document) : invoice.document;
                    date = doc.dateTimeIssued;
                } catch (e) { }
            }

            if (date) {
                let yearMonth = date.substring(0, 7); // YYYY-MM

                // Consolidation logic: All before 3-3-2025 go to 3-2025
                if (date < '2025-03-03') {
                    yearMonth = '2025-03';
                }

                if (!periods.has(yearMonth)) {
                    periods.set(yearMonth, []);
                }
                periods.get(yearMonth).push(invoice);
            }
        } catch (error) {
            console.error(`⚠️ Error parsing ${file}: ${error.message}`);
        }
    }

    const sortedMonths = Array.from(periods.keys()).filter(m => m >= '2025-03').sort();
    console.log(`📋 Found ${sortedMonths.length} valid months of data (starting from 2025-03).`);

    // Clear output folder to remove old months
    if (fs.existsSync(OUTPUT_BASE_DIR)) {
        console.log(`🧹 Cleaning old output directory: ${OUTPUT_BASE_DIR}`);
        fs.rmSync(OUTPUT_BASE_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(OUTPUT_BASE_DIR, { recursive: true });

    for (const yearMonth of sortedMonths) {
        const invoices = periods.get(yearMonth);
        const [year, month] = yearMonth.split('-');

        // Folder name format: m-yyyy (e.g. 1-2026, 3-2025)
        const folderName = `${parseInt(month)}-${year}`;
        const outputDir = path.join(OUTPUT_BASE_DIR, folderName);

        console.log(`⏳ Processing ${yearMonth} (${invoices.length} invoices) -> Folder: ${folderName}`);

        try {
            generateSapExcel(invoices, '', outputDir);
        } catch (err) {
            console.error(`❌ Error generating for ${yearMonth}: ${err.message}`);
        }
    }

    console.log('\n✅ Bulk Generation Complete!');
    console.log(`📂 All files saved in: ${OUTPUT_BASE_DIR}`);
}

main().catch(err => {
    console.error('❌ Fatal Error:', err);
    process.exit(1);
});
