const fs = require('fs');
const path = require('path');

const INVOICES_DIR = path.join(__dirname, 'invoices');

// Check all document types
const typeCounts = {};
const files = fs.readdirSync(INVOICES_DIR).filter(f => f.endsWith('.json'));

console.log('📋 DOCUMENT TYPE ANALYSIS\n');
console.log('='.repeat(70));

const byType = { I: [], C: [], D: [], Other: [] };

files.forEach(file => {
    const data = JSON.parse(fs.readFileSync(path.join(INVOICES_DIR, file), 'utf8'));
    const type = data.documentType || data.typeName || 'Unknown';
    const typeName = data.documentTypeNamePrimaryLang || 'Unknown';

    typeCounts[type] = (typeCounts[type] || 0) + 1;

    if (type === 'I' || type === 'i') {
        byType.I.push({ id: data.internalId, status: data.status });
    } else if (type === 'C' || type === 'c') {
        byType.C.push({ id: data.internalId, status: data.status, name: typeName });
    } else if (type === 'D' || type === 'd') {
        byType.D.push({ id: data.internalId, status: data.status, name: typeName });
    } else {
        byType.Other.push({ id: data.internalId, type, status: data.status });
    }
});

console.log('Document Type Counts:\n');
Object.entries(typeCounts).forEach(([type, count]) => {
    const label = type === 'I' || type === 'i' ? 'Invoice' :
        type === 'C' || type === 'c' ? 'Credit Note' :
            type === 'D' || type === 'd' ? 'Debit Note' : type;
    console.log(`  ${label} (${type}): ${count}`);
});

console.log('\n' + '='.repeat(70));
console.log('\n💳 CREDIT NOTES:\n');
if (byType.C.length > 0) {
    byType.C.forEach(doc => {
        console.log(`  ${doc.id.padEnd(20)} [${doc.status}] ${doc.name || ''}`);
    });
} else {
    console.log('  None found');
}

console.log('\n💵 DEBIT NOTES:\n');
if (byType.D.length > 0) {
    byType.D.forEach(doc => {
        console.log(`  ${doc.id.padEnd(20)} [${doc.status}] ${doc.name || ''}`);
    });
} else {
    console.log('  None found');
}

console.log('\n📄 REGULAR INVOICES:\n');
console.log(`  Total: ${byType.I.length}`);
console.log(`  Valid: ${byType.I.filter(d => d.status === 'Valid').length}`);
console.log(`  Rejected: ${byType.I.filter(d => d.status === 'Rejected').length}`);
