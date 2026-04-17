const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// Configuration
const COMPANY_TAX_ID = '767043545'; // Labak Electronics
const VAT_REGISTRATION_DATE = new Date('2025-03-03');

const SALES_TEMPLATE = path.join(__dirname, '../sales-doc_0.xlsx');
const PURCHASES_TEMPLATE = path.join(__dirname, '../مستندات المشتريات_0.xlsx');
const INVOICES_DIR = path.join(__dirname, '../invoices_full');

function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        const day = String(d.getUTCDate()).padStart(2, '0');
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const year = d.getUTCFullYear();
        return `${day}.${month}.${year}`;
    } catch {
        return dateStr;
    }
}

function getSafeString(val) {
    if (val === null || val === undefined) return '';
    return String(val).trim();
}

/**
 * Convert an invoice to Excel rows
 * @param {Object} fullInv - Raw invoice object from invoices_full
 * @param {boolean} isAdjustment - If true, mark as إشعار إضافة (DOC_TYP=3, STAT_TYPE=5)
 * @returns {{ salesRows: Array[], purchaseRows: Array[] }}
 */
function invoiceToRows(fullInv, isAdjustment = false) {
    const salesRows = [];
    const purchaseRows = [];

    let doc = {};
    if (typeof fullInv.document === 'string') {
        try {
            doc = JSON.parse(fullInv.document);
        } catch (e) {
            console.warn(`Failed to parse document JSON for ${fullInv.internalId}`);
            return { salesRows, purchaseRows };
        }
    } else {
        doc = fullInv.document || {};
    }

    const rootIssuerId = fullInv.issuerId || fullInv.issuer?.id;
    const isSale = (rootIssuerId === COMPANY_TAX_ID) || (doc.issuer?.id === COMPANY_TAX_ID);

    const internalId = fullInv.internalID || fullInv.internalId || doc.internalID;
    const date = formatDate(fullInv.dateTimeIssued || doc.dateTimeIssued);
    const partner = isSale ? (doc.receiver || {}) : (doc.issuer || {});
    const partnerName = partner.name || (isSale ? fullInv.receiverName : fullInv.issuerName) || '';
    const partnerTaxId = partner.id || (isSale ? fullInv.receiverId : fullInv.issuerId) || '';
    const partnerAddrObj = partner.address || {};
    const partnerAddress = [
        partnerAddrObj.street,
        partnerAddrObj.regionCity,
        partnerAddrObj.governate
    ].filter(Boolean).join(', ') || '';

    // Determine document type
    const originalDocType = (doc.documentType || 'i').toLowerCase();
    let docTypeCode;
    if (isAdjustment) {
        // التسويات دايماً إشعار إضافة (Debit Note)
        docTypeCode = '3';
    } else {
        if (originalDocType === 'i') docTypeCode = '1';      // فاتورة
        else if (originalDocType === 'c') docTypeCode = '2';  // إشعار خصم (Credit Note)
        else if (originalDocType === 'd') docTypeCode = '3';  // إشعار إضافة (Debit Note)
        else docTypeCode = '1';
    }

    // Determine statement type
    let statType;
    if (isAdjustment) {
        statType = '5'; // تسويات
    } else {
        statType = isSale ? '3' : '1'; // 3 = مبيعات عادية, 1 = مشتريات عادية
    }

    const lines = doc.invoiceLines || fullInv.invoiceLines || [];

    lines.forEach(line => {
        // Get only T1 (VAT) tax amount, ignore T4 (WHT)
        const vatAmount = (line.taxableItems || [])
            .filter(tax => tax.taxType === 'T1')
            .reduce((sum, tax) => sum + (tax.amount || 0), 0);

        const row = [
            docTypeCode,                                          // A: نوع المستند (3=إشعار إضافة for adjustments)
            '1',                                                  // B: نوع الضريبة (1=ض.ق.م)
            '0',                                                  // C: نوع سلع الجدول
            internalId,                                           // D: رقم الفاتورة
            partnerName,                                          // E: اسم العميل/المورد
            getSafeString(partnerTaxId).length >= 9 ? partnerTaxId : '',  // F: رقم التسجيل الضريبي
            '',                                                   // G: رقم الملف الضريبي
            partnerAddress,                                       // H: العنوان
            getSafeString(partnerTaxId).length > 9 ? partnerTaxId : '',   // I: الرقم القومي
            '',                                                   // J: رقم الموبيل
            date,                                                 // K: تاريخ المستند
            line.description,                                     // L: اسم المنتج
            line.itemCode,                                        // M: كود المنتج
            statType,                                             // N: نوع البيان (5=تسويات for adjustments)
            isSale ? '1' : '3',                                   // O: نوع السلعة (1=سلع, 3=مشتريات)
            line.unitType || 'EA',                                // P: وحدة القياس
            line.unitValue?.amountEGP || 0,                       // Q: سعر الوحدة
            '14',                                                 // R: فئة الضريبة
            line.quantity || 0,                                   // S: الكمية
            line.salesTotal || 0,                                 // T: المبلغ الإجمالي
            line.discount?.amount || 0,                           // U: قيمة الخصم (Trade Discount)
            line.netTotal || 0,                                   // V: المبلغ الصافي
            vatAmount,                                            // W: قيمة الضريبة (T1 VAT only)
            line.total || 0                                       // X: الإجمالي
        ];

        if (isSale) {
            salesRows.push(row);
        } else {
            purchaseRows.push(row);
        }
    });

    return { salesRows, purchaseRows };
}

/**
 * Load all invoice JSON files from invoices_full directory
 */
function loadAllInvoices() {
    const files = fs.readdirSync(INVOICES_DIR).filter(f => f.endsWith('.json'));
    return files.map(file => {
        const raw = JSON.parse(fs.readFileSync(path.join(INVOICES_DIR, file), 'utf8'));
        return raw;
    });
}

/**
 * Filter invoices by month (YYYY-MM) and optionally by date range
 */
function filterInvoices(invoices, { month, beforeDate, excludeCreditNotes = true }) {
    return invoices.filter(inv => {
        const dateStr = inv.dateTimeIssued;
        if (!dateStr) return false;

        const date = new Date(dateStr);

        // Exclude credit notes from adjustments (they're handled separately)
        if (excludeCreditNotes) {
            let doc = {};
            try { doc = typeof inv.document === 'string' ? JSON.parse(inv.document) : (inv.document || {}); } catch(e) {}
            if ((doc.documentType || '').toLowerCase() === 'c') return false;
        }

        if (month) {
            const invMonth = dateStr.substring(0, 7);
            return invMonth === month;
        }

        if (beforeDate) {
            return date < beforeDate;
        }

        return true;
    });
}

/**
 * Generate SAP Excel files
 * @param {Array} regularInvoices - Regular period invoices
 * @param {Array} adjustmentInvoices - Pre-registration adjustment invoices (إشعارات إضافة)
 * @param {string} periodSuffix - Suffix for output filenames
 * @param {string} outputDirOverride - Custom output directory
 */
function generateSapExcel(regularInvoices, adjustmentInvoices = [], periodSuffix = '', outputDirOverride = null) {
    const allSalesRows = [];
    const allPurchaseRows = [];

    // Process regular invoices
    console.log(`\n📄 Processing ${regularInvoices.length} regular invoices...`);
    regularInvoices.forEach(inv => {
        try {
            const { salesRows, purchaseRows } = invoiceToRows(inv, false);
            allSalesRows.push(...salesRows);
            allPurchaseRows.push(...purchaseRows);
        } catch (e) {
            console.error(`Error processing regular invoice ${inv.internalId || inv.uuid}: ${e.message}`);
        }
    });

    // Process adjustment invoices (إشعارات إضافة - تسويات)
    if (adjustmentInvoices.length > 0) {
        console.log(`\n📋 Processing ${adjustmentInvoices.length} adjustment invoices (إشعارات إضافة - تسويات)...`);
        adjustmentInvoices.forEach(inv => {
            try {
                const { salesRows, purchaseRows } = invoiceToRows(inv, true);
                allSalesRows.push(...salesRows);
                allPurchaseRows.push(...purchaseRows);
            } catch (e) {
                console.error(`Error processing adjustment invoice ${inv.internalId || inv.uuid}: ${e.message}`);
            }
        });
    }

    const outputDir = outputDirOverride || path.join(__dirname, '../output/excel_uploads_eta');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const suffix = periodSuffix ? `_${periodSuffix}` : '';
    const salesPath = path.join(outputDir, `sales-doc${suffix}.xlsx`);
    const purchasesPath = path.join(outputDir, `مستندات المشتريات${suffix}.xlsx`);

    // Helper to generate file from template
    const createFromTemplate = (templatePath, outputPath, rows) => {
        if (!fs.existsSync(templatePath)) {
            console.warn(`Template not found: ${templatePath}. Creating new from scratch.`);
            const ws = xlsx.utils.aoa_to_sheet(rows);
            const wb = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(wb, ws, "Data");
            xlsx.writeFile(wb, outputPath);
            return;
        }

        const wb = xlsx.readFile(templatePath);
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];

        // Add data starting at row 3 (A3)
        xlsx.utils.sheet_add_aoa(ws, rows, { origin: "A3" });

        xlsx.writeFile(wb, outputPath);
    };

    createFromTemplate(SALES_TEMPLATE, salesPath, allSalesRows);
    createFromTemplate(PURCHASES_TEMPLATE, purchasesPath, allPurchaseRows);

    console.log(`\n✅ Generated:`);
    console.log(`   📊 Sales: ${salesPath} (${allSalesRows.length} rows)`);
    console.log(`   📊 Purchases: ${purchasesPath} (${allPurchaseRows.length} rows)`);

    return {
        sales: salesPath,
        purchases: purchasesPath,
        counts: {
            sales: allSalesRows.length,
            purchases: allPurchaseRows.length
        }
    };
}

/**
 * Generate March 2025 files with pre-registration adjustments
 */
function generateMarch2025() {
    console.log('=== 🗓️  إنشاء ملفات مارس 2025 (مع تسويات ما قبل التسجيل) ===\n');

    const allInvoices = loadAllInvoices();
    console.log(`📂 Loaded ${allInvoices.length} total invoices`);

    // March 2025 regular invoices
    const marchInvoices = filterInvoices(allInvoices, { month: '2025-03' });
    console.log(`\n📅 March 2025 regular invoices: ${marchInvoices.length}`);

    // Classify March invoices
    const marchSales = marchInvoices.filter(inv => inv.issuerId === COMPANY_TAX_ID);
    const marchPurchases = marchInvoices.filter(inv => inv.receiverId === COMPANY_TAX_ID);
    console.log(`   Sales: ${marchSales.length} | Purchases: ${marchPurchases.length}`);

    // Pre-registration invoices (before 3/3/2025) — these become adjustments
    const preRegInvoices = filterInvoices(allInvoices, { beforeDate: VAT_REGISTRATION_DATE });
    console.log(`\n📋 Pre-registration invoices (before 03/03/2025): ${preRegInvoices.length}`);

    const preRegSales = preRegInvoices.filter(inv => inv.issuerId === COMPANY_TAX_ID);
    const preRegPurchases = preRegInvoices.filter(inv => inv.receiverId === COMPANY_TAX_ID);
    console.log(`   Adjustment Sales (إشعار إضافة): ${preRegSales.length}`);
    console.log(`   Adjustment Purchases (إشعار إضافة): ${preRegPurchases.length}`);

    // Print details of adjustment invoices
    console.log('\n--- تفاصيل تسويات المبيعات ---');
    let totalAdjSalesVAT = 0;
    preRegSales.forEach(inv => {
        const doc = typeof inv.document === 'string' ? JSON.parse(inv.document) : inv.document;
        const vat = (doc.taxTotals || []).filter(t => t.taxType === 'T1').reduce((s, t) => s + t.amount, 0);
        totalAdjSalesVAT += vat;
        console.log(`   ${inv.internalId} | ${inv.dateTimeIssued?.substring(0,10)} | ${inv.receiverName?.substring(0,25)} | VAT: ${vat.toFixed(2)}`);
    });
    console.log(`   إجمالي ض.ق.م تسويات المبيعات: ${totalAdjSalesVAT.toFixed(2)} EGP`);

    console.log('\n--- تفاصيل تسويات المشتريات ---');
    let totalAdjPurchVAT = 0;
    preRegPurchases.forEach(inv => {
        const doc = typeof inv.document === 'string' ? JSON.parse(inv.document) : inv.document;
        const vat = (doc.taxTotals || []).filter(t => t.taxType === 'T1').reduce((s, t) => s + t.amount, 0);
        totalAdjPurchVAT += vat;
        console.log(`   ${inv.internalId} | ${inv.dateTimeIssued?.substring(0,10)} | ${inv.issuerName?.substring(0,25)} | VAT: ${vat.toFixed(2)}`);
    });
    console.log(`   إجمالي ض.ق.م تسويات المشتريات: ${totalAdjPurchVAT.toFixed(2)} EGP`);

    // Generate Excel files
    const outputDir = path.join(__dirname, '../output/march_2025_with_adjustments');
    const result = generateSapExcel(
        marchInvoices,
        preRegInvoices,
        '2025-03',
        outputDir
    );

    console.log('\n=== ✅ تم إنشاء ملفات مارس 2025 بنجاح ===');
    console.log(`\n📊 ملخص نموذج 10 لشهر مارس 2025:`);
    console.log(`   ض.ق.م المبيعات العادية + تسويات المبيعات = إجمالي مخرجات`);
    console.log(`   ض.ق.م المشتريات العادية + تسويات المشتريات = إجمالي مدخلات`);
    console.log(`   تسويات المبيعات (${preRegSales.length} فاتورة): +${totalAdjSalesVAT.toFixed(2)} EGP`);
    console.log(`   تسويات المشتريات (${preRegPurchases.length} فاتورة): +${totalAdjPurchVAT.toFixed(2)} EGP`);

    return result;
}

// CLI execution
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args[0] === 'march2025' || args.length === 0) {
        generateMarch2025();
    } else {
        console.log('Usage: node sap_excel_generator.js [march2025]');
    }
}

module.exports = { generateSapExcel, generateMarch2025, loadAllInvoices, filterInvoices, invoiceToRows };
