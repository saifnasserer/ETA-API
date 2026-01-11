const fs = require('fs');
const path = require('path');

const INVOICES_DIR = path.join(__dirname, 'invoices');

function renameInvoices() {
    console.log('Starting invoice renaming process (with duplicate handling)...\n');

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

            // Get the internal ID and UUID
            const internalId = invoice.internalId;
            const uuid = invoice.uuid;

            if (!internalId) {
                errors.push(`${file}: No internalId found`);
                errorCount++;
                continue;
            }

            // Create new filename
            let newFileName = `${internalId}.json`;
            let newFilePath = path.join(INVOICES_DIR, newFileName);

            // Check if file already has the correct name
            if (file === newFileName || file === `${internalId}_${uuid.substring(0, 8)}.json`) {
                console.log(`✓ ${file} already has correct name`);
                successCount++;
                continue;
            }

            // If target file already exists, append first 8 chars of UUID to make it unique
            if (fs.existsSync(newFilePath)) {
                const uuidSuffix = uuid.substring(0, 8);
                newFileName = `${internalId}_${uuidSuffix}.json`;
                newFilePath = path.join(INVOICES_DIR, newFileName);

                // Check again if this unique name exists
                if (fs.existsSync(newFilePath)) {
                    errors.push(`${file}: Even unique filename ${newFileName} already exists`);
                    errorCount++;
                    continue;
                }

                console.log(`⚠ Duplicate ID detected: ${file} → ${newFileName}`);
            } else {
                console.log(`✓ Renamed: ${file} → ${newFileName}`);
            }

            // Rename the file
            fs.renameSync(filePath, newFilePath);
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
