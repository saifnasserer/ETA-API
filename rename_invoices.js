const fs = require('fs');
const path = require('path');

const INVOICES_DIR = path.join(__dirname, 'invoices');

function renameInvoices() {
    console.log('Starting invoice renaming process...\n');

    // Get all JSON files in the invoices directory
    const files = fs.readdirSync(INVOICES_DIR).filter(file => file.endsWith('.json'));

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const file of files) {
        const filePath = path.join(INVOICES_DIR, file);

        try {
            // Read the invoice file
            const content = fs.readFileSync(filePath, 'utf8');
            const invoice = JSON.parse(content);

            // Get the internal ID
            const internalId = invoice.internalId;

            if (!internalId) {
                errors.push(`${file}: No internalId found`);
                errorCount++;
                continue;
            }

            // Create new filename
            const newFileName = `${internalId}.json`;
            const newFilePath = path.join(INVOICES_DIR, newFileName);

            // Check if file already has the correct name
            if (file === newFileName) {
                console.log(`✓ ${file} already has correct name`);
                successCount++;
                continue;
            }

            // Check if target file already exists
            if (fs.existsSync(newFilePath)) {
                errors.push(`${file}: Target file ${newFileName} already exists`);
                errorCount++;
                continue;
            }

            // Rename the file
            fs.renameSync(filePath, newFilePath);
            console.log(`✓ Renamed: ${file} → ${newFileName}`);
            successCount++;

        } catch (error) {
            errors.push(`${file}: ${error.message}`);
            errorCount++;
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Successfully renamed: ${successCount} files`);
    if (errorCount > 0) {
        console.log(`❌ Errors: ${errorCount} files`);
        console.log('\nError details:');
        errors.forEach(err => console.log(`  - ${err}`));
    }
    console.log('='.repeat(50));
}

renameInvoices();
