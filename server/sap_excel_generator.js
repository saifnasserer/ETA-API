const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// Configuration
const COMPANY_TAX_ID = '767043545'; // Labak Electronics

const SALES_TEMPLATE = path.join(__dirname, '../sales-doc_0.xlsx');
const PURCHASES_TEMPLATE = path.join(__dirname, '../مستندات المشتريات_0.xlsx');

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

function getDocType(type) {
    const t = type.toLowerCase();
    if (t === 'i') return '1';
    if (t === 'c') return '2';
    if (t === 'd') return '3';
    return '1';
}

function getStatementType(receiverAddress, isSale) {
    if (!receiverAddress || !receiverAddress.country) return '1';
    return receiverAddress.country === 'EG' ? '1' : '2';
}

function generateSapExcel(invoices, periodSuffix = '', outputDirOverride = null) {
    const salesRows = [];
    const purchaseRows = [];

    invoices.forEach(fullInv => {
        try {
            let doc = {};
            if (typeof fullInv.document === 'string') {
                try {
                    doc = JSON.parse(fullInv.document);
                } catch (e) {
                    console.warn(`Failed to parse document JSON for ${fullInv.internalId}`);
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

            const isServices = (fullInv.invoiceLines || []).some(l => (l.description || '').toLowerCase().includes('service'));

            const lines = doc.invoiceLines || fullInv.invoiceLines || [];

            lines.forEach(line => {
                const taxAmount = (line.taxableItems || []).reduce((sum, tax) => sum + (tax.amount || 0), 0);
                const isServicesLine = (line.description || '').toLowerCase().includes('service') ||
                    (line.description || '').toLowerCase().includes('installation');

                const row = [
                    '1', // نوع المستند
                    '1', // نوع الضريبة
                    '0', // نوع سلع الجدول
                    internalId,
                    partnerName,
                    getSafeString(partnerTaxId).length >= 9 ? partnerTaxId : '',
                    '', // File No
                    partnerAddress,
                    getSafeString(partnerTaxId).length > 9 ? partnerTaxId : '',
                    '', // Mobile
                    date,
                    line.description,
                    line.itemCode,
                    '1', // نوع البيان (Strictly 1 as per user request)
                    '1', // نوع السلعة
                    line.unitType || 'EA',
                    line.unitValue?.amountEGP || 0,
                    '14', // فئة الضريبة
                    line.quantity || 0,
                    line.salesTotal || 0,
                    line.discount?.amount || 0,
                    line.netTotal || 0,
                    taxAmount,
                    line.total || 0
                ];

                if (isSale) {
                    salesRows.push(row);
                } else {
                    purchaseRows.push(row);
                }
            });

        } catch (e) {
            console.error(`Error processing invoice ${fullInv.uuid}: ${e.message}`);
        }
    });

    const outputDir = outputDirOverride || path.join(__dirname, '../output/excel_uploads_eta');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const suffix = (periodSuffix && !outputDirOverride) ? `_${periodSuffix}` : '';
    const salesPath = path.join(outputDir, `sales-doc${suffix}.xlsx`);
    const purchasesPath = path.join(outputDir, `مستندات المشتريات${suffix}.xlsx`);

    // Helper to generate file from template
    const createFromTemplate = (templatePath, outputPath, rows) => {
        if (!fs.existsSync(templatePath)) {
            console.warn(`Template not found: ${templatePath}. Creating new from scratch.`);
            // Fallback (Arabic headers only for brevity)
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
        // sheet_add_aoa automatically handles the offset
        xlsx.utils.sheet_add_aoa(ws, rows, { origin: "A3" });

        xlsx.writeFile(wb, outputPath);
    };

    createFromTemplate(SALES_TEMPLATE, salesPath, salesRows);
    createFromTemplate(PURCHASES_TEMPLATE, purchasesPath, purchaseRows);

    return {
        sales: salesPath,
        purchases: purchasesPath,
        counts: {
            sales: salesRows.length,
            purchases: purchaseRows.length
        }
    };
}

module.exports = { generateSapExcel };
