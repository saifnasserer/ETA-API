const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// Configuration
const COMPANY_TAX_ID = '767043545'; // Labak Electronics

// SAP Excel Headers (Arabic - Matching ETA Template)
const HEADERS = [
    'نوع المستند *',
    'نوع الضريبة *',
    'نوع سلع الجدول *',
    'رقم الفاتورة *',
    'اسم العميل *',
    'رقم التسجيل الضريبي للعميل *',
    'رقم الملف الضريبي للعميل',
    'العنوان *',
    'الرقم القومي / رقم جواز السفر',
    'رقم الموبيل',
    'تاريخ الفاتورة *',
    'إسم المنتج *',
    'كود المنتج',
    'نوع البيان *',
    'نوع السلعة *',
    'وحدة قياس المنتج',
    'سعر الوحدة *',
    'فئة الضريبة *',
    'كمية المنتج *',
    'المبلغ الإجمالي *',
    'قيمة الخصم',
    'المبلغ الصافي *',
    'قيمة الضريبة *',
    'الإجمالي *'
];

function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        return d.toISOString().split('T')[0];
    } catch {
        return dateStr;
    }
}

function getSafeString(val) {
    if (val === null || val === undefined) return '';
    return String(val).trim();
}

function getDocType(type) {
    // Mapping: Invoice(i)=1, Credit(c)=2, Debit(d)=3
    const t = type.toLowerCase();
    if (t === 'i') return '1';
    if (t === 'c') return '2';
    if (t === 'd') return '3';
    return '1';
}

function getCommodityType(itemType) {
    // EGS/GS1 usually starts with EG-. 
    // Assumption: Default to 1 (Goods) unless we have mapping logic.
    return '1';
}

function getStatementType(receiverAddress) {
    // 1=Local, 2=Export. Check Country.
    if (!receiverAddress || !receiverAddress.country) return '1';
    return receiverAddress.country === 'EG' ? '1' : '2';
}

function generateSapExcel(invoices) {
    const salesRows = [];
    const purchaseRows = [];

    invoices.forEach(fullInv => {
        try {
            // Parse internal document structure
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

            // Fallback to root fields if doc parse failed or fields missing
            const rootIssuerId = fullInv.issuerId || fullInv.issuer?.id;

            // Determine if Sales or Purchase
            // Use root ID for reliability, or doc ID
            const isSale = (rootIssuerId === COMPANY_TAX_ID) || (doc.issuer?.id === COMPANY_TAX_ID);

            // Basic Info
            const internalId = fullInv.internalID || fullInv.internalId || doc.internalID;
            const date = formatDate(fullInv.dateTimeIssued || doc.dateTimeIssued);
            const docType = getDocType(fullInv.documentType || fullInv.typeName || doc.documentType || 'i');

            // Partner Info (The "Other" party)
            const partner = isSale ? (doc.receiver || {}) : (doc.issuer || {});

            // Fallback names from root if missing in doc
            const partnerName = partner.name || (isSale ? fullInv.receiverName : fullInv.issuerName) || '';
            const partnerTaxId = partner.id || (isSale ? fullInv.receiverId : fullInv.issuerId) || '';
            const partnerAddrObj = partner.address || {};
            const partnerAddress = [
                partnerAddrObj.street,
                partnerAddrObj.regionCity,
                partnerAddrObj.governate
            ].filter(Boolean).join(', ') || '';

            const statType = isSale ? getStatementType(partner.address) : '1';

            // Lines
            // Prefer doc.invoiceLines (has details), fallback to fullInv.invoiceLines
            const lines = doc.invoiceLines || fullInv.invoiceLines || [];

            lines.forEach(line => {
                const taxAmount = (line.taxableItems || []).reduce((sum, tax) => sum + (tax.amount || 0), 0);
                const isServices = (line.description || '').toLowerCase().includes('service') ||
                    (line.description || '').toLowerCase().includes('installation');

                const row = {
                    'نوع المستند *': docType,
                    'نوع الضريبة *': '1',
                    'نوع سلع الجدول *': '1',
                    'رقم الفاتورة *': internalId,
                    'اسم العميل *': partnerName,
                    'رقم التسجيل الضريبي للعميل *': getSafeString(partnerTaxId).length >= 9 ? partnerTaxId : '',
                    'رقم الملف الضريبي للعميل': '',
                    'العنوان *': partnerAddress,
                    'الرقم القومي / رقم جواز السفر': getSafeString(partnerTaxId).length > 9 ? partnerTaxId : '',
                    'رقم الموبيل': '',
                    'تاريخ الفاتورة *': date,
                    'إسم المنتج *': line.description,
                    'كود المنتج': line.itemCode,
                    'نوع البيان *': isServices ? '4' : '3',  // 3=سلعة (Goods), 4=خدمة (Service)
                    'نوع السلعة *': statType,  // 1=Local, 2=Export
                    'وحدة قياس المنتج': line.unitType || 'EA',
                    'سعر الوحدة *': line.unitValue?.amountEGP || 0,
                    'فئة الضريبة *': '1',
                    'كمية المنتج *': line.quantity || 0,
                    'المبلغ الإجمالي *': line.salesTotal || 0,
                    'قيمة الخصم': line.discount?.amount || 0,
                    'المبلغ الصافي *': line.netTotal || 0,
                    'قيمة الضريبة *': taxAmount,
                    'الإجمالي *': line.total || 0
                };

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

    // Create Workbooks
    const outputDir = path.join(__dirname, '../output/excel_uploads_eta');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const salesPath = path.join(outputDir, 'Sales_SAP.xlsx');
    const purchasesPath = path.join(outputDir, 'Purchases_SAP.xlsx');

    const salesWs = xlsx.utils.json_to_sheet(salesRows, { header: HEADERS });
    // Set RTL for Arabic
    salesWs['!views'] = [{ RTL: true }];
    const salesWb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(salesWb, salesWs, "Sales");
    xlsx.writeFile(salesWb, salesPath);

    const purchWs = xlsx.utils.json_to_sheet(purchaseRows, { header: HEADERS });
    // Set RTL for Arabic
    purchWs['!views'] = [{ RTL: true }];
    const purchWb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(purchWb, purchWs, "Purchases");
    xlsx.writeFile(purchWb, purchasesPath);

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
