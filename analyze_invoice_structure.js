const fs = require('fs');
const path = require('path');

// Read the sample full invoice
const invoicePath = path.join(__dirname, 'sample_full_invoice.json');
const rawData = JSON.parse(fs.readFileSync(invoicePath, 'utf8'));

// The 'document' field is a JSON string that needs to be parsed
const document = JSON.parse(rawData.document);

console.log('=== INVOICE STRUCTURE ===\n');
console.log('Internal ID:', document.internalID);
console.log('Date:', document.dateTimeIssued);
console.log('Issuer:', document.issuer.name);
console.log('Receiver:', document.receiver.name);

console.log('\n=== LINE ITEMS WITH TAXES ===\n');

document.invoiceLines.forEach((line, index) => {
    console.log(`Item ${index + 1}: ${line.description}`);
    console.log(`  Quantity: ${line.quantity} x ${line.unitValue.amountEGP.toLocaleString()} EGP`);
    console.log(`  Sales Total: ${line.salesTotal.toLocaleString()} EGP`);
    console.log(`  Taxes:`);

    line.taxableItems.forEach(tax => {
        console.log(`    - ${tax.taxType} (${tax.subType}): ${tax.amount.toLocaleString()} EGP (${tax.rate}%)`);
    });

    console.log(`  Line Total: ${line.total.toLocaleString()} EGP`);
    console.log('');
});

console.log('=== INVOICE TOTALS ===\n');
console.log('Total Sales Amount:', document.totalSalesAmount.toLocaleString(), 'EGP');

console.log('\nTax Breakdown:');
document.taxTotals.forEach(tax => {
    const taxName = tax.taxType === 'T1' ? 'VAT' : tax.taxType === 'T4' ? 'WHT' : tax.taxType;
    console.log(`  ${taxName} (${tax.taxType}): ${tax.amount.toLocaleString()} EGP`);
});

console.log('\nGrand Total:', document.totalAmount.toLocaleString(), 'EGP');

console.log('\n=== WHT SUMMARY ===');
const whtTotal = document.taxTotals.find(t => t.taxType === 'T4');
if (whtTotal) {
    console.log(`✅ WHT (T4) IS INCLUDED: ${whtTotal.amount.toLocaleString()} EGP`);
    console.log('\nWHT appears in TWO places:');
    console.log('1. In each line item under "taxableItems"');
    console.log('2. In the invoice-level "taxTotals" array');
} else {
    console.log('❌ No WHT found in this invoice');
}

console.log('\n=== METADATA vs FULL DOCUMENT ===');
console.log('The metadata (search results) only shows:');
console.log('  - totalSales:', rawData.totalSales);
console.log('  - total:', rawData.total);
console.log('  - netAmount:', rawData.netAmount);
console.log('\nBut the FULL document contains:');
console.log('  - Complete line items with descriptions');
console.log('  - Tax breakdown (T1, T4) per item');
console.log('  - Addresses, payment terms, etc.');
