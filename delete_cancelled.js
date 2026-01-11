const fs = require('fs');
const path = require('path');

const INVOICES_DIR = path.join(__dirname, 'invoices');

function deleteCancelledInvoices() {
    console.log('Scanning for cancelled invoices...\n');

    // Get all JSON files in the invoices directory
    const files = fs.readdirSync(INVOICES_DIR).filter(file => file.endsWith('.json'));

    let deletedCount = 0;
    let validCount = 0;
    const deletedFiles = [];

    for (const file of files) {
        const filePath = path.join(INVOICES_DIR, file);

        try {
            // Read the invoice file
            const content = fs.readFileSync(filePath, 'utf8');
            const invoice = JSON.parse(content);

            // Check if status is "Cancelled"
            if (invoice.status === 'Cancelled') {
                // Delete the file
                fs.unlinkSync(filePath);
                deletedFiles.push({
                    file: file,
                    internalId: invoice.internalId,
                    uuid: invoice.uuid
                });
                deletedCount++;
                console.log(`🗑️  Deleted: ${file} (Internal ID: ${invoice.internalId})`);
            } else {
                validCount++;
            }

        } catch (error) {
            console.error(`❌ Error processing ${file}: ${error.message}`);
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Deleted: ${deletedCount} cancelled invoices`);
    console.log(`📄 Remaining: ${validCount} valid invoices`);
    console.log('='.repeat(50));

    if (deletedFiles.length > 0) {
        console.log('\nDeleted files:');
        deletedFiles.forEach(item => {
            console.log(`  - ${item.file} (ID: ${item.internalId})`);
        });
    }
}

deleteCancelledInvoices();
