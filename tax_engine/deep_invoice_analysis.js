#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════
 *  DEEP INVOICE ANALYSIS — لابك لتجارة الإلكترونيات
 * ═══════════════════════════════════════════════════════════════════
 *  Parses the FULL ETA document JSON inside each invoice file
 *  to extract precise tax breakdowns (VAT T1, WHT T4, etc.)
 * 
 *  Usage:  node deep_invoice_analysis.js
 *  Output: Console tables + output/deep_analysis_report.json
 * ═══════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');

const COMPANY_ID = '767043545'; // Laapak Tax ID
const INVOICES_DIR = path.join(__dirname, '../invoices_full');
const OUTPUT_DIR = path.join(__dirname, '../output');

// VAT Registration date
const VAT_REGISTRATION_DATE = new Date('2025-03-03');
// Company establishment date
const COMPANY_EST_DATE = new Date('2024-10-16');

// ── Helpers ────────────────────────────────────────────────────────

function fmt(n) {
    return Number(n).toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function round2(n) {
    return parseFloat(Number(n).toFixed(2));
}

// ── Parse Single Invoice ──────────────────────────────────────────

function parseInvoice(filePath) {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Parse the nested document JSON string
    let doc;
    try {
        doc = JSON.parse(raw.document);
    } catch (e) {
        console.warn(`  ⚠ Could not parse document in ${path.basename(filePath)}`);
        return null;
    }

    // Determine document type
    const docType = (doc.documentType || raw.typeName || '').toLowerCase();
    const isCreditNote = docType === 'c';
    const sign = isCreditNote ? -1 : 1;

    // Determine direction (Sales or Purchases)
    const issuerId = doc.issuer?.id || raw.issuerId || '';
    const receiverId = doc.receiver?.id || raw.receiverId || '';
    let direction;
    if (issuerId === COMPANY_ID) {
        direction = 'sales';
    } else if (receiverId === COMPANY_ID) {
        direction = 'purchases';
    } else {
        direction = 'unknown';
    }

    // Extract date
    const dateStr = doc.dateTimeIssued || raw.dateTimeIssued;
    const date = new Date(dateStr);
    const month = dateStr ? dateStr.substring(0, 7) : 'unknown';

    // Extract tax totals from document
    const taxTotals = {};
    if (doc.taxTotals && Array.isArray(doc.taxTotals)) {
        doc.taxTotals.forEach(t => {
            taxTotals[t.taxType] = round2((taxTotals[t.taxType] || 0) + (t.amount || 0));
        });
    }

    // Also analyze line-level taxes for detailed breakdown
    const lineTaxDetails = [];
    if (doc.invoiceLines && Array.isArray(doc.invoiceLines)) {
        doc.invoiceLines.forEach(line => {
            const lineInfo = {
                description: line.description || '',
                quantity: line.quantity || 0,
                unitPrice: line.unitValue?.amountEGP || 0,
                salesTotal: line.salesTotal || 0,
                netTotal: line.netTotal || 0,
                total: line.total || 0,
                taxes: {}
            };

            if (line.taxableItems && Array.isArray(line.taxableItems)) {
                line.taxableItems.forEach(tax => {
                    lineInfo.taxes[tax.taxType] = {
                        amount: tax.amount || 0,
                        rate: tax.rate || 0,
                        subType: tax.subType || ''
                    };
                });
            }

            lineTaxDetails.push(lineInfo);
        });
    }

    return {
        file: path.basename(filePath),
        internalId: doc.internalID || raw.internalId || 'N/A',
        uuid: raw.uuid || '',
        date: dateStr,
        month,
        year: date.getFullYear(),
        direction,
        documentType: isCreditNote ? 'credit_note' : 'invoice',
        isCreditNote,
        sign,
        isBeforeVATRegistration: date < VAT_REGISTRATION_DATE,

        // Counterparty
        issuerName: doc.issuer?.name || raw.issuerName || '',
        issuerId,
        receiverName: doc.receiver?.name || raw.receiverName || '',
        receiverId,

        // Financial totals (from document, NOT metadata)
        totalSalesAmount: round2((doc.totalSalesAmount || 0) * sign),
        totalDiscountAmount: round2((doc.totalDiscountAmount || 0) * sign),
        netAmount: round2((doc.netAmount || 0) * sign),
        totalAmount: round2((doc.totalAmount || 0) * sign),

        // Tax breakdown (from document-level taxTotals)
        vatT1: round2((taxTotals['T1'] || 0) * sign),
        whtT4: round2((taxTotals['T4'] || 0) * sign),
        tableTaxT2: round2((taxTotals['T2'] || 0) * sign),
        stampT6: round2((taxTotals['T6'] || 0) * sign),
        otherTax: round2(
            Object.entries(taxTotals)
                .filter(([k]) => !['T1', 'T2', 'T4', 'T6'].includes(k))
                .reduce((s, [, v]) => s + v, 0) * sign
        ),

        // Line details
        lineCount: lineTaxDetails.length,
        lines: lineTaxDetails,

        // Status
        status: raw.status || 'Unknown',
        validationStatus: raw.validationResults?.status || 'Unknown'
    };
}

// ── Load All Invoices ─────────────────────────────────────────────

function loadAllInvoices() {
    const files = fs.readdirSync(INVOICES_DIR).filter(f => f.endsWith('.json'));
    const invoices = [];
    const errors = [];

    for (const file of files) {
        try {
            const inv = parseInvoice(path.join(INVOICES_DIR, file));
            if (inv) invoices.push(inv);
        } catch (e) {
            errors.push({ file, error: e.message });
        }
    }

    if (errors.length > 0) {
        console.log(`\n⚠ Failed to parse ${errors.length} files:`);
        errors.forEach(e => console.log(`  - ${e.file}: ${e.error}`));
    }

    return invoices;
}

// ── Aggregate by Month ────────────────────────────────────────────

function aggregateByMonth(invoices) {
    const months = {};

    for (const inv of invoices) {
        if (!months[inv.month]) {
            months[inv.month] = {
                month: inv.month,
                sales: { count: 0, totalSales: 0, vatT1: 0, whtT4: 0, totalAmount: 0, invoices: [] },
                purchases: { count: 0, totalSales: 0, vatT1: 0, whtT4: 0, totalAmount: 0, invoices: [] },
                creditNotes: { count: 0, totalSales: 0, vatT1: 0, whtT4: 0, totalAmount: 0, invoices: [] }
            };
        }

        const m = months[inv.month];

        if (inv.isCreditNote) {
            m.creditNotes.count++;
            m.creditNotes.totalSales += inv.totalSalesAmount;
            m.creditNotes.vatT1 += inv.vatT1;
            m.creditNotes.whtT4 += inv.whtT4;
            m.creditNotes.totalAmount += inv.totalAmount;
            m.creditNotes.invoices.push(inv);
        } else if (inv.direction === 'sales') {
            m.sales.count++;
            m.sales.totalSales += inv.totalSalesAmount;
            m.sales.vatT1 += inv.vatT1;
            m.sales.whtT4 += inv.whtT4;
            m.sales.totalAmount += inv.totalAmount;
            m.sales.invoices.push(inv);
        } else if (inv.direction === 'purchases') {
            m.purchases.count++;
            m.purchases.totalSales += inv.totalSalesAmount;
            m.purchases.vatT1 += inv.vatT1;
            m.purchases.whtT4 += inv.whtT4;
            m.purchases.totalAmount += inv.totalAmount;
            m.purchases.invoices.push(inv);
        }
    }

    // Round all numeric values
    for (const m of Object.values(months)) {
        for (const cat of ['sales', 'purchases', 'creditNotes']) {
            m[cat].totalSales = round2(m[cat].totalSales);
            m[cat].vatT1 = round2(m[cat].vatT1);
            m[cat].whtT4 = round2(m[cat].whtT4);
            m[cat].totalAmount = round2(m[cat].totalAmount);
        }
    }

    return months;
}

// ── Print Report ──────────────────────────────────────────────────

function printReport(invoices, months) {
    const sortedMonths = Object.keys(months).sort();

    console.log('\n' + '═'.repeat(90));
    console.log('  تحليل شامل للفواتير — لابك لتجارة الإلكترونيات');
    console.log('  DEEP INVOICE ANALYSIS — Laapak Electronics Trading');
    console.log('═'.repeat(90));

    // ── Overall Statistics ──
    console.log('\n📊 إجمالي الفواتير / OVERALL STATISTICS');
    console.log('─'.repeat(60));

    const totalInvoices = invoices.filter(i => !i.isCreditNote);
    const totalCredits = invoices.filter(i => i.isCreditNote);
    const salesInv = invoices.filter(i => i.direction === 'sales' && !i.isCreditNote);
    const purchInv = invoices.filter(i => i.direction === 'purchases' && !i.isCreditNote);
    const preVATSales = salesInv.filter(i => i.isBeforeVATRegistration);
    const postVATSales = salesInv.filter(i => !i.isBeforeVATRegistration);

    console.log(`  Total Files:              ${invoices.length}`);
    console.log(`  Invoices:                 ${totalInvoices.length}`);
    console.log(`    ├── Sales:              ${salesInv.length}`);
    console.log(`    │   ├── Pre-VAT Reg:    ${preVATSales.length}  (before 3/3/2025)`);
    console.log(`    │   └── Post-VAT Reg:   ${postVATSales.length} (after 3/3/2025)`);
    console.log(`    └── Purchases:          ${purchInv.length}`);
    console.log(`  Credit Notes:             ${totalCredits.length}`);
    console.log(`  Date Range:               ${sortedMonths[0]} → ${sortedMonths[sortedMonths.length - 1]}`);

    // ── Pre-VAT Registration Summary ──
    console.log('\n\n🔴 فواتير قبل التسجيل في القيمة المضافة / PRE-VAT REGISTRATION INVOICES');
    console.log('─'.repeat(60));
    console.log('  (Invoices issued BEFORE 3/3/2025 with 14% VAT charged)');

    const preVATTotal = {
        sales: round2(preVATSales.reduce((s, i) => s + i.totalSalesAmount, 0)),
        vat: round2(preVATSales.reduce((s, i) => s + i.vatT1, 0)),
        wht: round2(preVATSales.reduce((s, i) => s + i.whtT4, 0)),
        total: round2(preVATSales.reduce((s, i) => s + i.totalAmount, 0))
    };

    console.log(`  عدد الفواتير:   ${preVATSales.length}`);
    console.log(`  إجمالي المبيعات: ${fmt(preVATTotal.sales)} EGP`);
    console.log(`  ض.ق.م محصّلة:    ${fmt(preVATTotal.vat)} EGP`);
    console.log(`  خصم تحت الحساب:  ${fmt(preVATTotal.wht)} EGP`);
    console.log(`  الإجمالي:        ${fmt(preVATTotal.total)} EGP`);

    console.log('\n  التفاصيل:');
    preVATSales.forEach(inv => {
        console.log(`    ${inv.internalId.padEnd(8)} | ${inv.date.substring(0, 10)} | ${fmt(inv.totalSalesAmount).padStart(12)} | VAT: ${fmt(inv.vatT1).padStart(10)} | ${inv.receiverName.substring(0, 35)}`);
    });

    // ── Post-VAT Registration Summary ──
    console.log('\n\n🟢 فواتير بعد التسجيل في القيمة المضافة / POST-VAT REGISTRATION INVOICES');
    console.log('─'.repeat(60));

    const postVATTotal = {
        sales: round2(postVATSales.reduce((s, i) => s + i.totalSalesAmount, 0)),
        vat: round2(postVATSales.reduce((s, i) => s + i.vatT1, 0)),
        wht: round2(postVATSales.reduce((s, i) => s + i.whtT4, 0)),
        total: round2(postVATSales.reduce((s, i) => s + i.totalAmount, 0))
    };

    console.log(`  عدد الفواتير:   ${postVATSales.length}`);
    console.log(`  إجمالي المبيعات: ${fmt(postVATTotal.sales)} EGP`);
    console.log(`  ض.ق.م محصّلة:    ${fmt(postVATTotal.vat)} EGP`);
    console.log(`  خصم تحت الحساب:  ${fmt(postVATTotal.wht)} EGP`);
    console.log(`  الإجمالي:        ${fmt(postVATTotal.total)} EGP`);

    // ── Purchases Summary ──
    console.log('\n\n📦 فواتير المشتريات / PURCHASE INVOICES');
    console.log('─'.repeat(60));

    const preVATPurch = purchInv.filter(i => i.isBeforeVATRegistration);
    const postVATPurch = purchInv.filter(i => !i.isBeforeVATRegistration);

    const purchTotal = {
        sales: round2(purchInv.reduce((s, i) => s + i.totalSalesAmount, 0)),
        vat: round2(purchInv.reduce((s, i) => s + i.vatT1, 0)),
        wht: round2(purchInv.reduce((s, i) => s + i.whtT4, 0)),
        total: round2(purchInv.reduce((s, i) => s + i.totalAmount, 0))
    };

    console.log(`  إجمالي فواتير المشتريات: ${purchInv.length}`);
    console.log(`    ├── قبل التسجيل:  ${preVATPurch.length}`);
    console.log(`    └── بعد التسجيل:  ${postVATPurch.length}`);
    console.log(`  إجمالي المشتريات:  ${fmt(purchTotal.sales)} EGP`);
    console.log(`  ض.ق.م على المشتريات: ${fmt(purchTotal.vat)} EGP`);
    console.log(`  خصم تحت الحساب:    ${fmt(purchTotal.wht)} EGP`);

    // ── Monthly Breakdown Table ──
    console.log('\n\n📅 تفاصيل شهرية / MONTHLY BREAKDOWN');
    console.log('═'.repeat(130));
    console.log(
        'Month'.padEnd(10) + ' | ' +
        '#S'.padStart(3) + ' | ' +
        'Sales Amount'.padStart(14) + ' | ' +
        'Output VAT'.padStart(12) + ' | ' +
        '#P'.padStart(3) + ' | ' +
        'Purch Amount'.padStart(14) + ' | ' +
        'Input VAT'.padStart(12) + ' | ' +
        '#C'.padStart(3) + ' | ' +
        'Net VAT Due'.padStart(12) + ' | ' +
        'Status'
    );
    console.log('─'.repeat(130));

    let grandTotals = {
        salesCount: 0, salesAmount: 0, outputVAT: 0,
        purchCount: 0, purchAmount: 0, inputVAT: 0,
        creditCount: 0, netVAT: 0
    };

    for (const month of sortedMonths) {
        const m = months[month];
        const netVAT = round2(m.sales.vatT1 + m.creditNotes.vatT1 - m.purchases.vatT1);

        grandTotals.salesCount += m.sales.count;
        grandTotals.salesAmount += m.sales.totalSales;
        grandTotals.outputVAT += m.sales.vatT1 + m.creditNotes.vatT1;
        grandTotals.purchCount += m.purchases.count;
        grandTotals.purchAmount += m.purchases.totalSales;
        grandTotals.inputVAT += m.purchases.vatT1;
        grandTotals.creditCount += m.creditNotes.count;
        grandTotals.netVAT += netVAT;

        const status = netVAT > 0 ? '⬆ مستحق' : netVAT < 0 ? '⬇ رصيد' : '⚪ صفري';

        console.log(
            month.padEnd(10) + ' | ' +
            String(m.sales.count).padStart(3) + ' | ' +
            fmt(m.sales.totalSales).padStart(14) + ' | ' +
            fmt(m.sales.vatT1).padStart(12) + ' | ' +
            String(m.purchases.count).padStart(3) + ' | ' +
            fmt(m.purchases.totalSales).padStart(14) + ' | ' +
            fmt(m.purchases.vatT1).padStart(12) + ' | ' +
            String(m.creditNotes.count).padStart(3) + ' | ' +
            fmt(netVAT).padStart(12) + ' | ' +
            status
        );
    }

    console.log('─'.repeat(130));
    console.log(
        'TOTAL'.padEnd(10) + ' | ' +
        String(grandTotals.salesCount).padStart(3) + ' | ' +
        fmt(grandTotals.salesAmount).padStart(14) + ' | ' +
        fmt(grandTotals.outputVAT).padStart(12) + ' | ' +
        String(grandTotals.purchCount).padStart(3) + ' | ' +
        fmt(grandTotals.purchAmount).padStart(14) + ' | ' +
        fmt(grandTotals.inputVAT).padStart(12) + ' | ' +
        String(grandTotals.creditCount).padStart(3) + ' | ' +
        fmt(round2(grandTotals.netVAT)).padStart(12) + ' | '
    );


    // ── Annual Summary for Income Tax ──
    console.log('\n\n📆 ملخص سنوي / ANNUAL SUMMARY (for Income Tax)');
    console.log('═'.repeat(80));

    const years = [...new Set(invoices.map(i => i.year))].sort();
    for (const year of years) {
        const yearInv = invoices.filter(i => i.year === year);
        const ySales = yearInv.filter(i => i.direction === 'sales' && !i.isCreditNote);
        const yPurch = yearInv.filter(i => i.direction === 'purchases' && !i.isCreditNote);
        const yCredits = yearInv.filter(i => i.isCreditNote);

        const revenue = round2(ySales.reduce((s, i) => s + i.totalSalesAmount, 0));
        const cogs = round2(yPurch.reduce((s, i) => s + i.totalSalesAmount, 0));
        const creditAdj = round2(yCredits.reduce((s, i) => s + i.totalSalesAmount, 0));
        const grossProfit = round2(revenue + creditAdj - cogs);

        console.log(`\n  === ${year} ===`);
        console.log(`  إجمالي الإيرادات (صافي):  ${fmt(revenue)} EGP  (${ySales.length} فاتورة)`);
        console.log(`  إشعارات دائنة:            ${fmt(creditAdj)} EGP  (${yCredits.length} إشعار)`);
        console.log(`  تكلفة البضاعة المباعة:    ${fmt(cogs)} EGP  (${yPurch.length} فاتورة)`);
        console.log(`  مجمل الربح:               ${fmt(grossProfit)} EGP`);
        
        if (year === 2024) {
            console.log(`  ملاحظة: سنة جزئية — الشركة تأسست ١٦/١٠/٢٠٢٤`);
        }
    }

    // ── VAT Position Summary ──
    console.log('\n\n💰 الموقف الضريبي من القيمة المضافة / VAT POSITION SUMMARY');
    console.log('═'.repeat(80));

    const totalOutputVAT = round2(grandTotals.outputVAT);
    const totalInputVAT = round2(grandTotals.inputVAT);
    const netPosition = round2(totalOutputVAT - totalInputVAT);

    console.log(`  ض.ق.م مخرجات (output):   ${fmt(totalOutputVAT)} EGP`);
    console.log(`  ض.ق.م مدخلات (input):    ${fmt(totalInputVAT)} EGP`);
    console.log(`  صافي الموقف:              ${fmt(netPosition)} EGP`);
    console.log(`  الحالة:                   ${netPosition > 0 ? '⬆ مطلوب سداد للمصلحة' : '⬇ رصيد دائن لصالح الشركة'}`);

    // ── Key Risk Flags ──
    console.log('\n\n⚠️  إشارات المخاطر / RISK FLAGS');
    console.log('═'.repeat(80));

    if (preVATSales.length > 0) {
        console.log(`  🔴 ${preVATSales.length} فاتورة مبيعات تم تحصيل ض.ق.م ١٤% عليها قبل التسجيل`);
        console.log(`     إجمالي الضريبة المحصّلة: ${fmt(preVATTotal.vat)} EGP`);
        console.log(`     → يجب توريد هذا المبلغ للمصلحة`);
    }

    // Check if purchases > sales in any period
    const purchHeavyMonths = sortedMonths.filter(m => {
        const data = months[m];
        return data.purchases.totalSales > data.sales.totalSales && data.sales.totalSales > 0;
    });
    if (purchHeavyMonths.length > 0) {
        console.log(`\n  🟡 ${purchHeavyMonths.length} شهر المشتريات فيه أكبر من المبيعات:`);
        purchHeavyMonths.forEach(m => {
            const data = months[m];
            console.log(`     ${m}: مشتريات ${fmt(data.purchases.totalSales)} > مبيعات ${fmt(data.sales.totalSales)}`);
        });
        console.log(`     → طبيعي لشركة في بداية نشاطها (تجهيز مخزون)`);
    }

    // Consecutive zero months
    const zeroMonths = sortedMonths.filter(m => {
        const data = months[m];
        return data.sales.count === 0 && data.purchases.count === 0;
    });
    if (zeroMonths.length > 0) {
        console.log(`\n  🟡 ${zeroMonths.length} شهور بدون أي نشاط (إقرارات صفرية):`);
        console.log(`     ${zeroMonths.join(', ')}`);
    }

    // WHT Summary
    const totalWHT = round2(invoices.reduce((s, i) => s + Math.abs(i.whtT4), 0));
    if (totalWHT > 0) {
        console.log(`\n  📋 إجمالي خصم تحت الحساب (WHT): ${fmt(totalWHT)} EGP`);
        console.log(`     → يجب الاحتفاظ بشهادات الخصم من العملاء`);
    }

    return {
        grandTotals: {
            ...grandTotals,
            salesAmount: round2(grandTotals.salesAmount),
            outputVAT: round2(grandTotals.outputVAT),
            purchAmount: round2(grandTotals.purchAmount),
            inputVAT: round2(grandTotals.inputVAT),
            netVAT: round2(grandTotals.netVAT)
        },
        preVATTotal,
        postVATTotal,
        purchTotal,
        totalWHT
    };
}

// ── Save JSON Report ──────────────────────────────────────────────

function saveReport(invoices, months, summary) {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const sortedMonths = Object.keys(months).sort();

    const report = {
        generatedAt: new Date().toISOString(),
        company: {
            name: 'لابك لتجارة الإلكترونيات',
            nameEn: 'Laapak Electronics Trading',
            taxId: COMPANY_ID,
            established: '2024-10-16',
            vatRegistration: '2025-03-03'
        },

        overallSummary: {
            totalInvoiceFiles: invoices.length,
            salesInvoices: invoices.filter(i => i.direction === 'sales' && !i.isCreditNote).length,
            purchaseInvoices: invoices.filter(i => i.direction === 'purchases' && !i.isCreditNote).length,
            creditNotes: invoices.filter(i => i.isCreditNote).length,
            preVATRegSales: invoices.filter(i => i.direction === 'sales' && !i.isCreditNote && i.isBeforeVATRegistration).length,
            postVATRegSales: invoices.filter(i => i.direction === 'sales' && !i.isCreditNote && !i.isBeforeVATRegistration).length,
        },

        vatPosition: {
            totalOutputVAT: summary.grandTotals.outputVAT,
            totalInputVAT: summary.grandTotals.inputVAT,
            netVATDue: summary.grandTotals.netVAT,
            status: summary.grandTotals.netVAT > 0 ? 'Payable' : 'Refundable'
        },

        preVATRegistration: {
            salesCount: invoices.filter(i => i.direction === 'sales' && !i.isCreditNote && i.isBeforeVATRegistration).length,
            totalSales: summary.preVATTotal.sales,
            vatCollected: summary.preVATTotal.vat,
            whtDeducted: summary.preVATTotal.wht,
            totalAmount: summary.preVATTotal.total
        },

        postVATRegistration: {
            salesCount: invoices.filter(i => i.direction === 'sales' && !i.isCreditNote && !i.isBeforeVATRegistration).length,
            totalSales: summary.postVATTotal.sales,
            vatCollected: summary.postVATTotal.vat,
            whtDeducted: summary.postVATTotal.wht,
            totalAmount: summary.postVATTotal.total
        },

        totalWHT: summary.totalWHT,

        monthlyBreakdown: sortedMonths.map(month => {
            const m = months[month];
            const netVAT = round2(m.sales.vatT1 + m.creditNotes.vatT1 - m.purchases.vatT1);
            return {
                month,
                sales: {
                    count: m.sales.count,
                    totalSales: m.sales.totalSales,
                    vatT1: m.sales.vatT1,
                    whtT4: m.sales.whtT4,
                    totalAmount: m.sales.totalAmount
                },
                purchases: {
                    count: m.purchases.count,
                    totalSales: m.purchases.totalSales,
                    vatT1: m.purchases.vatT1,
                    whtT4: m.purchases.whtT4,
                    totalAmount: m.purchases.totalAmount
                },
                creditNotes: {
                    count: m.creditNotes.count,
                    totalSales: m.creditNotes.totalSales,
                    vatT1: m.creditNotes.vatT1
                },
                netVATDue: netVAT,
                vatStatus: netVAT > 0 ? 'Payable' : netVAT < 0 ? 'Credit' : 'Zero'
            };
        }),

        // Full invoice list for accountant reference
        invoiceList: invoices.map(i => ({
            internalId: i.internalId,
            date: i.date,
            direction: i.direction,
            type: i.documentType,
            counterparty: i.direction === 'sales' ? i.receiverName : i.issuerName,
            totalSales: i.totalSalesAmount,
            vatT1: i.vatT1,
            whtT4: i.whtT4,
            totalAmount: i.totalAmount,
            preVATReg: i.isBeforeVATRegistration
        }))
    };

    const reportPath = path.join(OUTPUT_DIR, 'deep_analysis_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`\n\n✅ Report saved: ${reportPath}`);

    return report;
}

// ── Main ──────────────────────────────────────────────────────────

function main() {
    console.log('Loading invoices from:', INVOICES_DIR);
    const invoices = loadAllInvoices();
    console.log(`\nLoaded ${invoices.length} invoices successfully.`);

    const months = aggregateByMonth(invoices);
    const summary = printReport(invoices, months);
    saveReport(invoices, months, summary);
}

main();
