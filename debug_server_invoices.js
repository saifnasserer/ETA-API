const fs = require('fs');
const path = require('path');
const taxCalculator = require('./tax_engine/tax_calculator');
const complianceCheck = require('./tax_engine/compliance_check');

const invoicesFullDir = path.join(__dirname, 'invoices_full');

console.log('🔍 Debugging Invoice Processing WITH Compliance...\n');

try {
    const files = fs.readdirSync(invoicesFullDir).filter(f => f.endsWith('.json'));
    console.log(`Found ${files.length} files in invoices_full`);

    let processedCount = 0;
    let failedCount = 0;

    files.forEach(file => {
        try {
            const content = fs.readFileSync(path.join(invoicesFullDir, file), 'utf8');
            const data = JSON.parse(content);

            // Simulate server/index.js PIPELINE
            const processedInv = taxCalculator.processInvoice(data);

            // This is the line likely causing the crash if processedInv is null
            const complianceChecked = complianceCheck.checkInvoice(processedInv);

            if (complianceChecked) {
                processedCount++;
            } else {
                console.log(`  Processed result was null/skipped for ${file}`);
            }

        } catch (error) {
            console.error(`  ❌ CRASH on file ${file}:`, error);
            failedCount++;
        }
    });

    console.log(`\n✅ Success: ${processedCount}`);
    console.log(`❌ Failed: ${failedCount}`);

} catch (error) {
    console.error('❌ Global script error:', error);
}
