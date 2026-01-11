const fs = require('fs');
const path = require('path');

const INVOICES_DIR = path.join(__dirname, 'invoices');
const INVOICES_FULL_DIR = path.join(__dirname, 'invoices_full');

const metadataFiles = fs.readdirSync(INVOICES_DIR).filter(f => f.endsWith('.json'));
const fullFiles = fs.readdirSync(INVOICES_FULL_DIR).filter(f => f.endsWith('.json'));

// Get full invoice IDs
const fullIds = new Set(fullFiles.map(f => f.replace('.json', '').split('_')[0]));

// Find all missing (including valid ones)
const allMissing = [];
metadataFiles.forEach(file => {
    const data = JSON.parse(fs.readFileSync(path.join(INVOICES_DIR, file), 'utf8'));
    if (!fullIds.has(data.internalId)) {
        allMissing.push({
            id: data.internalId,
            status: data.status,
            uuid: data.uuid
        });
    }
});

console.log('❌ ALL MISSING INVOICES:\n');
console.log('ID'.padEnd(20) + 'Status'.padEnd(15) + 'UUID');
console.log('='.repeat(60));

const validMissing = [];
const rejectedMissing = [];

allMissing.forEach(inv => {
    console.log(
        inv.id.padEnd(20) +
        inv.status.padEnd(15) +
        inv.uuid.substring(0, 20) + '...'
    );

    if (inv.status === 'Valid') {
        validMissing.push(inv);
    } else {
        rejectedMissing.push(inv);
    }
});

console.log('\n📊 BREAKDOWN:\n');
console.log(`  ✅ Valid but missing:    ${validMissing.length}`);
console.log(`  ❌ Rejected (expected):  ${rejectedMissing.length}`);
console.log(`  📝 Total missing:        ${allMissing.length}`);

if (validMissing.length > 0) {
    console.log('\n⚠️  VALID INVOICES THAT SHOULD BE FETCHED:\n');
    validMissing.forEach(inv => {
        console.log(`  ${inv.id} (${inv.uuid.substring(0, 16)}...)`);
    });
    console.log('\n💡 These might have failed due to rate limiting or errors.');
    console.log('   You can fetch them individually using the UI or retry script.');
}
