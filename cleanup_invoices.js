const fs = require('fs');
const path = require('path');

const INVOICES_DIR = path.join(__dirname, 'invoices');

function cleanupInvoices() {
    console.log('Starting invoice cleanup...\n');

    // Get all JSON files in the invoices directory
    const files = fs.readdirSync(INVOICES_DIR).filter(file => file.endsWith('.json'));

    const uuidMap = new Map(); // Track UUIDs to detect duplicates
    let invalidCount = 0;
    let duplicateCount = 0;
    let validCount = 0;

    const invalidFiles = [];
    const duplicateFiles = [];

    // First pass: identify invalid and duplicate files
    for (const file of files) {
        const filePath = path.join(INVOICES_DIR, file);

        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const invoice = JSON.parse(content);
            const uuid = invoice.uuid;
            const status = invoice.status;

            // Check for Invalid status
            if (status === 'Invalid') {
                invalidFiles.push({
                    file: file,
                    internalId: invoice.internalId,
                    uuid: uuid
                });
                continue; // Skip to next file
            }

            // Check for duplicates
            if (uuidMap.has(uuid)) {
                // This is a duplicate - mark for deletion
                duplicateFiles.push({
                    file: file,
                    internalId: invoice.internalId,
                    uuid: uuid,
                    originalFile: uuidMap.get(uuid)
                });
            } else {
                // First occurrence of this UUID
                uuidMap.set(uuid, file);
                validCount++;
            }

        } catch (error) {
            console.error(`❌ Error processing ${file}: ${error.message}`);
        }
    }

    // Delete invalid files
    console.log('=== Deleting Invalid Invoices ===');
    for (const item of invalidFiles) {
        const filePath = path.join(INVOICES_DIR, item.file);
        fs.unlinkSync(filePath);
        invalidCount++;
        console.log(`🗑️  Deleted (Invalid): ${item.file} (ID: ${item.internalId})`);
    }

    // Delete duplicate files
    console.log('\n=== Removing Duplicate UUIDs ===');
    for (const item of duplicateFiles) {
        const filePath = path.join(INVOICES_DIR, item.file);
        fs.unlinkSync(filePath);
        duplicateCount++;
        console.log(`🗑️  Deleted (Duplicate): ${item.file} (kept: ${item.originalFile})`);
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Deleted ${invalidCount} invalid invoices`);
    console.log(`✅ Deleted ${duplicateCount} duplicate invoices`);
    console.log(`📄 Remaining: ${validCount} unique valid invoices`);
    console.log('='.repeat(50));

    if (invalidFiles.length > 0) {
        console.log('\nInvalid files deleted:');
        invalidFiles.forEach(item => {
            console.log(`  - ${item.file} (ID: ${item.internalId})`);
        });
    }

    if (duplicateFiles.length > 0) {
        console.log('\nDuplicate files deleted:');
        duplicateFiles.forEach(item => {
            console.log(`  - ${item.file} → kept ${item.originalFile}`);
        });
    }
}

cleanupInvoices();
