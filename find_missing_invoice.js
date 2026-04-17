const fs = require('fs');
const path = require('path');
const COMPANY_ID = '767043545';
const dir = 'invoices_full';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

let marchPurchases = [];

files.forEach(file => {
  const raw = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  const dateStr = raw.dateTimeIssued || '';
  if (!dateStr.startsWith('2025-03')) return;
  if (raw.receiverId !== COMPANY_ID) return; // not a purchase
  
  let doc = {};
  if (typeof raw.document === 'string') {
      try { doc = JSON.parse(raw.document); } catch(e) {}
  } else {
      doc = raw.document || {};
  }
  
  if ((doc.documentType || '').toLowerCase() === 'c') return; // skip credit notes
  
  const vatTotal = (doc.taxTotals || []).filter(t => t.taxType === 'T1').reduce((s, t) => s + (t.amount || 0), 0);
  const salesAmount = doc.totalSalesAmount || 0;
  
  marchPurchases.push({
    id: raw.internalId || raw.uuid,
    date: dateStr.substring(0, 10),
    supplier: (raw.issuerName || '').substring(0, 35),
    salesAmount: salesAmount,
    vat: vatTotal,
    total: doc.totalAmount || 0,
    file: file
  });
});

marchPurchases.sort((a, b) => a.date.localeCompare(b.date));

console.log('فواتير مشتريات مارس 2025:');
console.log('---');
let totalSales = 0;
marchPurchases.forEach(p => {
  totalSales += p.salesAmount;
  console.log(p.id + ' | ' + p.date + ' | ' + p.salesAmount.toFixed(2) + ' | VAT: ' + p.vat.toFixed(2) + ' | ' + p.supplier);
});
console.log('---');
console.log('إجمالي المشتريات: ' + totalSales.toFixed(2));
console.log('المُقدّم في الإقرار: 157,850');
console.log('الفرق: ' + (totalSales - 157850).toFixed(2));

// Find which invoices sum to 157850
console.log('\n--- تحليل الفرق ---');
const target = 157850;
// Try all combinations of removing one invoice
marchPurchases.forEach(p => {
  const withoutThis = totalSales - p.salesAmount;
  if (Math.abs(withoutThis - target) < 1) {
    console.log('🎯 لو شلنا فاتورة ' + p.id + ' (' + p.salesAmount + ') = ' + withoutThis.toFixed(2) + ' == المُقدّم!');
  }
});
